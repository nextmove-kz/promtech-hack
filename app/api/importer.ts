import pb from "./client_pb";
import type {
  ObjectsRecord,
  DiagnosticsRecord,
  PipelinesResponse,
  ObjectsResponse,
} from "./api_types";

// Pipeline names mapping
export const PIPELINE_NAMES: Record<string, string> = {
  "MT-01": "Магистраль Атырау-Самара",
  "MT-02": "Магистраль Актау-Актобе",
  "MT-03": "Магистраль Павлодар-Шымкент",
};

// === Pipeline Operations ===

export async function fetchAllPipelines(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const items = await pb.collection("pipelines").getFullList<PipelinesResponse>();
    for (const item of items) {
      map.set(item.name, item.id);
    }
  } catch {
    // Return empty map on error
  }
  return map;
}

export async function createPipeline(name: string): Promise<string | null> {
  try {
    const record = await pb.collection("pipelines").create({ name });
    return record.id;
  } catch {
    return null;
  }
}

export async function ensurePipelines(
  pipelineIds: string[]
): Promise<Map<string, string>> {
  const needed = new Set(pipelineIds.filter(Boolean));
  const map = await fetchAllPipelines();

  for (const pid of needed) {
    const name = PIPELINE_NAMES[pid] || pid;
    if (!map.has(name)) {
      const id = await createPipeline(name);
      if (id) {
        map.set(name, id);
        map.set(pid, id);
      }
    } else {
      map.set(pid, map.get(name)!);
    }
  }
  return map;
}

// === Object Operations ===

export async function fetchAllObjects(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const items = await pb.collection("objects").getFullList<ObjectsResponse>({
      fields: "id,object_id",
    });
    for (const item of items) {
      const num = Number(item.object_id);
      if (!isNaN(num)) {
        map.set(num, item.id);
      }
    }
  } catch {
    // Return empty map on error
  }
  return map;
}

export interface BatchResult {
  errors: number;
  ids: Map<number, string>;
}

export async function createObjectsBatch(
  records: Partial<ObjectsRecord>[]
): Promise<BatchResult> {
  const ids = new Map<number, string>();
  let errors = 0;

  const requests = records.map((body) => ({
    method: "POST" as const,
    url: "/api/collections/objects/records",
    body,
  }));

  try {
    const results = await pb.send("/api/batch", {
      method: "POST",
      body: { requests },
    });

    (results as { status: number; body: { id?: string } }[]).forEach((r, i) => {
      if (r.status >= 400) {
        errors++;
      } else if (r.body?.id) {
        ids.set(i, r.body.id);
      }
    });
  } catch {
    return { errors: records.length, ids };
  }

  return { errors, ids };
}

// === Diagnostic Operations ===

export async function createDiagnosticsBatch(
  records: Partial<DiagnosticsRecord>[]
): Promise<BatchResult> {
  const ids = new Map<number, string>();
  let errors = 0;

  const requests = records.map((body) => ({
    method: "POST" as const,
    url: "/api/collections/diagnostics/records",
    body,
  }));

  try {
    const results = await pb.send("/api/batch", {
      method: "POST",
      body: { requests },
    });

    (results as { status: number; body: { id?: string } }[]).forEach((r, i) => {
      if (r.status >= 400) {
        errors++;
      } else if (r.body?.id) {
        ids.set(i, r.body.id);
      }
    });
  } catch {
    return { errors: records.length, ids };
  }

  return { errors, ids };
}

