'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import type { LatLngBounds } from 'leaflet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { filterAtom } from '@/store/filterStore';
import {
  type MapViewportBounds,
  mapViewportAtom,
} from '@/store/mapViewportStore';

const DEFAULT_CENTER: [number, number] = [48.0, 66.5];
const DEFAULT_ZOOM = 5;
const DEBOUNCE_MS = 400;

function toBounds(bounds: LatLngBounds): MapViewportBounds {
  const northEast = bounds.getNorthEast();
  const southWest = bounds.getSouthWest();

  return {
    north: northEast.lat,
    south: southWest.lat,
    east: northEast.lng,
    west: southWest.lng,
  };
}

/**
 * Keeps a debounced copy of the current viewport bounds in a jotai atom
 * and recenters the map to default when filters are cleared.
 */
export function MapViewportController() {
  const map = useMap();
  const setViewportBounds = useSetAtom(mapViewportAtom);
  const filters = useAtomValue(filterAtom);
  const prevHasFilters = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const hasAdvancedFilters = useMemo(() => {
    const adv = filters.advanced;
    return Boolean(
      adv.type ||
        adv.diagnosticMethod ||
        adv.healthStatus ||
        adv.material ||
        adv.pipeline ||
        adv.yearFrom ||
        adv.yearTo,
    );
  }, [filters.advanced]);

  const hasFilters = useMemo(
    () =>
      filters.activeFilters.length > 0 ||
      hasAdvancedFilters ||
      filters.searchQuery.length > 0,
    [
      filters.activeFilters.length,
      filters.searchQuery.length,
      hasAdvancedFilters,
    ],
  );

  const updateBounds = useCallback(() => {
    const bounds = map.getBounds();
    setViewportBounds(toBounds(bounds));
  }, [map, setViewportBounds]);

  const debouncedUpdate = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(updateBounds, DEBOUNCE_MS);
  }, [updateBounds]);

  useEffect(() => {
    const handleMove = () => {
      debouncedUpdate();
    };

    map.on('moveend', handleMove);
    map.on('zoomend', handleMove);

    // Initial set on mount
    debouncedUpdate();

    return () => {
      map.off('moveend', handleMove);
      map.off('zoomend', handleMove);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [debouncedUpdate, map]);

  useEffect(() => {
    if (!hasFilters && prevHasFilters.current) {
      // Recenter to default viewport when filters are cleared
      map.once('moveend', updateBounds);
      map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, {
        duration: 1.0,
        easeLinearity: 0.25,
      });
    }

    prevHasFilters.current = hasFilters;
  }, [hasFilters, map, updateBounds]);

  return null;
}
