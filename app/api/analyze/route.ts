import { type NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { pocketbase } from '../pocketbase';
import type {
  ObjectsResponse,
  DiagnosticsResponse,
  ObjectsHealthStatusOptions,
  PlanResponse,
  ActionResponse,
} from '../api_types';

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const ai = new GoogleGenAI({
  apiKey,
});

// Base system instruction for the AI analysis
const ANALYSIS_RULES = `DIAGNOSTIC METHODS REFERENCE:
- MFL (Magnetic Flux Leakage): Detects internal/external corrosion, metal loss. Trust for INTERNAL defects.
- VIK (Visual Inspection): Surface-only inspection. Cannot detect internal issues.
- UZK (Ultrasonic): Measures wall thickness, detects laminations.
- RGK (Radiographic): X-ray inspection for cracks, inclusions.
- TVK (Television/Video): Visual inspection via camera.
- MPK (Magnetic Particle): Surface cracks, weld defects.
- PVK (Penetrant): Surface-breaking cracks.
- VIBRO (Vibration): Mechanical issues in rotating equipment.
- TFI (Transverse Field Inspection): Metal loss at pipe body.
- GEO (Geometric): Dents, ovality, bending strain.
- UTWM (Ultrasonic Wall Measurement): Precise thickness measurement.

ANALYSIS RULES:
1. **Trend Analysis**: If defect depth/severity increases over time across inspections → Escalate status.
2. **Quality Grades**: 
   - "недопустимо" (unacceptable) → CRITICAL (but verify with params before assigning high scores)
   - "требует_мер" (needs action) → WARNING (only CRITICAL if multiple severe factors present)
   - "допустимо" (acceptable) → OK (minor concerns noted, but acceptable condition)
   - "удовлетворительно" (satisfactory) → OK
3. **ML Labels**: Consider ml_label as a SECONDARY factor only. Do not over-rely on ml_label alone.
4. **Environmental Factors**: Note environmental conditions but don't over-weight them.

SCORING GUIDELINES (BE CONSERVATIVE - avoid extreme scores):
- 0-25: OK (Good condition, routine monitoring)
- 26-65: WARNING (Attention needed, schedule inspection/repair)
- 66-85: CRITICAL (Serious issues requiring prompt action)
- 86-95: CRITICAL (Severe - urgent intervention needed)
- 96-100: EXTREME OUTLIER ONLY - Reserve for imminent catastrophic failure with multiple confirmed severe defects. Score of 100 should be VERY RARE.

TARGET DISTRIBUTION: Aim for approximately 30% OK, 50% WARNING, 20% CRITICAL across typical datasets. Do not over-classify to CRITICAL.

RECOMMENDED ACTIONS (choose the most appropriate):

For OK status (scores 0-25):
- "Продолжить плановый мониторинг" (Continue routine monitoring)
- "Включить в график следующей плановой диагностики" (Include in next scheduled inspection)
- "Документировать текущее состояние" (Document current condition)

For WARNING status (scores 26-65):
- "Запланировать повторную диагностику через 3-6 месяцев" (Schedule re-inspection in 3-6 months)
- "Провести дополнительный UZK контроль толщины стенки" (Perform additional UZK wall thickness check)
- "Выполнить визуальный осмотр и фотофиксацию" (Perform visual inspection with photo documentation)
- "Усилить периодичность мониторинга" (Increase monitoring frequency)
- "Подготовить план превентивного ремонта" (Prepare preventive repair plan)
- "Провести очистку и антикоррозионную обработку" (Perform cleaning and anti-corrosion treatment)
- "Выполнить переизоляцию участка" (Re-insulate the section)
- "Проверить работу катодной защиты" (Check cathodic protection operation)
- "Заменить уплотнительные элементы" (Replace sealing elements)

For CRITICAL status (scores 66-85):
- "Срочно запланировать ремонтные работы" (Urgently schedule repair work)
- "Подготовить участок к капитальному ремонту" (Prepare section for major repair)
- "Установить временные ограничения давления" (Set temporary pressure restrictions)
- "Провести дополнительную диагностику смежных участков" (Perform additional diagnostics on adjacent sections)
- "Разработать проект ремонта с заменой дефектного участка" (Develop repair project with defective section replacement)

For CRITICAL status (scores 86-95):
- "Немедленно снизить рабочее давление" (Immediately reduce operating pressure)
- "Подготовить аварийную бригаду" (Prepare emergency crew)
- "Произвести срочную замену участка трубопровода" (Perform urgent pipeline section replacement)
- "Вывести объект на внеплановый ремонт" (Take object for unscheduled repair)

For EXTREME cases only (scores 96-100):
- "Немедленный вывод из эксплуатации" (Immediate shutdown)
- "Аварийная остановка и эвакуация персонала" (Emergency stop and personnel evacuation)`;

const PARAMETER_CONTEXT = `PARAMETER CONTEXT:
- If method is "VIBRO": param1 = Vibration Velocity (mm/s, critical if > 7.1), param2 = Vibration Acceleration (m/s²), param3 = Frequency (Hz) or bearing temperature.
- If method is "MFL" or "UTWM": param1 = Corrosion Depth (mm or % metal loss; higher is worse), param2 = Remaining Wall Thickness (mm; lower is worse), param3 = Defect length (mm).
- If method is "VIK": param1 = Length (mm), param2 = Width (mm), param3 = Depth (mm if measured).`;

// System instruction for single object analysis
const SYSTEM_INSTRUCTION = `You are a Senior Pipeline Integrity Engineer with 20+ years of experience. Analyze the provided diagnostic history for a pipeline object and assess its health status.

${ANALYSIS_RULES}
${PARAMETER_CONTEXT}

POST-ACTION PLAN CONTEXT:
- You may receive a completed action plan with actions_done/total.
- If work is finished after the last analysis, you should reflect improvement, but stay conservative. Do NOT reset urgency_score to 0. Keep a realistic residual risk based on diagnostics and remaining uncertainties.
- If diagnostics still show severe issues, keep the score high even if actions were performed.

CRITICAL RULE - CONSISTENCY REQUIRED:
The health_status MUST match the urgency_score range:
- urgency_score 0-25 → health_status MUST be "OK"
- urgency_score 26-65 → health_status MUST be "WARNING"
- urgency_score 66-100 → health_status MUST be "CRITICAL"
NEVER return a high score (66+) with "WARNING" or "OK" status. They must be consistent.

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "health_status": "OK" | "WARNING" | "CRITICAL",
  "urgency_score": <number 0-100>,
  "ai_summary": "<Brief 1-2 sentence summary in Russian of the main finding>",
  "recommended_action": "<Specific actionable recommendation in Russian>"
}`;

// System instruction for BATCH analysis (multiple objects at once)
const BATCH_SYSTEM_INSTRUCTION = `You are a Senior Pipeline Integrity Engineer with 20+ years of experience. You will analyze MULTIPLE pipeline objects in a single batch. Analyze each object's diagnostic history independently and assess their health status.

${ANALYSIS_RULES}
${PARAMETER_CONTEXT}

CRITICAL RULE - CONSISTENCY REQUIRED:
The health_status MUST match the urgency_score range:
- urgency_score 0-25 → health_status MUST be "OK"
- urgency_score 26-65 → health_status MUST be "WARNING"
- urgency_score 66-100 → health_status MUST be "CRITICAL"
NEVER return a high score (66+) with "WARNING" or "OK" status. They must be consistent.

OUTPUT FORMAT:
Return ONLY a valid JSON array where each element corresponds to an object in the input (same order).
Each element must have this structure:
[
  {
    "object_id": "<the object's id from input>",
    "health_status": "OK" | "WARNING" | "CRITICAL",
    "urgency_score": <number 0-100>,
    "ai_summary": "<Brief 1-2 sentence summary in Russian>",
    "recommended_action": "<Specific recommendation in Russian>"
  },
  ...
]

IMPORTANT: Return results for ALL objects in the input, in the SAME ORDER.`;

// Helper: latest timestamp from diagnostics (date field preferred, fallback to updated/created)
const getLatestDiagnosticTimestamp = (
  diagnostics: DiagnosticsResponse[],
): number => {
  return diagnostics.reduce((latest, d) => {
    const ts = new Date(
      d.date ||
        (d as { updated?: string }).updated ||
        (d as { created?: string }).created ||
        0,
    ).getTime();
    return Number.isFinite(ts) ? Math.max(latest, ts) : latest;
  }, 0);
};

const getLatestDiagnostic = (
  diagnostics: DiagnosticsResponse[],
): DiagnosticsResponse | undefined => {
  if (!diagnostics.length) return undefined;

  return [...diagnostics].sort(
    (a, b) =>
      new Date(
        b.date ||
          (b as { updated?: string }).updated ||
          (b as { created?: string }).created ||
          0,
      ).getTime() -
      new Date(
        a.date ||
          (a as { updated?: string }).updated ||
          (a as { created?: string }).created ||
          0,
      ).getTime(),
  )[0];
};

const formatParam = (value?: number | string | null): string =>
  value === undefined || value === null ? 'n/a' : `${value}`;

const summarizePlan = (
  plan?: PlanResponse<{ actions?: ActionResponse[] }>,
): {
  summary?: string;
  updatedTs: number;
  actionsDone: number;
  actionsTotal: number;
  problem?: string;
} => {
  if (!plan)
    return {
      summary: undefined,
      updatedTs: 0,
      actionsDone: 0,
      actionsTotal: 0,
      problem: undefined,
    };

  const actions = plan.expand?.actions ?? [];
  const actionsTotal = actions.length;
  const actionsDone = actions.filter((a) => !!a.status).length;
  const updatedTs = new Date(plan.updated || 0).getTime();

  const summary = `Plan ${plan.id} (status=${plan.status}) finished at ${plan.updated}. Actions done: ${actionsDone}/${actionsTotal}.`;

  return {
    summary,
    updatedTs: Number.isFinite(updatedTs) ? updatedTs : 0,
    actionsDone,
    actionsTotal,
    problem: plan.problem,
  };
};

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
      )} mm/s (critical if >7.1), acceleration=${formatParam(
        p2,
      )} m/s², frequency/temperature=${formatParam(p3)}.`;
    case 'MFL':
    case 'UTWM':
      return `MFL/UTWM params -> corrosion depth=${formatParam(
        p1,
      )} mm (or % metal loss), remaining wall=${formatParam(
        p2,
      )} mm, defect length=${formatParam(p3)} mm.`;
    case 'VIK':
      return `VIK params -> size LxW=${formatParam(p1)}x${formatParam(
        p2,
      )} mm, depth=${formatParam(p3)} mm (if available).`;
    default:
      return `Params -> param1=${formatParam(p1)}, param2=${formatParam(
        p2,
      )}, param3=${formatParam(p3)}.`;
  }
};

export interface AnalysisRequest {
  object_id: string;
}

type AiAnalysisResult = {
  health_status: ObjectsHealthStatusOptions;
  urgency_score: number;
  ai_summary: string;
  recommended_action: string;
};

export interface AnalysisResult extends AiAnalysisResult {
  has_defects: boolean;
}

export interface AnalysisResponse {
  success: boolean;
  object_id: string;
  result?: AnalysisResult;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: AnalysisRequest = await request.json();
    const { object_id } = body;

    if (!object_id) {
      return NextResponse.json(
        { success: false, error: 'object_id is required' },
        { status: 400 },
      );
    }

    const pb = await pocketbase();

    // Fetch the object
    let object: ObjectsResponse;
    try {
      object = await pb.collection('objects').getOne(object_id);
    } catch {
      return NextResponse.json(
        { success: false, object_id, error: 'Object not found' },
        { status: 404 },
      );
    }

    // Fetch all diagnostics for this object
    let diagnostics: DiagnosticsResponse[] = [];
    try {
      const result = await pb.collection('diagnostics').getFullList({
        filter: `object="${object_id}"`,
        sort: '-date',
      });
      diagnostics = result as DiagnosticsResponse[];
    } catch (e) {
      console.error('Failed to fetch diagnostics:', e);
    }

    const latestDiagnosticTs =
      diagnostics.length > 0 ? getLatestDiagnosticTimestamp(diagnostics) : 0;
    const lastAnalysisTs = object.last_analysis_at
      ? new Date(object.last_analysis_at).getTime()
      : 0;
    const objectUpdatedTs = object.updated
      ? new Date(object.updated).getTime()
      : 0;
    const hasUrgency = typeof object.urgency_score === 'number';

    // Fetch the latest finished plan (if any)
    let latestDonePlan: PlanResponse<{ actions?: ActionResponse[] }> | null =
      null;
    let latestDonePlanTs = 0;
    try {
      const donePlans = await pb
        .collection('plan')
        .getList<PlanResponse<{ actions?: ActionResponse[] }>>(1, 1, {
          filter: `object="${object_id}" && status="done"`,
          sort: '-updated',
          expand: 'actions',
        });
      latestDonePlan = donePlans.items[0] || null;
      const planMeta = summarizePlan(latestDonePlan ?? undefined);
      latestDonePlanTs = planMeta.updatedTs;
    } catch (e) {
      console.error('Failed to fetch finished plan:', e);
    }

    const hasFinishedPlanAfterLastAnalysis =
      latestDonePlanTs > Math.max(lastAnalysisTs || 0, objectUpdatedTs || 0, 0);

    // Skip if no diagnostics
    if (diagnostics.length === 0) {
      return NextResponse.json({
        success: true,
        object_id,
        skipped: true,
        reason: 'no_diagnostics',
      });
    }

    // Skip if already analyzed and no new diagnostics since last analysis
    if (
      hasUrgency &&
      lastAnalysisTs &&
      latestDiagnosticTs <= lastAnalysisTs &&
      !hasFinishedPlanAfterLastAnalysis
    ) {
      return NextResponse.json({
        success: true,
        object_id,
        skipped: true,
        reason: 'no_new_diagnostics',
      });
    }

    // Prepare data for AI analysis
    const analysisData = {
      object: {
        id: object.id,
        name: object.name,
        type: object.type,
        material: object.material,
        year: object.year,
        previous_ai_summary: object.ai_summary,
        previous_recommendation: object.recommended_action,
        previous_urgency: object.urgency_score,
        last_analysis_at: object.last_analysis_at,
        updated_at: object.updated,
      },
      plan: latestDonePlan
        ? {
            id: latestDonePlan.id,
            status: latestDonePlan.status,
            updated: latestDonePlan.updated,
            problem: latestDonePlan.problem,
            actions: (latestDonePlan.expand?.actions ?? []).map((a) => ({
              id: a.id,
              description: a.description,
              status: a.status,
              updated: a.updated,
            })),
          }
        : null,
      diagnostics: diagnostics.map((d) => ({
        date: d.date,
        method: d.method,
        defect_found: d.defect_found,
        defect_description: d.defect_description,
        quality_grade: d.quality_grade,
        ml_label: d.ml_label,
        param1: d.param1,
        param2: d.param2,
        param3: d.param3,
        param_context: buildParamContext(
          d.method,
          d.param1,
          d.param2,
          d.param3,
        ),
        temperature: d.temperature,
        humidity: d.humidity,
        illumination: d.illumination,
      })),
    };

    // Call Gemini for analysis
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Context for parameters (method-specific meaning):\n${PARAMETER_CONTEXT}\n\nAnalyze this pipeline object diagnostic data and provide a health assessment.\nIf a completed plan is provided, factor in the work done and expected risk reduction, but stay conservative and keep residual risk if diagnostics warrant it. Do NOT reset urgency to zero.\nUse the param_context fields to understand numeric values.\n\n${JSON.stringify(
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
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

    // Parse AI response
    const aiText = response.text;
    if (!aiText) {
      throw new Error('Empty response from AI');
    }

    let aiResult: AiAnalysisResult;
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

      aiResult = JSON.parse(cleanedText);

      // Validate the response structure
      if (
        !aiResult.health_status ||
        typeof aiResult.urgency_score !== 'number'
      ) {
        throw new Error('Invalid response structure');
      }

      // Clamp urgency_score to 0-100
      aiResult.urgency_score = Math.max(
        0,
        Math.min(100, Math.round(aiResult.urgency_score)),
      );

      // Conservative clamp when re-evaluating after a finished plan:
      // keep at least 35% of the previous score to avoid unrealistic resets.
      const prevScore =
        typeof object.urgency_score === 'number' ? object.urgency_score : null;
      if (hasFinishedPlanAfterLastAnalysis && prevScore !== null) {
        const floorScore = Math.max(0, Math.round(prevScore * 0.35));
        aiResult.urgency_score = Math.max(aiResult.urgency_score, floorScore);
      }

      // Enforce consistency between health_status and urgency_score
      // Score determines status, not the other way around
      if (aiResult.urgency_score <= 25) {
        aiResult.health_status = 'OK' as ObjectsHealthStatusOptions;
      } else if (aiResult.urgency_score <= 65) {
        aiResult.health_status = 'WARNING' as ObjectsHealthStatusOptions;
      } else {
        aiResult.health_status = 'CRITICAL' as ObjectsHealthStatusOptions;
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiText, parseError);
      throw new Error('Failed to parse AI response');
    }

    const latestDiagnostic = getLatestDiagnostic(diagnostics);
    const hasDefects = Boolean(latestDiagnostic?.defect_found);
    const analysisResult: AnalysisResult = {
      ...aiResult,
      has_defects: hasDefects,
    };

    // Update the object in Pocketbase
    await pb.collection('objects').update(object_id, {
      health_status: analysisResult.health_status,
      urgency_score: analysisResult.urgency_score,
      ai_summary: analysisResult.ai_summary,
      recommended_action: analysisResult.recommended_action,
      has_defects: analysisResult.has_defects,
      last_analysis_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      object_id,
      result: analysisResult,
    } as AnalysisResponse);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Batch analysis endpoint - analyze multiple objects in ONE AI call
const BATCH_SIZE = 10; // Analyze up to 10 objects per AI call

type AiBatchAnalysisResult = AiAnalysisResult & {
  object_id: string;
};

export interface BatchAnalysisResult extends AiBatchAnalysisResult {
  has_defects: boolean;
}

export interface BatchAnalysisResponse {
  success: boolean;
  results: BatchAnalysisResult[];
  errors: Array<{ object_id: string; error: string }>;
  skipped?: Array<{ object_id: string; reason: string }>;
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { object_ids } = body as { object_ids: string[] };

    if (!object_ids || object_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'object_ids array is required' },
        { status: 400 },
      );
    }

    // Limit batch size
    const idsToProcess = object_ids.slice(0, BATCH_SIZE);
    const pb = await pocketbase();

    // Fetch all objects in a single query
    const objectFilter = idsToProcess.map((id) => `id="${id}"`).join(' || ');
    const objects = await pb.collection('objects').getFullList({
      filter: objectFilter,
    });

    if (objects.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        errors: idsToProcess.map((id) => ({
          object_id: id,
          error: 'Not found',
        })),
      });
    }

    // Fetch diagnostics only for these objects in one query
    const objectIds = new Set(objects.map((o) => o.id));
    const diagFilter =
      objects.length > 0
        ? objects.map((o) => `object="${o.id}"`).join(' || ')
        : '';
    const allDiagnostics = await pb.collection('diagnostics').getFullList({
      filter: diagFilter,
    });
    const diagnosticsMap = new Map<string, DiagnosticsResponse[]>();

    for (const d of allDiagnostics) {
      const objId = d.object as string;
      if (!objectIds.has(objId)) continue;
      if (!diagnosticsMap.has(objId)) {
        diagnosticsMap.set(objId, []);
      }
      diagnosticsMap.get(objId)?.push(d);
    }

    // Prepare batch data for AI with skipping rules
    const results: BatchAnalysisResult[] = [];
    const errors: Array<{ object_id: string; error: string }> = [];
    const skipped: Array<{ object_id: string; reason: string }> = [];

    const batchData = objects.map((obj) => {
      const diagnostics = diagnosticsMap.get(obj.id) || [];
      const sortedDiagnostics = diagnostics
        .sort(
          (a, b) =>
            new Date(
              b.date || (b as { updated?: string }).updated || 0,
            ).getTime() -
            new Date(
              a.date || (a as { updated?: string }).updated || 0,
            ).getTime(),
        )
        .slice(0, 5);

      return {
        object: {
          id: obj.id,
          name: obj.name,
          type: obj.type,
          material: obj.material,
          year: obj.year,
          last_analysis_at: obj.last_analysis_at,
          urgency_score: obj.urgency_score,
        },
        diagnostics: sortedDiagnostics.map((d) => ({
          date: d.date,
          method: d.method,
          defect_found: d.defect_found,
          defect_description: d.defect_description,
          quality_grade: d.quality_grade,
          ml_label: d.ml_label,
          param1: d.param1,
          param2: d.param2,
          param3: d.param3,
          param_context: buildParamContext(
            d.method,
            d.param1,
            d.param2,
            d.param3,
          ),
          updated: (d as { updated?: string }).updated,
          created: (d as { created?: string }).created,
        })),
        latestDiagnosticTs: diagnostics.length
          ? getLatestDiagnosticTimestamp(diagnostics)
          : 0,
      };
    });

    const objectsToAnalyze = batchData.filter((entry) => {
      if (entry.diagnostics.length === 0) {
        skipped.push({ object_id: entry.object.id, reason: 'no_diagnostics' });
        return false;
      }

      const hasUrgency = typeof entry.object.urgency_score === 'number';
      const lastAnalysisTs = entry.object.last_analysis_at
        ? new Date(entry.object.last_analysis_at).getTime()
        : 0;
      const hasNewDiagnostics =
        entry.latestDiagnosticTs > 0 &&
        (!lastAnalysisTs || entry.latestDiagnosticTs > lastAnalysisTs);

      if (!hasUrgency) return true;
      if (hasNewDiagnostics) return true;

      skipped.push({
        object_id: entry.object.id,
        reason: 'no_new_diagnostics',
      });
      return false;
    });

    if (objectsToAnalyze.length === 0) {
      return NextResponse.json({
        success: true,
        results,
        errors,
        skipped,
      } as BatchAnalysisResponse);
    }

    // If there are objects with diagnostics, call AI
    if (objectsToAnalyze.length > 0) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Context for parameters (method-specific meaning):\n${PARAMETER_CONTEXT}\n\nAnalyze these ${objectsToAnalyze.length} pipeline objects and provide health assessments for each. Use the param_context fields to interpret param1-3.\n\n${JSON.stringify(
                  objectsToAnalyze.map(({ object, diagnostics }) => ({
                    object: {
                      id: object.id,
                      name: object.name,
                      type: object.type,
                      material: object.material,
                      year: object.year,
                    },
                    diagnostics,
                  })),
                  null,
                  2,
                )}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: BATCH_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      });

      const aiText = response.text;
      if (!aiText) {
        throw new Error('Empty response from AI');
      }

      // Parse batch response
      let cleanedText = aiText.trim();
      if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
      if (cleanedText.startsWith('```')) cleanedText = cleanedText.slice(3);
      if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);
      cleanedText = cleanedText.trim();

      const batchResults: AiBatchAnalysisResult[] = JSON.parse(cleanedText);

      // Process each result
      for (const rawResult of batchResults) {
        const resultFromAi = { ...rawResult };

        // Clamp urgency_score to 0-100
        resultFromAi.urgency_score = Math.max(
          0,
          Math.min(100, Math.round(resultFromAi.urgency_score)),
        );

        // Enforce consistency between health_status and urgency_score
        // Score determines status, not the other way around
        if (resultFromAi.urgency_score <= 25) {
          resultFromAi.health_status = 'OK' as ObjectsHealthStatusOptions;
        } else if (resultFromAi.urgency_score <= 65) {
          resultFromAi.health_status = 'WARNING' as ObjectsHealthStatusOptions;
        } else {
          resultFromAi.health_status = 'CRITICAL' as ObjectsHealthStatusOptions;
        }

        const diagList = diagnosticsMap.get(resultFromAi.object_id) || [];
        const latestDiagnostic = getLatestDiagnostic(diagList);
        const hasDefects = Boolean(latestDiagnostic?.defect_found);
        const result: BatchAnalysisResult = {
          ...resultFromAi,
          has_defects: hasDefects,
        };

        results.push(result);

        // Update in DB
        try {
          await pb.collection('objects').update(result.object_id, {
            health_status: result.health_status,
            urgency_score: result.urgency_score,
            ai_summary: result.ai_summary,
            recommended_action: result.recommended_action,
            has_defects: result.has_defects,
            last_analysis_at: new Date().toISOString(),
          });
        } catch (e) {
          errors.push({
            object_id: result.object_id,
            error: e instanceof Error ? e.message : 'DB update failed',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      skipped,
    } as BatchAnalysisResponse);
  } catch (error) {
    console.error('Batch analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        results: [],
        errors: [
          {
            object_id: 'batch',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      },
      { status: 500 },
    );
  }
}

// Get prioritized object IDs for analysis
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { object_ids, prioritize_high_risk = true } = body as {
      object_ids?: string[];
      prioritize_high_risk?: boolean;
    };

    const pb = await pocketbase();

    // Fetch objects and diagnostics once
    const allObjects = await pb.collection('objects').getFullList();
    const targetSet =
      object_ids && object_ids.length > 0 ? new Set(object_ids) : null;
    const objects = targetSet
      ? allObjects.filter((o) => targetSet.has(o.id))
      : allObjects;

    const objectIdsForDiagnostics = objects.map((o) => o.id);
    const diagFilter =
      objectIdsForDiagnostics.length > 0
        ? objectIdsForDiagnostics.map((id) => `object="${id}"`).join(' || ')
        : '';
    const diagnostics =
      objectIdsForDiagnostics.length > 0
        ? await pb.collection('diagnostics').getFullList({ filter: diagFilter })
        : [];
    const diagnosticsMap = new Map<string, DiagnosticsResponse[]>();

    for (const d of diagnostics) {
      const objectId = d.object as string;
      if (targetSet && !targetSet.has(objectId)) continue;
      if (!diagnosticsMap.has(objectId)) diagnosticsMap.set(objectId, []);
      diagnosticsMap.get(objectId)?.push(d);
    }

    // Filter to objects that actually need analysis
    const idsToAnalyze = objects
      .filter((obj) => {
        const diagList = diagnosticsMap.get(obj.id) || [];
        if (diagList.length === 0) return false; // no diagnostics -> skip

        const latestDiagTs = getLatestDiagnosticTimestamp(diagList);
        const lastAnalysisTs = obj.last_analysis_at
          ? new Date(obj.last_analysis_at).getTime()
          : 0;
        const hasUrgency = typeof obj.urgency_score === 'number';

        if (!hasUrgency) return true;
        return latestDiagTs > lastAnalysisTs;
      })
      .map((o) => o.id);

    // Prioritize by risk if requested
    if (prioritize_high_risk && idsToAnalyze.length > 0) {
      const idsSet = new Set(idsToAnalyze);
      const riskMap = new Map<string, number>();
      for (const d of diagnostics) {
        const objectId = d.object as string;
        if (!idsSet.has(objectId)) continue;

        const currentRisk = riskMap.get(objectId) || 0;
        let newRisk = 0;
        if (d.ml_label === 'high') newRisk = 3;
        else if (d.ml_label === 'medium') newRisk = 2;
        else if (d.ml_label === 'normal') newRisk = 1;

        if (d.quality_grade === 'недопустимо') newRisk = Math.max(newRisk, 4);
        else if (d.quality_grade === 'требует_мер')
          newRisk = Math.max(newRisk, 3);
        else if (d.quality_grade === 'допустимо')
          newRisk = Math.max(newRisk, 2);

        if (newRisk > currentRisk) {
          riskMap.set(objectId, newRisk);
        }
      }

      idsToAnalyze.sort((a, b) => {
        const riskA = riskMap.get(a) || 0;
        const riskB = riskMap.get(b) || 0;
        return riskB - riskA;
      });
    }

    return NextResponse.json({
      success: true,
      total: idsToAnalyze.length,
      object_ids: idsToAnalyze,
    });
  } catch (error) {
    console.error('Batch preparation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
