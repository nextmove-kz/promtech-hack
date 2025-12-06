import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { getObjects, type GetObjectsResult } from '@/app/api/objects'
import { filterAtom } from '@/store/filterStore'
import { useDebounce } from './useDebounce'

interface UseObjectsParams {
  page?: number
  perPage?: number
}

export function useObjects(params: UseObjectsParams = {}) {
  const page = params.page ?? 1
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

  const pageToUse = page

  const query = useQuery<GetObjectsResult>({
    queryKey: ['objects', pageToUse, perPage, filter],
    queryFn: () => getObjects({ page: pageToUse, perPage, filter }),
    staleTime: 60000, // 1 minute cache for better performance
    refetchOnWindowFocus: false,
  })

  return query
}
