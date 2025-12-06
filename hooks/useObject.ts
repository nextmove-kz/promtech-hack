import { useQuery } from '@tanstack/react-query';
import { getObjectById, type ObjectWithPipeline } from '@/app/api/objects';

export function useObject(objectId: string | null) {
  return useQuery<ObjectWithPipeline | null>({
    queryKey: ['object', objectId],
    queryFn: () => (objectId ? getObjectById(objectId) : null),
    enabled: !!objectId,
    staleTime: 60000, // 1 minute cache to align with other queries
  });
}
