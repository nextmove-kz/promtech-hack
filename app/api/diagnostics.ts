import clientPocketBase from './client_pb'
import type { DiagnosticsResponse } from './api_types'

export async function getDiagnosticByObjectId(
  objectId: string
): Promise<DiagnosticsResponse | null> {
  try {
    const record = await clientPocketBase
      .collection('diagnostics')
      .getFirstListItem<DiagnosticsResponse>(`object="${objectId}"`)
    return record
  } catch {
    return null
  }
}
