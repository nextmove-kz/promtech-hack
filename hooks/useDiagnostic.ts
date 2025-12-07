import { useQuery } from '@tanstack/react-query';
import {
  type DiagnosticWithObject,
  getAllDiagnosticsByObjectId,
} from '@/app/api/diagnostics';

export function useDiagnostic(objectId: string | null) {
  return useQuery<DiagnosticWithObject[]>({
    queryKey: ['diagnostics', objectId],
    queryFn: () => (objectId ? getAllDiagnosticsByObjectId(objectId) : []),
    enabled: !!objectId,
  });
}
