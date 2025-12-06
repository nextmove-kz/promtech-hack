'use client';

import { atom } from 'jotai';

export interface MapViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export const mapViewportAtom = atom<MapViewportBounds | null>(null);
