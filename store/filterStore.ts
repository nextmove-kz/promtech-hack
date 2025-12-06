import { atom } from 'jotai';
import type {
  DiagnosticsMethodOptions,
  ObjectsHealthStatusOptions,
  ObjectsTypeOptions,
} from '@/app/api/api_types';

export type FilterOptionId = 'defective' | 'critical' | 'recent';

export interface AdvancedFilterState {
  type?: ObjectsTypeOptions | '';
  diagnosticMethod?: DiagnosticsMethodOptions | '';
  healthStatus?: ObjectsHealthStatusOptions | '';
  material?: string;
  yearFrom?: number | '';
  yearTo?: number | '';
  pipeline?: string;
}

export interface FilterState {
  activeFilters: FilterOptionId[];
  advanced: AdvancedFilterState;
  searchQuery: string;
}

export const defaultAdvancedFilters: AdvancedFilterState = {
  type: '',
  diagnosticMethod: '',
  healthStatus: '',
  material: '',
  yearFrom: '',
  yearTo: '',
  pipeline: '',
};

export const defaultFilters: FilterState = {
  activeFilters: [],
  advanced: { ...defaultAdvancedFilters },
  searchQuery: '',
};

export const filterAtom = atom<FilterState>(defaultFilters);
