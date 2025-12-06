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
