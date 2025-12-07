import clientPocketBase from './client_pb';
import type {
  PlanResponse,
  ActionResponse,
  ObjectsResponse,
  PlanStatusOptions,
} from './api_types';
import type { DiagnosticWithObject } from '@/lib/types/api';
import { withDerivedUrgencyScore } from '@/lib/utils/urgency';

export type { DiagnosticWithObject } from '@/lib/types/api';

export type PlanWithExpanded = PlanResponse<{
  actions?: ActionResponse[];
  object?: ObjectsResponse<{
    pipeline?: { name: string };
  }>;
}>;

const normalizePlanObject = (plan: PlanWithExpanded): PlanWithExpanded => {
  const normalizedObject = plan.expand?.object
    ? withDerivedUrgencyScore(plan.expand.object)
    : plan.expand?.object;

  return plan.expand
    ? {
        ...plan,
        expand: {
          ...plan.expand,
          object: normalizedObject,
        },
      }
    : plan;
};

/**
 * Get all plans with expanded relations
 * Returns every plan ever created
 */
export async function getAllPlans(): Promise<PlanWithExpanded[]> {
  const plans = await clientPocketBase
    .collection('plan')
    .getFullList<PlanWithExpanded>({
      expand: 'actions,object,object.pipeline',
      sort: '-created',
    });

  return plans.map(normalizePlanObject);
}

/**
 * Get a plan by object ID with expanded relations
 * Returns the most recent plan for the given object
 */
export async function getPlanByObjectId(
  objectId: string,
): Promise<PlanWithExpanded | null> {
  try {
    const result = await clientPocketBase
      .collection('plan')
      .getList<PlanWithExpanded>(1, 1, {
        filter: `object = "${objectId}"`,
        sort: '-created',
        expand: 'actions,object,object.pipeline',
      });

    const plan = result.items[0] || null;
    return plan ? normalizePlanObject(plan) : null;
  } catch (error) {
    console.error('Error fetching plan:', error);
    return null;
  }
}

/**
 * Get all plans for an object (history)
 */
export async function getPlanHistory(
  objectId: string,
): Promise<PlanWithExpanded[]> {
  const plans = await clientPocketBase
    .collection('plan')
    .getFullList<PlanWithExpanded>({
      filter: `object = "${objectId}"`,
      sort: '-updated',
      expand: 'actions,object,object.pipeline',
    });

  return plans;
}

/**
 * Get a plan by plan ID with expanded relations (for backward compatibility)
 */
export async function getPlan(id: string): Promise<PlanWithExpanded> {
  const plan = await clientPocketBase
    .collection('plan')
    .getOne<PlanWithExpanded>(id, {
      expand: 'actions,object,object.pipeline',
    });

  return normalizePlanObject(plan);
}

/**
 * Get the latest diagnostic for an object
 */
export async function getLatestDiagnostic(
  objectId: string,
): Promise<DiagnosticWithObject | null> {
  try {
    const result = await clientPocketBase
      .collection('diagnostics')
      .getList<DiagnosticWithObject>(1, 1, {
        filter: `object = "${objectId}"`,
        sort: '-date',
        expand: 'object',
      });

    const diagnostic = result.items[0] || null;
    if (!diagnostic) return null;

    const normalizedObject = diagnostic.expand?.object
      ? withDerivedUrgencyScore(diagnostic.expand.object)
      : diagnostic.expand?.object;

    return diagnostic.expand
      ? {
          ...diagnostic,
          expand: {
            ...diagnostic.expand,
            object: normalizedObject,
          },
        }
      : diagnostic;
  } catch (error) {
    console.error('Error fetching diagnostic:', error);
    return null;
  }
}

/**
 * Update an action's status
 */
export async function updateActionStatus(
  actionId: string,
  status: boolean,
): Promise<ActionResponse> {
  const action = await clientPocketBase
    .collection('action')
    .update<ActionResponse>(actionId, {
      status,
    });

  return action;
}

/**
 * Update a plan's status
 */
export async function updatePlanStatus(
  planId: string,
  status: PlanStatusOptions,
): Promise<PlanResponse> {
  const plan = await clientPocketBase
    .collection('plan')
    .update<PlanResponse>(planId, {
      status,
    });

  return plan;
}
