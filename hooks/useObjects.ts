import { useQuery } from '@tanstack/react-query'
import { getObjects, type GetObjectsResult } from '@/app/api/objects'

interface UseObjectsParams {
  page?: number
  perPage?: number
}

export function useObjects(params: UseObjectsParams = {}) {
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20

  return useQuery<GetObjectsResult>({
    queryKey: ['objects', page, perPage],
    queryFn: () => getObjects({ page, perPage }),
    staleTime: 0, // Always consider data stale for real-time updates
    refetchOnWindowFocus: false,
  })
}
