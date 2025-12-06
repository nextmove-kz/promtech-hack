'use client';

import { useCallback, useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
  onIntersect: () => void;
  enabled?: boolean;
  rootMargin?: string;
  threshold?: number | number[];
}

/**
 * Provides scroll container + sentinel refs and wires IntersectionObserver
 * for infinite loading scenarios.
 */
export function useInfiniteScroll({
  onIntersect,
  enabled = true,
  rootMargin = '100px',
  threshold = 0,
}: UseInfiniteScrollOptions) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && enabled) {
        onIntersect();
      }
    },
    [onIntersect, enabled],
  );

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root || !enabled) return;

    const observer = new IntersectionObserver(handleObserver, {
      root,
      rootMargin,
      threshold,
    });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [enabled, handleObserver, rootMargin, threshold]);

  return { scrollContainerRef, loadMoreRef };
}
