import { useQuery } from '@tanstack/react-query'
import { getDiagnosticByObjectId } from '@/app/api/diagnostics'
import type { DiagnosticsResponse } from '@/app/api/api_types'

export function useDiagnostic(objectId: string | null) {
  return useQuery<DiagnosticsResponse | null>({
    queryKey: ['diagnostic', objectId],
    queryFn: () => (objectId ? getDiagnosticByObjectId(objectId) : null),
    enabled: !!objectId,
  })
}
