import { type NextRequest, NextResponse } from 'next/server';
import { pocketbase } from '../pocketbase';
import type { PlanResponse, ObjectsResponse } from '../api_types';

type ReanalysisCandidate = {
  object_id: string;
  object_name: string;
  plan_id: string;
  plan_updated: string;
  object_last_analysis_at?: string;
  object_updated?: string;
};

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const pb = await pocketbase();

    const plans = await pb.collection('plan').getFullList<
      PlanResponse<{ object?: ObjectsResponse }>
    >({
      filter: 'status="done"',
      sort: '-updated',
      expand: 'object',
    });

    const candidates = new Map<string, ReanalysisCandidate & { ts: number }>();

    for (const plan of plans) {
      const object = plan.expand?.object;
      if (!object) continue;

      const planTs = new Date(plan.updated || 0).getTime();
      const lastAnalysisTs = object.last_analysis_at
        ? new Date(object.last_analysis_at).getTime()
        : 0;
      const objectUpdatedTs = object.updated
        ? new Date(object.updated).getTime()
        : 0;

      // Need re-evaluation only if plan was finished after the last analysis/update
      const needsReeval =
        planTs > Math.max(lastAnalysisTs || 0, objectUpdatedTs || 0, 0);
      if (!needsReeval) continue;

      const existing = candidates.get(object.id);
      if (!existing || planTs > existing.ts) {
        candidates.set(object.id, {
          object_id: object.id,
          object_name: object.name || 'Без названия',
          plan_id: plan.id,
          plan_updated: plan.updated,
          object_last_analysis_at: object.last_analysis_at,
          object_updated: object.updated,
          ts: planTs,
        });
      }
    }

    return NextResponse.json({
      success: true,
      items: Array.from(candidates.values()).map(
        ({ ts, ...rest }): ReanalysisCandidate => rest,
      ),
    });
  } catch (error) {
    console.error('Failed to fetch reanalysis candidates:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown server error occurred',
      },
      { status: 500 },
    );
  }
}

