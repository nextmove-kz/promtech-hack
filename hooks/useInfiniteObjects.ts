import { useInfiniteQuery } from '@tanstack/react-query'
import { getObjects, type GetObjectsResult } from '@/app/api/objects'

interface UseInfiniteObjectsParams {
  perPage?: number
}

export function useInfiniteObjects(params: UseInfiniteObjectsParams = {}) {
  const perPage = params.perPage ?? 20

  return useInfiniteQuery<GetObjectsResult>({
    queryKey: ['objects', 'infinite', perPage],
    queryFn: ({ pageParam }) =>
      getObjects({ page: pageParam as number, perPage }),
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1
      }
      return undefined
    },
  })
}
