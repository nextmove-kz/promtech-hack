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
  const { activeFilters, advanced, searchQuery } = useAtomValue(filterAtom)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const recentSince =
    activeFilters.includes('recent') && typeof window !== 'undefined'
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      : undefined
  const hasAdvancedFilters = useMemo(
    () =>
      Boolean(
        advanced.type ||
          advanced.diagnosticMethod ||
          advanced.healthStatus ||
          advanced.material ||
          advanced.pipeline ||
          advanced.yearFrom ||
          advanced.yearTo
      ),
    [advanced]
  )
  const hasFilters = activeFilters.length > 0 || hasAdvancedFilters || debouncedSearchQuery.length > 0

  const filter = useMemo(() => {
    if (!hasFilters) return undefined
    const filters: string[] = []
    if (activeFilters.includes('critical')) {
      filters.push(`health_status = "CRITICAL"`)
    }
    if (activeFilters.includes('defective')) {
      filters.push(`has_defects = true`)
    }
    if (advanced.type) {
      filters.push(`type = "${advanced.type}"`)
    }
    if (advanced.healthStatus) {
      filters.push(`health_status = "${advanced.healthStatus}"`)
    }
    if (advanced.material) {
      const value = advanced.material.replace(/"/g, '\\"')
      filters.push(`material = "${value}"`)
    }
    if (advanced.yearFrom) {
      filters.push(`year >= ${advanced.yearFrom}`)
    }
    if (advanced.yearTo) {
      filters.push(`year <= ${advanced.yearTo}`)
    }
    if (advanced.pipeline) {
      const value = advanced.pipeline.replace(/"/g, '\\"')
      filters.push(`pipeline = "${value}"`)
    }
    if (debouncedSearchQuery) {
      filters.push(`name ~ "${debouncedSearchQuery}"`)
    }
    return filters.join(' && ')
  }, [activeFilters, advanced, debouncedSearchQuery, hasFilters])

  return useInfiniteQuery<GetObjectsResult>({
    queryKey: [
      'objects',
      'infinite',
      perPage,
      filter,
      advanced.diagnosticMethod ?? '',
      recentSince ?? '',
    ],
    queryFn: ({ pageParam }) =>
      getObjects({
        page: pageParam as number,
        perPage,
        filter,
        diagnosticMethod: advanced.diagnosticMethod || undefined,
        recentSince,
      }),
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1
      }
      return undefined
    },
  })
}
