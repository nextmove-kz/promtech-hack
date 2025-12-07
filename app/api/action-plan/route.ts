import { GoogleGenAI } from '@google/genai';
import { type NextRequest, NextResponse } from 'next/server';
import { OBJECT_TYPE_LABELS } from '@/lib/constants';
import { handleApiError } from '@/lib/utils/errorHandling';
import { deriveUrgencyScore } from '@/lib/utils/urgency';
import type {
  DiagnosticsResponse,
  ObjectsResponse,
  PipelinesResponse,
} from '../api_types';
import { pocketbase } from '../pocketbase';

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const ai = new GoogleGenAI({
  apiKey,
});

const SYSTEM_INSTRUCTION = `
РОЛЬ: Ты — Старший руководитель полевых операций (Senior Field Operations Manager) в нефтегазовой отрасли.
ЗАДАЧА: Сформировать четкий, профессиональный "Field Brief" (Полевое задание) для ремонтной бригады на основе данных диагностики.

ВЫБОР ДИАГНОСТИКИ:
- Тебе дадут список диагностик с их id, параметрами и кратким контекстом.
- Определи самую критичную диагностику по риску для безопасности/надёжности. НЕ выбирай последнюю по дате автоматически, если она не самая рискованная.
- Верни id выбранной диагностики в поле critical_diagnostic_id и одну строку объяснения в critical_reason.
- Строй план действий именно по этой диагностике.

ВХОДНЫЕ ДАННЫЕ:
Ты получишь JSON с данными об объекте (тип, материал) и списком диагностик (метод, параметры, статус).

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
Отвечай ТОЛЬКО валидным JSON объектом. Никакого маркдауна вокруг JSON и внутри JSON.
Язык: Профессиональный технический Русский.

СТРУКТУРА JSON:
{
  "critical_diagnostic_id": "<id выбранной диагностики из списка>",
  "critical_reason": "Коротко: почему выбрана эта диагностика",
  "problem_summary": "Техническое заключение. 1 объемный абзац, полно описывает все выявленные проблемы по объекту, включая параметры, локализацию, степень критичности и риски. Пример: 'Критический питтинг коррозии глубиной 6мм (80% стенки) на участке сварного шва, сопровождается снижением герметичности и риском разгерметизации при штатном давлении.'",
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
  object_id: string;
}

export interface SelectedDiagnostic {
  id: string;
  date?: string;
  method?: string;
  defect_found?: boolean;
  defect_description?: string;
  quality_grade?: string;
  ml_label?: string;
  param1?: number | string | null;
  param2?: number | string | null;
  param3?: number | string | null;
  temperature?: number | null;
  humidity?: number | null;
  illumination?: number | null;
}

export interface ActionPlanResult {
  problem_summary: string;
  action_plan: string[];
  required_resources: string;
  safety_requirements: string;
  expected_outcome: string;
  critical_diagnostic_id?: string;
  critical_reason?: string;
}

export interface ActionPlanResponse {
  success: boolean;
  result?: ActionPlanResult;
  object_data?: {
    id: string;
    name: string;
    type: string;
    pipeline_name: string;
    health_status: string;
    urgency_score: number;
  };
  selected_diagnostic?: SelectedDiagnostic;
  diagnostic_reason?: string;
  error?: string;
}

const formatParam = (value?: number | string | null): string =>
  value === undefined || value === null ? 'n/a' : `${value}`;

const buildParamContext = (
  method?: string,
  p1?: number | string | null,
  p2?: number | string | null,
  p3?: number | string | null,
): string => {
  switch (method) {
    case 'VIBRO':
      return `VIBRO params -> vibration velocity=${formatParam(
        p1,
      )} мм/с (crit >7.1), acceleration=${formatParam(
        p2,
      )}, freq/temp=${formatParam(p3)}.`;
    case 'MFL':
    case 'UTWM':
      return `MFL/UTWM params -> corrosion depth=${formatParam(
        p1,
      )}, remaining wall=${formatParam(p2)}, defect length=${formatParam(p3)}.`;
    case 'VIK':
      return `VIK params -> size=${formatParam(p1)}x${formatParam(
        p2,
      )} мм, depth=${formatParam(p3)} мм.`;
    default:
      return `Params -> p1=${formatParam(p1)}, p2=${formatParam(
        p2,
      )}, p3=${formatParam(p3)}.`;
  }
};

const getDiagnosticTimestamp = (d: DiagnosticsResponse): number =>
  new Date(
    d.date ||
      (d as { updated?: string }).updated ||
      (d as { created?: string }).created ||
      0,
  ).getTime();

const pickMostCriticalDiagnostic = (
  diagnostics: DiagnosticsResponse[],
): { diagnostic: DiagnosticsResponse; reason: string } => {
  const scored = diagnostics.map((d) => {
    let score = 0;
    const reasons: string[] = [];

    if (d.defect_found) {
      score += 3;
      reasons.push('обнаружен дефект');
    }
    if (d.quality_grade === 'недопустимо') {
      score += 4;
      reasons.push('качество=недопустимо');
    } else if (d.quality_grade === 'требует_мер') {
      score += 2;
      reasons.push('качество=требует мер');
    } else if (d.quality_grade === 'допустимо') {
      score += 1;
      reasons.push('качество=допустимо');
    }

    if (d.ml_label === 'high') {
      score += 3;
      reasons.push('AI=high');
    } else if (d.ml_label === 'medium') {
      score += 2;
      reasons.push('AI=medium');
    }

    const ts = getDiagnosticTimestamp(d);

    return {
      diagnostic: d,
      score,
      ts,
      reason:
        reasons.length > 0
          ? reasons.join(', ')
          : 'выбрана самая свежая диагностика',
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.ts - a.ts;
  });

  return scored[0];
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ActionPlanRequest = await request.json();
    const { object_id } = body;

    if (!object_id) {
      return NextResponse.json(
        { success: false, error: 'object_id is required' },
        { status: 400 },
      );
    }

    const pb = await pocketbase();

    // Fetch object with pipeline
    let object: ObjectsResponse<{ pipeline?: PipelinesResponse }>;
    try {
      object = await pb
        .collection('objects')
        .getOne<ObjectsResponse<{ pipeline?: PipelinesResponse }>>(object_id, {
          expand: 'pipeline',
        });
    } catch {
      return NextResponse.json(
        { success: false, error: 'Object not found' },
        { status: 404 },
      );
    }

    // Fetch diagnostics for the object (newest first)
    const diagnostics = (await pb.collection('diagnostics').getFullList({
      filter: `object="${object_id}"`,
      sort: '-date',
    })) as DiagnosticsResponse[];

    if (diagnostics.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Diagnostics not found for this object' },
        { status: 404 },
      );
    }

    const pipeline = object.expand?.pipeline;
    const urgencyScore = deriveUrgencyScore(object);
    const fallbackCandidate = pickMostCriticalDiagnostic(diagnostics);

    const diagnosticsPayload = diagnostics.slice(0, 20).map((d) => ({
      id: d.id,
      date: d.date,
      method: d.method,
      defect_found: d.defect_found,
      defect_description: d.defect_description,
      quality_grade: d.quality_grade,
      ml_label: d.ml_label,
      param1: d.param1,
      param2: d.param2,
      param3: d.param3,
      temperature: d.temperature,
      humidity: d.humidity,
      illumination: d.illumination,
      param_context: buildParamContext(d.method, d.param1, d.param2, d.param3),
    }));

    // Prepare data for AI analysis
    const analysisData = {
      object: {
        id: object.id,
        name: object.name,
        type: object.type,
        material: object.material,
        year: object.year,
        health_status: object.health_status,
        urgency_score: urgencyScore,
        ai_summary: object.ai_summary,
        recommended_action: object.recommended_action,
      },
      pipeline: {
        name: pipeline?.name || 'Неизвестный трубопровод',
      },
      diagnostics: diagnosticsPayload,
      auto_candidate: {
        id: fallbackCandidate.diagnostic.id,
        reason: fallbackCandidate.reason,
      },
    };

    // Call Gemini for action plan generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `На основе списка диагностик выбери самую критичную (по риску) и сгенерируй план действий именно по ней. Обязательно верни critical_diagnostic_id из списка и поясни выбор в critical_reason.\n\n${JSON.stringify(
                analysisData,
                null,
                2,
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
    });

    // Parse AI response
    const aiText = response.text;
    if (!aiText) {
      throw new Error('Empty response from AI');
    }

    let actionPlan: ActionPlanResult;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedText = aiText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();

      actionPlan = JSON.parse(cleanedText);

      // Validate the response structure
      const hasValidActions =
        Array.isArray(actionPlan.action_plan) &&
        actionPlan.action_plan.length > 0 &&
        actionPlan.action_plan.every((item) => typeof item === 'string');

      if (
        !actionPlan.problem_summary ||
        !hasValidActions ||
        !actionPlan.required_resources ||
        !actionPlan.safety_requirements ||
        !actionPlan.expected_outcome
      ) {
        throw new Error('Invalid response structure');
      }
    } catch (parseError) {
      throw handleApiError(parseError, 'Failed to parse AI response');
    }

    const aiCriticalId = actionPlan.critical_diagnostic_id;
    const selectedDiagnostic =
      diagnostics.find((d) => d.id === aiCriticalId) ??
      fallbackCandidate.diagnostic;

    const selectionReason =
      actionPlan.critical_reason ||
      (aiCriticalId && selectedDiagnostic.id === aiCriticalId
        ? 'AI выбрал эту диагностику без пояснения'
        : fallbackCandidate.reason);

    const resultWithCritical: ActionPlanResult = {
      ...actionPlan,
      critical_diagnostic_id: selectedDiagnostic.id,
      critical_reason: selectionReason,
    };

    const selectedDiagnosticPayload: SelectedDiagnostic = {
      id: selectedDiagnostic.id,
      date: selectedDiagnostic.date,
      method: selectedDiagnostic.method,
      defect_found: selectedDiagnostic.defect_found,
      defect_description: selectedDiagnostic.defect_description,
      quality_grade: selectedDiagnostic.quality_grade,
      ml_label: selectedDiagnostic.ml_label,
      param1: selectedDiagnostic.param1,
      param2: selectedDiagnostic.param2,
      param3: selectedDiagnostic.param3,
      temperature: selectedDiagnostic.temperature,
      humidity: selectedDiagnostic.humidity,
      illumination: selectedDiagnostic.illumination,
    };

    return NextResponse.json({
      success: true,
      result: resultWithCritical,
      object_data: {
        id: object.id,
        name: object.name || 'Объект без имени',
        type:
          OBJECT_TYPE_LABELS[object.type as keyof typeof OBJECT_TYPE_LABELS] ||
          object.type ||
          'Неизвестный тип',
        pipeline_name: pipeline?.name || 'Неизвестный трубопровод',
        health_status: object.health_status || 'UNKNOWN',
        urgency_score: urgencyScore,
      },
      selected_diagnostic: selectedDiagnosticPayload,
      diagnostic_reason: selectionReason,
    } as ActionPlanResponse);
  } catch (error) {
    const apiError = handleApiError(error, 'Action plan generation error');
    return NextResponse.json(
      {
        success: false,
        error: apiError.message,
      },
      { status: 500 },
    );
  }
}
