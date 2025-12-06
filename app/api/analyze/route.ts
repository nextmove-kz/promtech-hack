import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { pocketbase } from "../pocketbase";
import type {
  ObjectsResponse,
  DiagnosticsResponse,
  ObjectsHealthStatusOptions,
} from "../api_types";

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
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
1. **Conflict Detection**: If MFL shows defects but VIK is clean → Mark conflict_detected: true (internal corrosion not visible externally). Same for UZK vs VIK discrepancies.
2. **Trend Analysis**: If defect depth/severity increases over time across inspections → Escalate status.
3. **Quality Grades**: 
   - "недопустимо" (unacceptable) → CRITICAL
   - "требует_мер" (needs action) → WARNING or CRITICAL based on params
   - "допустимо" (acceptable) → WARNING if params are borderline
   - "удовлетворительно" (satisfactory) → OK
4. **ML Labels**: Consider ml_label as a supporting factor (high=concern, medium=monitor, normal=ok).
5. **Environmental Factors**: High humidity + temperature variations may accelerate corrosion.

SCORING GUIDELINES:
- 0-30: OK (Good condition, routine monitoring sufficient)
- 31-70: WARNING (Attention needed, schedule inspection/repair)
- 71-100: CRITICAL (Immediate action required, safety risk)

RECOMMENDED ACTIONS:
- "Продолжить мониторинг" (Continue monitoring) - for OK status
- "Запланировать повторную диагностику" (Schedule re-inspection) - for borderline cases
- "Провести дополнительный UZK контроль" (Perform additional UZK inspection) - when wall thickness uncertain
- "Подготовить к ремонту" (Prepare for repair) - for WARNING with degradation
- "Немедленный вывод из эксплуатации" (Immediate shutdown) - for CRITICAL
- "Произвести замену участка" (Replace section) - for severe metal loss
- "Выполнить очистку и переизоляцию" (Clean and re-insulate) - for external corrosion`;

// System instruction for single object analysis
const SYSTEM_INSTRUCTION = `You are a Senior Pipeline Integrity Engineer with 20+ years of experience. Analyze the provided diagnostic history for a pipeline object and assess its health status.

${ANALYSIS_RULES}

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "health_status": "OK" | "WARNING" | "CRITICAL",
  "urgency_score": <number 0-100>,
  "ai_summary": "<Brief 1-2 sentence summary in Russian of the main finding>",
  "recommended_action": "<Specific actionable recommendation in Russian>",
  "conflict_detected": <boolean>
}`;

// System instruction for BATCH analysis (multiple objects at once)
const BATCH_SYSTEM_INSTRUCTION = `You are a Senior Pipeline Integrity Engineer with 20+ years of experience. You will analyze MULTIPLE pipeline objects in a single batch. Analyze each object's diagnostic history independently and assess their health status.

${ANALYSIS_RULES}

OUTPUT FORMAT:
Return ONLY a valid JSON array where each element corresponds to an object in the input (same order).
Each element must have this structure:
[
  {
    "object_id": "<the object's id from input>",
    "health_status": "OK" | "WARNING" | "CRITICAL",
    "urgency_score": <number 0-100>,
    "ai_summary": "<Brief 1-2 sentence summary in Russian>",
    "recommended_action": "<Specific recommendation in Russian>",
    "conflict_detected": <boolean>
  },
  ...
]

IMPORTANT: Return results for ALL objects in the input, in the SAME ORDER.`;

// Helper: latest timestamp from diagnostics (date field preferred, fallback to updated/created)
const getLatestDiagnosticTimestamp = (diagnostics: DiagnosticsResponse[]): number => {
  return diagnostics.reduce((latest, d) => {
    const ts = new Date(
      d.date || (d as { updated?: string }).updated || (d as { created?: string }).created || 0
    ).getTime();
    return Number.isFinite(ts) ? Math.max(latest, ts) : latest;
  }, 0);
};

export interface AnalysisRequest {
  object_id: string;
}

export interface AnalysisResult {
  health_status: ObjectsHealthStatusOptions;
  urgency_score: number;
  ai_summary: string;
  recommended_action: string;
  conflict_detected: boolean;
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
        { success: false, error: "object_id is required" },
        { status: 400 }
      );
    }

    const pb = await pocketbase();

    // Fetch the object
    let object: ObjectsResponse;
    try {
      object = await pb.collection("objects").getOne(object_id);
    } catch {
      return NextResponse.json(
        { success: false, object_id, error: "Object not found" },
        { status: 404 }
      );
    }

    // Fetch all diagnostics for this object
    let diagnostics: DiagnosticsResponse[] = [];
    try {
      const result = await pb.collection("diagnostics").getFullList({
        filter: `object="${object_id}"`,
        sort: "-date",
      });
      diagnostics = result as DiagnosticsResponse[];
    } catch (e) {
      console.error("Failed to fetch diagnostics:", e);
    }

    const latestDiagnosticTs =
      diagnostics.length > 0 ? getLatestDiagnosticTimestamp(diagnostics) : 0;
    const lastAnalysisTs = object.last_analysis_at
      ? new Date(object.last_analysis_at).getTime()
      : 0;
    const hasUrgency = typeof object.urgency_score === "number";

    // Skip if no diagnostics
    if (diagnostics.length === 0) {
      return NextResponse.json({
        success: true,
        object_id,
        skipped: true,
        reason: "no_diagnostics",
      });
    }

    // Skip if already analyzed and no new diagnostics since last analysis
    if (hasUrgency && lastAnalysisTs && latestDiagnosticTs <= lastAnalysisTs) {
      return NextResponse.json({
        success: true,
        object_id,
        skipped: true,
        reason: "no_new_diagnostics",
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
      },
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
        temperature: d.temperature,
        humidity: d.humidity,
        illumination: d.illumination,
      })),
    };

    // Call Gemini for analysis
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this pipeline object diagnostic data and provide a health assessment:\n\n${JSON.stringify(analysisData, null, 2)}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

    // Parse AI response
    const aiText = response.text;
    if (!aiText) {
      throw new Error("Empty response from AI");
    }

    let analysisResult: AnalysisResult;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedText = aiText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();

      analysisResult = JSON.parse(cleanedText);

      // Validate the response structure
      if (
        !analysisResult.health_status ||
        typeof analysisResult.urgency_score !== "number"
      ) {
        throw new Error("Invalid response structure");
      }

      // Ensure health_status is valid
      const validStatuses = ["OK", "WARNING", "CRITICAL"];
      if (!validStatuses.includes(analysisResult.health_status)) {
        analysisResult.health_status = "WARNING" as ObjectsHealthStatusOptions;
      }

      // Clamp urgency_score to 0-100
      analysisResult.urgency_score = Math.max(
        0,
        Math.min(100, Math.round(analysisResult.urgency_score))
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiText, parseError);
      throw new Error("Failed to parse AI response");
    }

    // Update the object in Pocketbase
    await pb.collection("objects").update(object_id, {
      health_status: analysisResult.health_status,
      urgency_score: analysisResult.urgency_score,
      ai_summary: analysisResult.ai_summary,
      recommended_action: analysisResult.recommended_action,
      conflict_detected: analysisResult.conflict_detected,
      last_analysis_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      object_id,
      result: analysisResult,
    } as AnalysisResponse);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Batch analysis endpoint - analyze multiple objects in ONE AI call
const BATCH_SIZE = 10; // Analyze up to 10 objects per AI call

export interface BatchAnalysisResult {
  object_id: string;
  health_status: ObjectsHealthStatusOptions;
  urgency_score: number;
  ai_summary: string;
  recommended_action: string;
  conflict_detected: boolean;
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
        { success: false, error: "object_ids array is required" },
        { status: 400 }
      );
    }

    // Limit batch size
    const idsToProcess = object_ids.slice(0, BATCH_SIZE);
    const pb = await pocketbase();

    // Fetch all objects
    const objects: ObjectsResponse[] = [];
    for (const id of idsToProcess) {
      try {
        const obj = await pb.collection("objects").getOne(id);
        objects.push(obj);
      } catch {
        // Skip objects that don't exist
      }
    }

    if (objects.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        errors: idsToProcess.map((id) => ({ object_id: id, error: "Not found" })),
      });
    }

    // Fetch all diagnostics for these objects in one query
    const allDiagnostics = await pb.collection("diagnostics").getFullList();
    const objectIds = new Set(objects.map((o) => o.id));
    const diagnosticsMap = new Map<string, DiagnosticsResponse[]>();

    for (const d of allDiagnostics) {
      const objId = d.object as string;
      if (!objectIds.has(objId)) continue;
      if (!diagnosticsMap.has(objId)) {
        diagnosticsMap.set(objId, []);
      }
      diagnosticsMap.get(objId)!.push(d);
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
          new Date(b.date || (b as { updated?: string }).updated || 0).getTime() -
          new Date(a.date || (a as { updated?: string }).updated || 0).getTime()
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
        updated: (d as { updated?: string }).updated,
        created: (d as { created?: string }).created,
      })),
      latestDiagnosticTs: diagnostics.length ? getLatestDiagnosticTimestamp(diagnostics) : 0,
    };
  });

  const objectsToAnalyze = batchData.filter((entry) => {
    if (entry.diagnostics.length === 0) {
      skipped.push({ object_id: entry.object.id, reason: "no_diagnostics" });
      return false;
    }

    const hasUrgency = typeof entry.object.urgency_score === "number";
    const lastAnalysisTs = entry.object.last_analysis_at
      ? new Date(entry.object.last_analysis_at).getTime()
      : 0;
    const hasNewDiagnostics =
      entry.latestDiagnosticTs > 0 &&
      (!lastAnalysisTs || entry.latestDiagnosticTs > lastAnalysisTs);

    if (!hasUrgency) return true;
    if (hasNewDiagnostics) return true;

    skipped.push({ object_id: entry.object.id, reason: "no_new_diagnostics" });
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
        model: "gemini-2.0-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Analyze these ${objectsToAnalyze.length} pipeline objects and provide health assessments for each:\n\n${JSON.stringify(
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
                  2
                )}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: BATCH_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      });

      const aiText = response.text;
      if (!aiText) {
        throw new Error("Empty response from AI");
      }

      // Parse batch response
      let cleanedText = aiText.trim();
      if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
      if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
      if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);
      cleanedText = cleanedText.trim();

      const batchResults: BatchAnalysisResult[] = JSON.parse(cleanedText);

      // Process each result
      for (const result of batchResults) {
        // Validate and sanitize
        const validStatuses = ["OK", "WARNING", "CRITICAL"];
        if (!validStatuses.includes(result.health_status)) {
          result.health_status = "WARNING" as ObjectsHealthStatusOptions;
        }
        result.urgency_score = Math.max(0, Math.min(100, Math.round(result.urgency_score)));

        results.push(result);

        // Update in DB
        try {
          await pb.collection("objects").update(result.object_id, {
            health_status: result.health_status,
            urgency_score: result.urgency_score,
            ai_summary: result.ai_summary,
            recommended_action: result.recommended_action,
            conflict_detected: result.conflict_detected,
            last_analysis_at: new Date().toISOString(),
          });
        } catch (e) {
          errors.push({
            object_id: result.object_id,
            error: e instanceof Error ? e.message : "DB update failed",
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
    console.error("Batch analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        results: [],
        errors: [{ object_id: "batch", error: error instanceof Error ? error.message : "Unknown error" }],
      },
      { status: 500 }
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
    const allObjects = await pb.collection("objects").getFullList();
    const targetSet = object_ids && object_ids.length > 0 ? new Set(object_ids) : null;
    const objects = targetSet ? allObjects.filter((o) => targetSet.has(o.id)) : allObjects;

    const diagnostics = await pb.collection("diagnostics").getFullList();
    const diagnosticsMap = new Map<string, DiagnosticsResponse[]>();

    for (const d of diagnostics) {
      const objectId = d.object as string;
      if (targetSet && !targetSet.has(objectId)) continue;
      if (!diagnosticsMap.has(objectId)) diagnosticsMap.set(objectId, []);
      diagnosticsMap.get(objectId)!.push(d);
    }

    // Filter to objects that actually need analysis
    let idsToAnalyze = objects
      .filter((obj) => {
        const diagList = diagnosticsMap.get(obj.id) || [];
        if (diagList.length === 0) return false; // no diagnostics -> skip

        const latestDiagTs = getLatestDiagnosticTimestamp(diagList);
        const lastAnalysisTs = obj.last_analysis_at
          ? new Date(obj.last_analysis_at).getTime()
          : 0;
        const hasUrgency = typeof obj.urgency_score === "number";

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
        if (d.ml_label === "high") newRisk = 3;
        else if (d.ml_label === "medium") newRisk = 2;
        else if (d.ml_label === "normal") newRisk = 1;

        if (d.quality_grade === "недопустимо") newRisk = Math.max(newRisk, 4);
        else if (d.quality_grade === "требует_мер") newRisk = Math.max(newRisk, 3);
        else if (d.quality_grade === "допустимо") newRisk = Math.max(newRisk, 2);

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
    console.error("Batch preparation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

