import clientPocketBase from './client_pb'
import type { ObjectsResponse } from './api_types'

export interface GetObjectsParams {
  page?: number
  perPage?: number
}

export interface GetObjectsResult {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  items: ObjectsResponse[]
}

export async function getObjects(
  params: GetObjectsParams = {}
): Promise<GetObjectsResult> {
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20

  const result = await clientPocketBase
    .collection('objects')
    .getList<ObjectsResponse>(page, perPage)

  return {
    page: result.page,
    perPage: result.perPage,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    items: result.items,
  }
}
