import clientPocketBase from './client_pb'
import type {
  PlanResponse,
  ActionResponse,
  ObjectsResponse,
  DiagnosticsResponse,
  PlanStatusOptions,
} from './api_types'

export type PlanWithExpanded = PlanResponse<{
  actions?: ActionResponse[]
  object?: ObjectsResponse<{
    pipeline?: { name: string }
  }>
}>

export type DiagnosticWithObject = DiagnosticsResponse<{
  object?: ObjectsResponse
}>

/**
 * Get a plan by object ID with expanded relations
 * Returns the most recent plan for the given object
 */
export async function getPlanByObjectId(
  objectId: string
): Promise<PlanWithExpanded | null> {
  try {
    const result = await clientPocketBase
      .collection('plan')
      .getList<PlanWithExpanded>(1, 1, {
        filter: `object = "${objectId}"`,
        sort: '-created',
        expand: 'actions,object,object.pipeline',
      })

    return result.items[0] || null
  } catch (error) {
    console.error('Error fetching plan:', error)
    return null
  }
}

/**
 * Get a plan by plan ID with expanded relations (for backward compatibility)
 */
export async function getPlan(id: string): Promise<PlanWithExpanded> {
  const plan = await clientPocketBase
    .collection('plan')
    .getOne<PlanWithExpanded>(id, {
      expand: 'actions,object,object.pipeline',
    })

  return plan
}

/**
 * Get the latest diagnostic for an object
 */
export async function getLatestDiagnostic(
  objectId: string
): Promise<DiagnosticWithObject | null> {
  try {
    const result = await clientPocketBase
      .collection('diagnostics')
      .getList<DiagnosticWithObject>(1, 1, {
        filter: `object = "${objectId}"`,
        sort: '-date',
        expand: 'object',
      })

    return result.items[0] || null
  } catch (error) {
    console.error('Error fetching diagnostic:', error)
    return null
  }
}

/**
 * Update an action's status
 */
export async function updateActionStatus(
  actionId: string,
  status: boolean
): Promise<ActionResponse> {
  const action = await clientPocketBase
    .collection('action')
    .update<ActionResponse>(actionId, {
      status,
    })

  return action
}

/**
 * Update a plan's status
 */
export async function updatePlanStatus(
  planId: string,
  status: PlanStatusOptions
): Promise<PlanResponse> {
  const plan = await clientPocketBase
    .collection('plan')
    .update<PlanResponse>(planId, {
      status,
    })

  return plan
}
