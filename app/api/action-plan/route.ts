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

const SYSTEM_INSTRUCTION = `
РОЛЬ: Ты — Старший руководитель полевых операций (Senior Field Operations Manager) в нефтегазовой отрасли.
ЗАДАЧА: Сформировать четкий, профессиональный "Field Brief" (Полевое задание) для ремонтной бригады на основе данных диагностики.

ВХОДНЫЕ ДАННЫЕ:
Ты получишь JSON с данными об объекте (тип, материал) и результатами диагностики (метод, параметры, статус).

КОНТЕКСТ ПАРАМЕТРОВ (Интерпретация):
1. Метод VIBRO (Для компрессоров/насосов):
   - param1: Виброскорость (мм/с). Норма < 4.5. > 7.1 — КРИТИЧНО (Износ подшипников/расцентровка).
   - param2: Ускорение.
2. Метод MFL/UTWM (Для труб):
   - param1: Глубина коррозии (мм). Сравни с толщиной стенки.
   - param2: Остаточная стенка (мм).
   - param3: Длина дефекта (мм).
3. Метод VIK (Визуальный):
   - Геометрия дефекта (Длина/Ширина/Глубина). Трещины, вмятины, задиры.

ТРЕБОВАНИЯ К ОТВЕТУ:
Отвечай ТОЛЬКО валидным JSON объектом. Никакого маркдауна вокруг JSON.
Язык: Профессиональный технический Русский.

СТРУКТУРА JSON:
{
  "problem_summary": "Техническое заключение. 1 предложение. Пример: 'Критический питтинг коррозии глубиной 6мм (80% стенки) на участке сварного шва.'",
  "action_plan": [
    "Список конкретных шагов в повелительном наклонении.",
    "Пример: 1. Обесточить агрегат и повесить замок LOTO.",
    "Пример: 2. Провести зачистку поверхности до металлического блеска.",
    "Пример: 3. Подтвердить глубину дефекта ручным УЗК."
  ],
  "required_resources": "Список инструментов и материалов через запятую. Пример: 'Толщиномер, УШМ, комплект электродов МР-3, краска.'",
  "safety_requirements": "Краткие меры безопасности. Пример: 'Работы на высоте, Газоанализатор обязателен.'",
  "expected_outcome": "Что должно получиться. Пример: 'Восстановление герметичности, снижение класса риска до Low.'"
}

ЛОГИКА ПРИНЯТИЯ РЕШЕНИЙ:
- Если статус CRITICAL + Труба: Требуй немедленной остановки перекачки или снижения давления, ограждения зоны и подготовки к вырезке катушки/установке муфты.
- Если статус WARNING + Труба: Требуй повторного контроля (ДД - Дополнительная Дефектоскопия) для подтверждения данных сканера.
- Если VIBRO > 11 мм/с: Требуй остановки агрегата и проверки центровки валов.
- Используй жирный шрифт (markdown **) внутри строк для выделения цифр и критических действий.
`;

export interface ActionPlanRequest {
  diagnostic_id: string
}

export interface ActionPlanResult {
  problem_summary: string
  action_plan: string[]
  required_resources: string
  safety_requirements: string
  expected_outcome: string
}

export interface ActionPlanResponse {
  success: boolean
  result?: ActionPlanResult
  object_data?: {
    id: string
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
      const hasValidActions =
        Array.isArray(actionPlan.action_plan) &&
        actionPlan.action_plan.length > 0 &&
        actionPlan.action_plan.every((item) => typeof item === 'string')

      if (
        !actionPlan.problem_summary ||
        !hasValidActions ||
        !actionPlan.required_resources ||
        !actionPlan.safety_requirements ||
        !actionPlan.expected_outcome
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
        id: object.id,
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
