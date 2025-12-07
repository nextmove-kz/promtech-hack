import { type NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { pocketbase } from '../pocketbase'
import type {
  ActionResponse,
  DiagnosticsResponse,
  ObjectsHealthStatusOptions,
  ObjectsResponse,
  PlanResponse,
} from '../api_types'

type ReanalysisCandidate = {
  object_id: string
  object_name: string
  plan_id: string
  plan_updated: string
  object_last_analysis_at?: string
  object_updated?: string
}

type ReanalysisRequest = {
  object_ids: string[]
}

type AiAnalysisResult = {
  health_status: ObjectsHealthStatusOptions
  urgency_score: number
  ai_summary: string
  recommended_action: string
}

type ReanalysisResult = AiAnalysisResult & {
  object_id: string
  has_defects: boolean
}

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required')
}

const ai = new GoogleGenAI({
  apiKey,
})

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
- "Аварийная остановка и эвакуация персонала" (Emergency stop and personnel evacuation)`

const PARAMETER_CONTEXT = `PARAMETER CONTEXT:
- If method is "VIBRO": param1 = Vibration Velocity (mm/s, critical if > 7.1), param2 = Vibration Acceleration (m/s²), param3 = Frequency (Hz) or bearing temperature.
- If method is "MFL" or "UTWM": param1 = Corrosion Depth (mm or % metal loss; higher is worse), param2 = Remaining Wall Thickness (mm; lower is worse), param3 = Defect length (mm).
- If method is "VIK": param1 = Length (mm), param2 = Width (mm), param3 = Depth (mm if measured).`

const REANALYSIS_SYSTEM_INSTRUCTION = `You are a Senior Pipeline Forensic Auditor with 25+ years of experience.

Your task is to VALIDATE the effectiveness of completed maintenance actions. Assume every action marked as done was completed successfully and delivered the intended positive outcome. Derive the current risk directly from the completed actions, even if no additional diagnostics are provided. Do not require extra evidence—treat the performed actions as proof of improvement.

You must compare the "Before" state, the "Action Taken", and, if available, any "After" proof. If no proof is present, proceed using the successful actions as the main evidence.



${ANALYSIS_RULES}

${PARAMETER_CONTEXT}



THE AUDIT LOGIC (Strict Reasoning Process):



1. **Categorize the Intervention**:

   - **TYPE A: Elimination** (Replacement, Cut-out, Welding repair).

     -> EXPECTATION: Defect should be GONE. Score can drop to 0-10 if new diagnostics confirm.

   - **TYPE B: Mitigation/Protection** (Coating, Pressure reduction, Cathodic protection).

     -> EXPECTATION: Defect remains but probability of failure drops. Score drops slightly (e.g., from 80 to 40-50), but NOT to OK.

   - **TYPE C: Monitoring/Verification** (Visual inspection, Re-scan).

     -> EXPECTATION: Defect is confirmed. Score DOES NOT DROP unless previous data was proven false. If defect exists, risk exists.



2. **Assume Successful Completion**:

   - Treat all completed actions as executed with good results.

   - Even if 'diagnostics_after' is empty or old, infer improvement directly from the actions taken.

   - If 'diagnostics_after' shows the defect is still present, keep urgency high, but otherwise rely on the assumed success of actions.

   - For monitoring/inspection-only actions, keep some residual risk but acknowledge that confirmation was performed.
   
   - Only take into account actions that are marked as done.



3. **Consistency Check**:

   - If new diagnostic quality_grade="недопустимо" -> Status MUST be CRITICAL (Score > 65), regardless of what actions were claimed.



OUTPUT FORMAT:

Return ONLY a valid JSON object:

{

  "health_status": "OK" | "WARNING" | "CRITICAL",

  "urgency_score": <number 0-100>,

  "ai_summary": "<Короткое понятное резюме на русском обычными предложениями (без телеграфного стиля, без английских слов).>",

  "recommended_action": "<Next step in Russian. If fixed -> 'Close case'. If failed -> 'Escalate' or 'Re-do' >"

}`

const getLatestDiagnosticTimestamp = (
  diagnostics: DiagnosticsResponse[]
): number => {
  return diagnostics.reduce((latest, d) => {
    const ts = new Date(
      d.date ||
        (d as { updated?: string }).updated ||
        (d as { created?: string }).created ||
        0
    ).getTime()
    return Number.isFinite(ts) ? Math.max(latest, ts) : latest
  }, 0)
}

const getLatestDiagnostic = (
  diagnostics: DiagnosticsResponse[]
): DiagnosticsResponse | undefined => {
  if (!diagnostics.length) return undefined

  return [...diagnostics].sort(
    (a, b) =>
      new Date(
        b.date ||
          (b as { updated?: string }).updated ||
          (b as { created?: string }).created ||
          0
      ).getTime() -
      new Date(
        a.date ||
          (a as { updated?: string }).updated ||
          (a as { created?: string }).created ||
          0
      ).getTime()
  )[0]
}

const formatParam = (value?: number | string | null): string =>
  value === undefined || value === null ? 'n/a' : `${value}`

const buildParamContext = (
  method?: string,
  p1?: number | string | null,
  p2?: number | string | null,
  p3?: number | string | null
): string => {
  switch (method) {
    case 'VIBRO':
      return `VIBRO params -> vibration velocity=${formatParam(
        p1
      )} mm/s (critical if >7.1), acceleration=${formatParam(
        p2
      )} m/s², frequency/temperature=${formatParam(p3)}.`
    case 'MFL':
    case 'UTWM':
      return `MFL/UTWM params -> corrosion depth=${formatParam(
        p1
      )} mm (or % metal loss), remaining wall=${formatParam(
        p2
      )} mm, defect length=${formatParam(p3)} mm.`
    case 'VIK':
      return `VIK params -> size LxW=${formatParam(p1)}x${formatParam(
        p2
      )} mm, depth=${formatParam(p3)} mm (if available).`
    default:
      return `Params -> param1=${formatParam(p1)}, param2=${formatParam(
        p2
      )}, param3=${formatParam(p3)}.`
  }
}

const summarizePlan = (
  plan?: PlanResponse<{ actions?: ActionResponse[] }>
): {
  summary?: string
  updatedTs: number
  actionsDone: number
  actionsTotal: number
  problem?: string
  actions?: Array<{
    id: string
    description: string
    status?: string | boolean
    updated?: string
  }>
} => {
  if (!plan)
    return {
      summary: undefined,
      updatedTs: 0,
      actionsDone: 0,
      actionsTotal: 0,
      problem: undefined,
      actions: [],
    }

  const actions = plan.expand?.actions ?? []
  const actionsTotal = actions.length
  const actionsDone = actions.filter(a => !!a.status).length
  const updatedTs = new Date(plan.updated || 0).getTime()

  const summary = `Plan ${plan.id} (status=${plan.status}) finished at ${plan.updated}. Actions done: ${actionsDone}/${actionsTotal}.`

  return {
    summary,
    updatedTs: Number.isFinite(updatedTs) ? updatedTs : 0,
    actionsDone,
    actionsTotal,
    problem: plan.problem,
    actions: actions.map(a => ({
      id: a.id,
      description: a.description,
      status: a.status,
      updated: a.updated,
    })),
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const pb = await pocketbase()

    const plans = await pb
      .collection('plan')
      .getFullList<PlanResponse<{ object?: ObjectsResponse }>>({
        filter: 'status="done"',
        sort: '-updated',
        expand: 'object',
      })

    const candidates = new Map<string, ReanalysisCandidate & { ts: number }>()

    for (const plan of plans) {
      const object = plan.expand?.object
      if (!object) continue

      const planTs = new Date(plan.updated || 0).getTime()
      const lastAnalysisTs = object.last_analysis_at
        ? new Date(object.last_analysis_at).getTime()
        : 0
      const objectUpdatedTs = object.updated
        ? new Date(object.updated).getTime()
        : 0

      // Need re-evaluation only if plan was finished after the last analysis/update
      const needsReeval =
        planTs > Math.max(lastAnalysisTs || 0, objectUpdatedTs || 0, 0)
      if (!needsReeval) continue

      const existing = candidates.get(object.id)
      if (!existing || planTs > existing.ts) {
        candidates.set(object.id, {
          object_id: object.id,
          object_name: object.name || 'Без названия',
          plan_id: plan.id,
          plan_updated: plan.updated,
          object_last_analysis_at: object.last_analysis_at,
          object_updated: object.updated,
          ts: planTs,
        })
      }
    }

    return NextResponse.json({
      success: true,
      items: Array.from(candidates.values()).map(
        ({ ts, ...rest }): ReanalysisCandidate => rest
      ),
    })
  } catch (error) {
    console.error('Failed to fetch reanalysis candidates:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown server error occurred',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ReanalysisRequest
    const { object_ids } = body

    if (!object_ids || !Array.isArray(object_ids) || object_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'object_ids array is required' },
        { status: 400 }
      )
    }

    const pb = await pocketbase()
    const idsToProcess = object_ids
    const objectFilter = idsToProcess.map(id => `id="${id}"`).join(' || ')
    const objects = await pb.collection('objects').getFullList({
      filter: objectFilter,
    })

    const results: ReanalysisResult[] = []
    const errors: Array<{ object_id: string; error: string }> = []
    const skipped: Array<{ object_id: string; reason: string }> = []

    for (const object_id of idsToProcess) {
      const object = objects.find(o => o.id === object_id) as
        | ObjectsResponse
        | undefined
      if (!object) {
        errors.push({ object_id, error: 'Object not found' })
        continue
      }

      try {
        const diagnostics = (await pb.collection('diagnostics').getFullList({
          filter: `object="${object_id}"`,
          sort: '-date',
        })) as DiagnosticsResponse[]

        if (diagnostics.length === 0) {
          skipped.push({ object_id, reason: 'no_diagnostics' })
          continue
        }

        const lastAnalysisTs = object.last_analysis_at
          ? new Date(object.last_analysis_at).getTime()
          : 0
        const objectUpdatedTs = object.updated
          ? new Date(object.updated).getTime()
          : 0
        const latestDiagnosticTs = getLatestDiagnosticTimestamp(diagnostics)

        const donePlans = await pb
          .collection('plan')
          .getList<PlanResponse<{ actions?: ActionResponse[] }>>(1, 1, {
            filter: `object="${object_id}" && status="done"`,
            sort: '-updated',
            expand: 'actions',
          })

        const latestDonePlan = donePlans.items[0] ?? null
        const planMeta = summarizePlan(latestDonePlan ?? undefined)
        const hasFinishedPlanAfterLastAnalysis =
          planMeta.updatedTs >
          Math.max(lastAnalysisTs || 0, objectUpdatedTs || 0, 0)

        if (!hasFinishedPlanAfterLastAnalysis) {
          skipped.push({
            object_id,
            reason: 'no_finished_plan_after_last_analysis',
          })
          continue
        }

        const diagnosticsAfterLastAnalysis = diagnostics.filter(d => {
          const ts = new Date(
            d.date ||
              (d as { updated?: string }).updated ||
              (d as { created?: string }).created ||
              0
          ).getTime()
          return ts > lastAnalysisTs
        })

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
                summary: planMeta.summary,
                actions_done: planMeta.actionsDone,
                actions_total: planMeta.actionsTotal,
                actions: planMeta.actions,
              }
            : null,
          diagnostics_before: diagnostics.filter(d => {
            const ts = new Date(
              d.date ||
                (d as { updated?: string }).updated ||
                (d as { created?: string }).created ||
                0
            ).getTime()
            return lastAnalysisTs ? ts <= lastAnalysisTs : true
          }),
          diagnostics_after: diagnosticsAfterLastAnalysis,
          latest_diagnostics: diagnostics.map(d => ({
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
              d.param3
            ),
            temperature: d.temperature,
            humidity: d.humidity,
            illumination: d.illumination,
            updated: (d as { updated?: string }).updated,
            created: (d as { created?: string }).created,
          })),
          latest_diagnostic_ts: latestDiagnosticTs,
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash-lite',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `AUDIT REQUEST FOR PIPELINE OBJECT: "${
                    analysisData.object.name
                  }"


PREVIOUS STATE:
- Risk Score: ${analysisData.object.previous_urgency}
- Issue: ${analysisData.object.previous_ai_summary}


INTERVENTION (PLAN):
- Status: ${analysisData.plan?.status}
- Actions Completed: ${analysisData.plan?.actions_done} / ${
                    analysisData.plan?.actions_total
                  }
- Actions Log: ${JSON.stringify(
                    analysisData.plan?.actions?.map(a => a.description)
                  )}


EVIDENCE (DIAGNOSTICS):
- LATEST SCAN (Post-Work): ${
                    analysisData.diagnostics_after.length > 0
                      ? JSON.stringify(analysisData.latest_diagnostics[0])
                      : 'NONE - assume actions succeeded; no extra verification provided'
                  }


TASK:
Re-evaluate the risk assuming the completed actions were executed successfully with good results. Derive the new risk directly from the actions taken (and diagnostics if present). Do not require additional proof; treat the performed actions as evidence of improvement. If actions were only monitoring/inspection, keep some residual risk but acknowledge confirmation. Write the ai_summary as human-readable Russian text.


Input Data Full Dump:
${JSON.stringify(analysisData, null, 2)}`,
                },
              ],
            },
          ],
          config: {
            systemInstruction: REANALYSIS_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        })

        const aiText = response.text
        if (!aiText) {
          throw new Error('Empty response from AI')
        }

        let aiResult: AiAnalysisResult
        try {
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

          aiResult = JSON.parse(cleanedText)

          if (
            !aiResult.health_status ||
            typeof aiResult.urgency_score !== 'number'
          ) {
            throw new Error('Invalid response structure')
          }

          aiResult.urgency_score = Math.max(
            0,
            Math.min(100, Math.round(aiResult.urgency_score))
          )

          if (aiResult.urgency_score <= 25) {
            aiResult.health_status = 'OK' as ObjectsHealthStatusOptions
          } else if (aiResult.urgency_score <= 65) {
            aiResult.health_status = 'WARNING' as ObjectsHealthStatusOptions
          } else {
            aiResult.health_status = 'CRITICAL' as ObjectsHealthStatusOptions
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', aiText, parseError)
          throw new Error('Failed to parse AI response')
        }

        const latestDiagnostic = getLatestDiagnostic(diagnostics)
        const hasDefects = Boolean(latestDiagnostic?.defect_found)

        results.push({
          object_id,
          ...aiResult,
          has_defects: hasDefects,
        })
      } catch (error) {
        console.error('Re-analysis error for object', object_id, error)
        errors.push({
          object_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Apply DB updates after AI responses are collected
    for (const result of results) {
      try {
        await pb.collection('objects').update(result.object_id, {
          health_status: result.health_status,
          urgency_score: result.urgency_score,
          ai_summary: result.ai_summary,
          recommended_action: result.recommended_action,
          has_defects: result.has_defects,
          last_analysis_at: new Date().toISOString(),
        })
      } catch (error) {
        errors.push({
          object_id: result.object_id,
          error: error instanceof Error ? error.message : 'DB update failed',
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      skipped,
      errors,
    })
  } catch (error) {
    console.error('Re-analysis batch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
      },
      { status: 500 }
    )
  }
}
