import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { pocketbase } from '../pocketbase'
import type {
  ObjectsResponse,
  DiagnosticsResponse,
  PipelinesResponse,
} from '../api_types'

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

const SYSTEM_INSTRUCTION = `Ты - опытный инженер по обслуживанию трубопроводов и промышленного оборудования. На основе предоставленных данных диагностики объекта, тебе необходимо сгенерировать план действий.

ВАЖНО: Отвечай ТОЛЬКО на русском языке!

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "problem_description": "<Подробное описание выявленной проблемы на основе диагностических данных. 2-3 предложения>",
  "suggested_actions": "<Конкретные пошаговые действия для решения проблемы. Пронумерованный список из 3-5 пунктов>",
  "expected_result": "<Ожидаемый результат после выполнения действий. 1-2 предложения>"
}

GUIDELINES:
- Анализируй метод диагностики и его параметры
- Учитывай статус здоровья объекта (health_status) и оценку срочности (urgency_score)
- Для CRITICAL статуса - действия должны быть немедленными
- Для WARNING - планирование и мониторинг
- Для OK - профилактика и поддержание

PARAMETER CONTEXT:
- VIBRO: param1 = виброскорость (мм/с), param2 = ускорение (м/с²), param3 = частота/температура
- MFL/UTWM: param1 = глубина коррозии (мм), param2 = остаток стенки (мм), param3 = длина дефекта (мм)
- VIK: param1 = длина (мм), param2 = ширина (мм), param3 = глубина (мм)`

export interface ActionPlanRequest {
  diagnostic_id: string
}

export interface ActionPlanResult {
  problem_description: string
  suggested_actions: string
  expected_result: string
}

export interface ActionPlanResponse {
  success: boolean
  result?: ActionPlanResult
  object_data?: {
    name: string
    type: string
    pipeline_name: string
    health_status: string
    urgency_score: number
  }
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ActionPlanRequest = await request.json()
    const { diagnostic_id } = body

    if (!diagnostic_id) {
      return NextResponse.json(
        { success: false, error: 'diagnostic_id is required' },
        { status: 400 }
      )
    }

    const pb = await pocketbase()

    // Fetch the diagnostic with expanded object and pipeline
    let diagnostic: DiagnosticsResponse<{
      object: ObjectsResponse<{ pipeline: PipelinesResponse }>
    }>
    try {
      diagnostic = await pb.collection('diagnostics').getOne(diagnostic_id, {
        expand: 'object.pipeline',
      })
    } catch {
      return NextResponse.json(
        { success: false, error: 'Diagnostic not found' },
        { status: 404 }
      )
    }

    const object = diagnostic.expand?.object
    const pipeline = object?.expand?.pipeline

    if (!object) {
      return NextResponse.json(
        { success: false, error: 'Object not found for this diagnostic' },
        { status: 404 }
      )
    }

    // Prepare data for AI analysis
    const analysisData = {
      object: {
        id: object.id,
        name: object.name,
        type: object.type,
        material: object.material,
        year: object.year,
        health_status: object.health_status,
        urgency_score: object.urgency_score,
        ai_summary: object.ai_summary,
        recommended_action: object.recommended_action,
      },
      pipeline: {
        name: pipeline?.name || 'Неизвестный трубопровод',
      },
      diagnostic: {
        date: diagnostic.date,
        method: diagnostic.method,
        defect_found: diagnostic.defect_found,
        defect_description: diagnostic.defect_description,
        quality_grade: diagnostic.quality_grade,
        ml_label: diagnostic.ml_label,
        param1: diagnostic.param1,
        param2: diagnostic.param2,
        param3: diagnostic.param3,
        temperature: diagnostic.temperature,
        humidity: diagnostic.humidity,
        illumination: diagnostic.illumination,
      },
    }

    // Call Gemini for action plan generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `На основе данных диагностики сгенерируй план действий:\n\n${JSON.stringify(
                analysisData,
                null,
                2
              )}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.5,
        maxOutputTokens: 2048,
      },
    })

    // Parse AI response
    const aiText = response.text
    if (!aiText) {
      throw new Error('Empty response from AI')
    }

    let actionPlan: ActionPlanResult
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedText = aiText.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7)
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3)
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3)
      }
      cleanedText = cleanedText.trim()

      actionPlan = JSON.parse(cleanedText)

      // Validate the response structure
      if (
        !actionPlan.problem_description ||
        !actionPlan.suggested_actions ||
        !actionPlan.expected_result
      ) {
        throw new Error('Invalid response structure')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiText, parseError)
      throw new Error('Failed to parse AI response')
    }

    const objectTypeLabels: Record<string, string> = {
      crane: 'Кран',
      compressor: 'Компрессор',
      pipeline_section: 'Участок трубопровода',
    }

    return NextResponse.json({
      success: true,
      result: actionPlan,
      object_data: {
        name: object.name || 'Объект без имени',
        type:
          objectTypeLabels[object.type || ''] ||
          object.type ||
          'Неизвестный тип',
        pipeline_name: pipeline?.name || 'Неизвестный трубопровод',
        health_status: object.health_status || 'UNKNOWN',
        urgency_score: object.urgency_score ?? 0,
      },
    } as ActionPlanResponse)
  } catch (error) {
    console.error('Action plan generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
