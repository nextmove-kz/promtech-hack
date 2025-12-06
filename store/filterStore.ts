import { atom } from 'jotai'
export type FilterOptionId = 'defective' | 'critical' | 'recent'

export interface FilterState {
  activeFilters: FilterOptionId[]
}

export const filterAtom = atom<FilterState>({ activeFilters: [] })
