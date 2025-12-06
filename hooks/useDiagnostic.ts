import { useQuery } from '@tanstack/react-query'
import { getAllDiagnosticsByObjectId, type DiagnosticWithObject } from '@/app/api/diagnostics'

export function useDiagnostic(objectId: string | null) {
  return useQuery<DiagnosticWithObject[]>({
    queryKey: ['diagnostics', objectId],
    queryFn: () => (objectId ? getAllDiagnosticsByObjectId(objectId) : []),
    enabled: !!objectId,
  })
}
