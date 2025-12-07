import { useInfiniteQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { type GetObjectsResult, getObjects } from '@/app/api/objects';
import { buildObjectsFilter } from '@/lib/utils/filters';
import { filterAtom } from '@/store/filterStore';
import { useDebounce } from './useDebounce';

interface UseInfiniteObjectsParams {
  perPage?: number;
  sort?: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export function useInfiniteObjects(params: UseInfiniteObjectsParams = {}) {
  const perPage = params.perPage ?? 20;
  const sort = params.sort;
  const bounds = params.bounds;
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
  const hasBounds = Boolean(bounds);
  const hasFilters =
    activeFilters.length > 0 ||
    hasAdvancedFilters ||
    debouncedSearchQuery.length > 0 ||
    hasBounds;

  const filter = useMemo(
    () =>
      hasFilters
        ? buildObjectsFilter({
            activeFilters,
            advanced,
            searchQuery: debouncedSearchQuery,
            bounds,
          })
        : undefined,
    [activeFilters, advanced, bounds, debouncedSearchQuery, hasFilters],
  );

  return useInfiniteQuery<GetObjectsResult>({
    queryKey: [
      'objects',
      'infinite',
      perPage,
      filter,
      sort ?? '',
      advanced.diagnosticMethod ?? '',
      bounds?.south ?? '',
      bounds?.west ?? '',
      bounds?.north ?? '',
      bounds?.east ?? '',
      hasActivePlan,
    ],
    queryFn: ({ pageParam }) =>
      getObjects({
        page: pageParam as number,
        perPage,
        filter,
        sort,
        diagnosticMethod: advanced.diagnosticMethod || undefined,
        hasActivePlan,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    placeholderData: (previousData) => previousData,
  });
}
