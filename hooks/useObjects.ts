import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { type GetObjectsResult, getObjects } from '@/app/api/objects';
import { buildObjectsFilter } from '@/lib/utils/filters';
import { filterAtom } from '@/store/filterStore';
import { useDebounce } from './useDebounce';

interface UseObjectsParams {
  page?: number;
  perPage?: number;
}

export function useObjects(params: UseObjectsParams = {}) {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 20;
  const { activeFilters, advanced, searchQuery } = useAtomValue(filterAtom);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const hasActivePlan = activeFilters.includes('hasActivePlan');

  const hasAdvancedFilters = useMemo(
    () =>
      Boolean(
        advanced.type ||
          advanced.diagnosticMethod ||
          advanced.healthStatus ||
          advanced.material ||
          advanced.pipeline ||
          advanced.yearFrom ||
          advanced.yearTo,
      ),
    [advanced],
  );

  const hasFilters =
    activeFilters.length > 0 ||
    hasAdvancedFilters ||
    debouncedSearchQuery.length > 0;

  const filter = useMemo(
    () =>
      hasFilters
        ? buildObjectsFilter({
            activeFilters,
            advanced,
            searchQuery: debouncedSearchQuery,
          })
        : undefined,
    [activeFilters, advanced, debouncedSearchQuery, hasFilters],
  );

  const pageToUse = page;

  const query = useQuery<GetObjectsResult>({
    queryKey: [
      'objects',
      pageToUse,
      perPage,
      filter,
      advanced.diagnosticMethod ?? '',
      hasActivePlan,
    ],
    queryFn: () =>
      getObjects({
        page: pageToUse,
        perPage,
        filter,
        diagnosticMethod: advanced.diagnosticMethod || undefined,
        hasActivePlan,
      }),
    staleTime: 60000, // 1 minute cache for better performance
    refetchOnWindowFocus: false,
  });

  return query;
}
