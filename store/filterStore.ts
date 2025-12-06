import { atom } from 'jotai'
import {
  DiagnosticsMethodOptions,
  ObjectsHealthStatusOptions,
  ObjectsTypeOptions,
} from '@/app/api/api_types'

export type FilterOptionId = 'defective' | 'critical' | 'recent'

export interface AdvancedFilterState {
  type?: ObjectsTypeOptions | ''
  diagnosticMethod?: DiagnosticsMethodOptions | ''
  healthStatus?: ObjectsHealthStatusOptions | ''
  material?: string
  yearFrom?: number | ''
  yearTo?: number | ''
  pipeline?: string
}

export interface FilterState {
  activeFilters: FilterOptionId[]
  advanced: AdvancedFilterState
}

export const defaultAdvancedFilters: AdvancedFilterState = {
  type: '',
  diagnosticMethod: '',
  healthStatus: '',
  material: '',
  yearFrom: '',
  yearTo: '',
  pipeline: '',
}

export const defaultFilters: FilterState = {
  activeFilters: [],
  advanced: { ...defaultAdvancedFilters },
}

export const filterAtom = atom<FilterState>(defaultFilters)
