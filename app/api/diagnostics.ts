import clientPocketBase from './client_pb'
import type { DiagnosticsResponse, ObjectsResponse, PipelinesResponse } from './api_types'

export type DiagnosticWithObject = DiagnosticsResponse<{
  object?: ObjectsResponse<{
    pipeline?: PipelinesResponse
  }>
}>

export async function getDiagnosticByObjectId(
  objectId: string
): Promise<DiagnosticWithObject | null> {
  try {
    const record = await clientPocketBase
      .collection('diagnostics')
      .getFirstListItem<DiagnosticWithObject>(`object="${objectId}"`, {
        expand: 'object,object.pipeline'
      })
    return record
  } catch {
    return null
  }
}

export async function getAllDiagnosticsByObjectId(
  objectId: string
): Promise<DiagnosticWithObject[]> {
  try {
    const records = await clientPocketBase
      .collection('diagnostics')
      .getFullList<DiagnosticWithObject>({
        filter: `object="${objectId}"`,
        sort: 'date',
        expand: 'object,object.pipeline'
      })
    return records
  } catch {
    return []
  }
}
