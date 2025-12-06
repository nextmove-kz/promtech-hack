import { atom } from 'jotai'
export type FilterOptionId = 'defective' | 'critical' | 'recent'

export interface FilterState {
  activeFilters: FilterOptionId[]
  searchQuery: string
}

export const filterAtom = atom<FilterState>({
  activeFilters: [],
  searchQuery: ''
})
