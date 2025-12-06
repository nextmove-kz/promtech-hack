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
  const { activeFilters, advanced, searchQuery } = useAtomValue(filterAtom)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const recentSince = useMemo(() => {
    if (!activeFilters.includes('recent') || typeof window === 'undefined') {
      return undefined
    }
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - 30)
    return threshold.toISOString().split('T')[0]
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

  const pageToUse = page

  const query = useQuery<GetObjectsResult>({
    queryKey: [
      'objects',
      pageToUse,
      perPage,
      filter,
      advanced.diagnosticMethod ?? '',
      recentSince ?? '',
    ],
    queryFn: () =>
      getObjects({
        page: pageToUse,
        perPage,
        filter,
        diagnosticMethod: advanced.diagnosticMethod || undefined,
        recentSince,
      }),
    staleTime: 60000, // 1 minute cache for better performance
    refetchOnWindowFocus: false,
  })

  return query
}
