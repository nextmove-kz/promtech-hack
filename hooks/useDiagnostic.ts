import { useQuery } from '@tanstack/react-query'
import { getDiagnosticByObjectId, type DiagnosticWithObject } from '@/app/api/diagnostics'

export function useDiagnostic(objectId: string | null) {
  return useQuery<DiagnosticWithObject | null>({
    queryKey: ['diagnostic', objectId],
    queryFn: () => (objectId ? getDiagnosticByObjectId(objectId) : null),
    enabled: !!objectId,
  })
}
