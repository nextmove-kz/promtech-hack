import clientPocketBase from './client_pb'
import type { ObjectsResponse, PipelinesResponse } from './api_types'

export interface GetObjectsParams {
  page?: number
  perPage?: number
  filter?: string
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

  const result = await clientPocketBase
    .collection('objects')
    .getList<ObjectWithPipeline>(page, perPage, {
      expand: 'pipeline',
      filter,
    })

  return {
    page: result.page,
    perPage: result.perPage,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    items: result.items,
  }
}
