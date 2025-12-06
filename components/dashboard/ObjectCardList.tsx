'use client';

import { Button } from '@/components/ui/button';
import { Maximize2, Loader2, ArrowDownUp } from 'lucide-react';
import { useInfiniteObjects } from '@/hooks/useInfiniteObjects';
import { ObjectCard } from './ObjectCard';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { cn } from '@/lib/utils';
import { mapViewportAtom } from '@/store/mapViewportStore';
import { filterAtom } from '@/store/filterStore';

interface ObjectCardListProps {
  onCardSelect: (id: string) => void;
  onExpandTable: () => void;
  selectedId: string | null;
}

type SortState = 'desc' | 'asc' | 'neutral';

export function ObjectCardList({
  onCardSelect,
  onExpandTable,
  selectedId,
}: ObjectCardListProps) {
  const [sortState, setSortState] = useState<SortState>('desc');
  const filters = useAtomValue(filterAtom);
  const viewportBounds = useAtomValue(mapViewportAtom);
  const nonBoundsSignature = useMemo(
    () =>
      JSON.stringify({
        active: filters.activeFilters,
        advanced: filters.advanced,
        search: filters.searchQuery,
        sort: sortState,
      }),
    [filters.activeFilters, filters.advanced, filters.searchQuery, sortState],
  );
  const boundsSignature = useMemo(() => {
    if (!viewportBounds) return 'no-bounds';
    return `${viewportBounds.south}:${viewportBounds.west}:${viewportBounds.north}:${viewportBounds.east}`;
  }, [viewportBounds]);
  const prevNonBoundsRef = useRef<string | null>(null);
  const prevBoundsRef = useRef<string | null>(null);
  const [lastChange, setLastChange] = useState<
    'initial' | 'nonBounds' | 'bounds'
  >('initial');

  useEffect(() => {
    const prevNonBounds = prevNonBoundsRef.current;
    const prevBounds = prevBoundsRef.current;

    const nonBoundsChanged =
      prevNonBounds !== null && prevNonBounds !== nonBoundsSignature;
    const boundsChanged = prevBounds !== null && prevBounds !== boundsSignature;

    if (nonBoundsChanged) {
      setLastChange('nonBounds');
    } else if (boundsChanged) {
      setLastChange('bounds');
    }

    prevNonBoundsRef.current = nonBoundsSignature;
    prevBoundsRef.current = boundsSignature;
  }, [nonBoundsSignature, boundsSignature]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    isFetching,
  } = useInfiniteObjects({
    perPage: 20,
    sort:
      sortState === 'desc'
        ? '-urgency_score'
        : sortState === 'asc'
          ? '+urgency_score'
          : '-updated',
    bounds: viewportBounds || undefined,
  });

  const { scrollContainerRef, loadMoreRef } = useInfiniteScroll({
    onIntersect: fetchNextPage,
    enabled: hasNextPage && !isFetchingNextPage,
    rootMargin: '100px',
    threshold: 0,
  });

  const allObjects = data?.pages.flatMap((page) => page.items) ?? [];
  const totalItems = data?.pages[0]?.totalItems ?? 0;
  const hasInitialData = allObjects.length > 0;
  const shouldShowPrimaryLoader =
    (!hasInitialData && isLoading) ||
    (isFetching && lastChange === 'nonBounds' && !isFetchingNextPage);

  return (
    <div className="flex h-full w-1/4 shrink-0 flex-col border-l border-border bg-card overflow-hidden">
      <div className="flex items-center border-b border-border px-4 py-3 justify-between">
        <span className="text-sm font-medium text-foreground">
          Объекты ({totalItems})
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-transparent"
            onClick={() =>
              setSortState((prev) => {
                if (prev === 'desc') return 'asc';
                if (prev === 'asc') return 'neutral';
                return 'desc';
              })
            }
            title={
              sortState === 'desc'
                ? 'Сначала срочные'
                : sortState === 'asc'
                  ? 'Сначала менее срочные'
                  : 'По дате обновления'
            }
          >
            <ArrowDownUp
              className={cn(
                'h-4 w-4 transition-colors duration-200',
                sortState === 'desc' && 'text-red-500',
                sortState === 'asc' && 'text-green-500',
                sortState === 'neutral' && 'text-gray-500',
              )}
            />
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpandTable}
              className="gap-1.5 text-muted-foreground"
            >
              <Maximize2 className="h-4 w-4" />
              Развернуть
            </Button>
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-3">
          {shouldShowPrimaryLoader && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {isError && (
            <div className="py-8 text-center text-sm text-destructive">
              Ошибка загрузки данных
            </div>
          )}
          {!shouldShowPrimaryLoader && !isError && allObjects.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Нет объектов
            </div>
          )}

          {allObjects.map((obj) => (
            <ObjectCard
              key={obj.id}
              object={obj}
              isSelected={selectedId === obj.id}
              onSelect={onCardSelect}
            />
          ))}

          <div ref={loadMoreRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!hasNextPage && allObjects.length > 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Все объекты загружены
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
