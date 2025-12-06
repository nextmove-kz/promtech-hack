import clientPocketBase from './client_pb'
import type {
  DiagnosticsMethodOptions,
  ObjectsResponse,
  PipelinesResponse,
} from './api_types'

export interface GetObjectsParams {
  page?: number
  perPage?: number
  filter?: string
  sort?: string
  diagnosticMethod?: DiagnosticsMethodOptions
  recentSince?: string
}

export type ObjectWithPipeline = ObjectsResponse<{
  pipeline?: PipelinesResponse
}>

export interface GetObjectsResult {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  items: ObjectWithPipeline[]
}

export async function getObjects(
  params: GetObjectsParams = {}
): Promise<GetObjectsResult> {
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20
  const filter = params.filter
  const sort = params.sort
  const diagnosticMethod = params.diagnosticMethod
  const recentSince = params.recentSince

  let combinedFilter = filter

  if (diagnosticMethod || recentSince) {
    const diagFilters: string[] = []
    if (diagnosticMethod) {
      diagFilters.push(`method = "${diagnosticMethod}"`)
    }
    if (recentSince) {
      diagFilters.push(`date >= "${recentSince}"`)
    }

    const diagnostics = await clientPocketBase
      .collection('diagnostics')
      .getFullList<{ object?: string }>({
        fields: 'object',
        filter: diagFilters.join(' && '),
      })

    const objectIds = Array.from(
      new Set(
        diagnostics.map(d => d.object).filter((id): id is string => Boolean(id))
      )
    )

    if (objectIds.length === 0) {
      return {
        page,
        perPage,
        totalItems: 0,
        totalPages: 0,
        items: [],
      }
    }

    const diagClause = objectIds.map(id => `id = "${id}"`).join(' || ')
    combinedFilter = combinedFilter
      ? `(${combinedFilter}) && (${diagClause})`
      : diagClause
  }

  const result = await clientPocketBase
    .collection('objects')
    .getList<ObjectWithPipeline>(page, perPage, {
      expand: 'pipeline',
      filter: combinedFilter,
      sort,
    })

  return {
    page: result.page,
    perPage: result.perPage,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    items: result.items,
  }
}
