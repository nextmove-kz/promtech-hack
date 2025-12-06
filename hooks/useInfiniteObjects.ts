import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { getObjects, type GetObjectsResult } from '@/app/api/objects'
import { filterAtom } from '@/store/filterStore'
import { useDebounce } from './useDebounce'

interface UseInfiniteObjectsParams {
  perPage?: number
}

export function useInfiniteObjects(params: UseInfiniteObjectsParams = {}) {
  const perPage = params.perPage ?? 20
  const { activeFilters, searchQuery } = useAtomValue(filterAtom)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const hasFilters = activeFilters.length > 0 || debouncedSearchQuery.length > 0

  const filter = useMemo(() => {
    if (!hasFilters) return undefined
    const filters: string[] = []
    if (activeFilters.includes('critical')) {
      filters.push(`health_status = "CRITICAL"`)
    }
    if (activeFilters.includes('defective')) {
      filters.push(`has_defects = true`)
    }
    if (activeFilters.includes('recent')) {
      filters.push(`last_analysis_at > "2022-01-01"`)
    }
    if (debouncedSearchQuery) {
      filters.push(`name ~ "${debouncedSearchQuery}"`)
    }
    return filters.join(' && ')
  }, [activeFilters, debouncedSearchQuery, hasFilters])

  return useInfiniteQuery<GetObjectsResult>({
    queryKey: ['objects', 'infinite', perPage, filter],
    queryFn: ({ pageParam }) =>
      getObjects({ page: pageParam as number, perPage, filter }),
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1
      }
      return undefined
    },
  })
}
