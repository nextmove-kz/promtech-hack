import clientPocketBase from './client_pb';
import type {
  DiagnosticsMethodOptions,
  ObjectsResponse,
  PipelinesResponse,
} from './api_types';
import { withDerivedUrgencyScore } from '@/lib/utils/urgency';

export interface GetObjectsParams {
  page?: number;
  perPage?: number;
  filter?: string;
  sort?: string;
  diagnosticMethod?: DiagnosticsMethodOptions;
  hasActivePlan?: boolean;
}

export type ObjectWithPipeline = ObjectsResponse<{
  pipeline?: PipelinesResponse;
}>;

export interface GetObjectsResult {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: ObjectWithPipeline[];
}

export async function getObjects(
  params: GetObjectsParams = {},
): Promise<GetObjectsResult> {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 20;
  const filter = params.filter;
  const sort = params.sort ?? '-updated';
  const diagnosticMethod = params.diagnosticMethod;
  const hasActivePlan = params.hasActivePlan;

  let combinedFilter = filter;

  if (hasActivePlan) {
    const plans = await clientPocketBase.collection('plan').getFullList<{
      object?: string;
    }>({
      fields: 'object',
      filter: 'status != "archive"',
    });

    const planObjectIds = Array.from(
      new Set(
        plans
          .map((plan) => plan.object)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (planObjectIds.length === 0) {
      return {
        page,
        perPage,
        totalItems: 0,
        totalPages: 0,
        items: [],
      };
    }

    const planClause = planObjectIds.map((id) => `id = "${id}"`).join(' || ');

    combinedFilter = combinedFilter
      ? `(${combinedFilter}) && (${planClause})`
      : planClause;
  }

  if (diagnosticMethod) {
    const diagFilters: string[] = [];
    if (diagnosticMethod) {
      diagFilters.push(`method = "${diagnosticMethod}"`);
    }

    const diagnostics = await clientPocketBase
      .collection('diagnostics')
      .getFullList<{ object?: string }>({
        fields: 'object',
        filter: diagFilters.join(' && '),
      });

    const objectIds = Array.from(
      new Set(
        diagnostics
          .map((d) => d.object)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (objectIds.length === 0) {
      return {
        page,
        perPage,
        totalItems: 0,
        totalPages: 0,
        items: [],
      };
    }

    const diagClause = objectIds.map((id) => `id = "${id}"`).join(' || ');
    combinedFilter = combinedFilter
      ? `(${combinedFilter}) && (${diagClause})`
      : diagClause;
  }

  const result = await clientPocketBase
    .collection('objects')
    .getList<ObjectWithPipeline>(page, perPage, {
      expand: 'pipeline',
      filter: combinedFilter,
      sort,
    });

  const normalizedItems = result.items.map((item) =>
    withDerivedUrgencyScore(item),
  );

  return {
    page: result.page,
    perPage: result.perPage,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    items: normalizedItems,
  };
}

export async function getObjectById(
  objectId: string,
): Promise<ObjectWithPipeline | null> {
  try {
    const record = await clientPocketBase
      .collection('objects')
      .getOne<ObjectWithPipeline>(objectId, {
        expand: 'pipeline',
      });

    return withDerivedUrgencyScore(record);
  } catch {
    return null;
  }
}
