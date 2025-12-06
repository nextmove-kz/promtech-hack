import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { getObjects, type GetObjectsResult } from '@/app/api/objects'
import { filterAtom } from '@/store/filterStore'
import { useDebounce } from './useDebounce'

interface UseInfiniteObjectsParams {
  perPage?: number
  sort?: string
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
}

export function useInfiniteObjects(params: UseInfiniteObjectsParams = {}) {
  const perPage = params.perPage ?? 20
  const sort = params.sort
  const bounds = params.bounds
  const { activeFilters, advanced, searchQuery } = useAtomValue(filterAtom)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const recentSince = useMemo(() => {
    if (activeFilters.includes('recent') && typeof window !== 'undefined') {
      const now = new Date()
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    }
    return undefined
  }, [activeFilters])
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
  const hasBounds = Boolean(bounds)
  const hasFilters =
    activeFilters.length > 0 || hasAdvancedFilters || debouncedSearchQuery.length > 0 || hasBounds

  const filter = useMemo(() => {
    if (!hasFilters) return undefined
    const filters: string[] = []
    if (hasBounds && bounds) {
      filters.push(
        `lat >= ${bounds.south} && lat <= ${bounds.north} && lon >= ${bounds.west} && lon <= ${bounds.east}`
      )
    }
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
  }, [activeFilters, advanced, debouncedSearchQuery, hasFilters, hasBounds, bounds])

  return useInfiniteQuery<GetObjectsResult>({
    queryKey: [
      'objects',
      'infinite',
      perPage,
      filter,
      sort ?? '',
      advanced.diagnosticMethod ?? '',
      recentSince ?? '',
      bounds?.south ?? '',
      bounds?.west ?? '',
      bounds?.north ?? '',
      bounds?.east ?? '',
    ],
    queryFn: ({ pageParam }) =>
      getObjects({
        page: pageParam as number,
        perPage,
        filter,
        sort,
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
    placeholderData: previousData => previousData,
  })
}
