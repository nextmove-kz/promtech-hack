'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Flame,
  X,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ListChecks,
} from 'lucide-react';
import { useAtom } from 'jotai';
import { cn } from '@/lib/utils';
import type { FilterState, FilterOptionId } from '@/store/filterStore';
import { defaultAdvancedFilters, filterAtom } from '@/store/filterStore';
import {
  DiagnosticsMethodOptions,
  ObjectsHealthStatusOptions,
  ObjectsTypeOptions,
  type PipelinesResponse,
} from '@/app/api/api_types';
import clientPocketBase from '@/app/api/client_pb';

const MATERIAL_OPTIONS = ['Ст3', '09Г2С', '17Г1С', '13ХФА', '20А', '10Г2'];

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void;
}

const filterOptions: Array<{
  id: FilterOptionId;
  label: string;
  icon: typeof Flame;
  helper?: string;
}> = [
  {
    id: 'defective',
    label: 'Дефектные',
    icon: Layers,
    helper: 'Объекты с отмеченными дефектами',
  },
  {
    id: 'critical',
    label: 'Критический',
    icon: Flame,
    helper: 'Показывать объекты с критическим статусом',
  },
  {
    id: 'hasActivePlan',
    label: 'Есть активный план',
    icon: ListChecks,
    helper: 'Объекты с планом (кроме архива)',
  },
];

export const FilterBar = ({ onFilterChange }: FilterBarProps) => {
  const [filters, setFilters] = useAtom(filterAtom);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [yearError, setYearError] = useState<string | null>(null);

  const applyFilters = (next: FilterState) => {
    setFilters(next);
    onFilterChange?.(next);
  };

  const { data: pipelines, isLoading: pipelinesLoading } = useQuery<
    PipelinesResponse[]
  >({
    queryKey: ['pipelines'],
    queryFn: async () =>
      clientPocketBase.collection('pipelines').getFullList<PipelinesResponse>(),
    staleTime: Infinity,
  });

  const toggleFilter = (id: FilterOptionId) => {
    const isActive = filters.activeFilters.includes(id);
    const activeFilters = isActive
      ? filters.activeFilters.filter((f: FilterOptionId) => f !== id)
      : [...filters.activeFilters, id];
    applyFilters({ ...filters, activeFilters });
  };

  const updateAdvanced = <K extends keyof FilterState['advanced']>(
    key: K,
    value: FilterState['advanced'][K],
  ) => {
    const nextAdvanced = { ...filters.advanced, [key]: value };
    applyFilters({ ...filters, advanced: nextAdvanced });
  };

  const resetFilters = () => {
    applyFilters({
      activeFilters: [],
      advanced: { ...defaultAdvancedFilters },
      searchQuery: '',
    });
    setYearError(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyFilters({ ...filters, searchQuery: e.target.value });
  };

  const clearSearch = () => {
    applyFilters({ ...filters, searchQuery: '' });
  };

  const handleYearFromChange = (value: number | '') => {
    const nextTo = filters.advanced.yearTo;
    let yearTo = nextTo;
    const yearFrom = value;

    if (value && nextTo && value > nextTo) {
      yearTo = value;
      setYearError('Год "от" скорректирован, чтобы не превышать "до".');
    } else {
      setYearError(null);
    }

    applyFilters({
      ...filters,
      advanced: { ...filters.advanced, yearFrom, yearTo },
    });
  };

  const handleYearToChange = (value: number | '') => {
    const nextFrom = filters.advanced.yearFrom;
    let yearFrom = nextFrom;
    const yearTo = value;

    if (value && nextFrom && value < nextFrom) {
      yearFrom = value;
      setYearError('Год "до" скорректирован, чтобы не быть меньше "от".');
    } else {
      setYearError(null);
    }

    applyFilters({
      ...filters,
      advanced: { ...filters.advanced, yearFrom, yearTo },
    });
  };

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

  const hasFilters =
    filters.activeFilters.length > 0 ||
    hasAdvancedFilters ||
    filters.searchQuery.length > 0;

  const typeOptions = useMemo(() => Object.values(ObjectsTypeOptions), []);
  const diagnosticOptions = useMemo(
    () => Object.values(DiagnosticsMethodOptions),
    [],
  );
  const healthOptions = useMemo(
    () => Object.values(ObjectsHealthStatusOptions),
    [],
  );

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Фильтры:
            </span>

            {filterOptions.map((option) => {
              const Icon = option.icon;
              const isActive = filters.activeFilters.includes(option.id);
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => toggleFilter(option.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                    'border border-border hover:border-primary/50',
                    isActive
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-background text-foreground hover:bg-accent',
                  )}
                  title={option.helper}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{option.label}</span>
                </button>
              );
            })}

            <div className="flex items-center gap-2 pl-2">
              <div className="h-6 w-px bg-border" />
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                  'border border-border hover:border-primary/50',
                  showAdvanced
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background text-foreground hover:bg-accent',
                )}
                aria-expanded={showAdvanced}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Расширенные</span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    showAdvanced ? 'rotate-180' : 'rotate-0',
                  )}
                />
              </button>
            </div>

            {hasFilters && (
              <>
                <div className="h-6 w-px bg-border mx-2" />
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Очистить
                </button>
              </>
            )}
          </div>

          <div className="relative shrink-0 w-1/4">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={handleSearchChange}
              placeholder="Поиск по имени..."
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-8 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {showAdvanced && (
          <div className="rounded-lg border border-border bg-background/60 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="filter-type"
                >
                  Тип
                </label>
                <select
                  id="filter-type"
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                  value={filters.advanced.type ?? ''}
                  onChange={(e) =>
                    updateAdvanced(
                      'type',
                      e.target.value as ObjectsTypeOptions | '',
                    )
                  }
                >
                  <option value="">Любой</option>
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="filter-diagnostic"
                >
                  Метод диагностики
                </label>
                <select
                  id="filter-diagnostic"
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                  value={filters.advanced.diagnosticMethod ?? ''}
                  onChange={(e) =>
                    updateAdvanced(
                      'diagnosticMethod',
                      e.target.value as DiagnosticsMethodOptions | '',
                    )
                  }
                >
                  <option value="">Любой</option>
                  {diagnosticOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="filter-status"
                >
                  Статус
                </label>
                <select
                  id="filter-status"
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                  value={filters.advanced.healthStatus ?? ''}
                  onChange={(e) =>
                    updateAdvanced(
                      'healthStatus',
                      e.target.value as ObjectsHealthStatusOptions | '',
                    )
                  }
                >
                  <option value="">Любой</option>
                  {healthOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="filter-material"
                >
                  Материал
                </label>
                <select
                  id="filter-material"
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                  value={filters.advanced.material ?? ''}
                  onChange={(e) => updateAdvanced('material', e.target.value)}
                >
                  <option value="">Любой</option>
                  {MATERIAL_OPTIONS.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="filter-year-from"
                >
                  Год (от)
                </label>
                <input
                  id="filter-year-from"
                  type="number"
                  className="h-9 rounded-md border border-border bg-card px-3 text-sm"
                  placeholder="Мин."
                  value={filters.advanced.yearFrom ?? ''}
                  onChange={(e) =>
                    handleYearFromChange(
                      e.target.value ? Number(e.target.value) : '',
                    )
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="filter-year-to"
                >
                  Год (до)
                </label>
                <input
                  id="filter-year-to"
                  type="number"
                  className="h-9 rounded-md border border-border bg-card px-3 text-sm"
                  placeholder="Макс."
                  value={filters.advanced.yearTo ?? ''}
                  onChange={(e) =>
                    handleYearToChange(
                      e.target.value ? Number(e.target.value) : '',
                    )
                  }
                />
              </div>
              {yearError && (
                <div className="md:col-span-3 text-xs text-destructive">
                  {yearError}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="filter-pipeline"
                >
                  Трубопровод
                </label>
                <select
                  id="filter-pipeline"
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                  value={filters.advanced.pipeline ?? ''}
                  onChange={(e) => updateAdvanced('pipeline', e.target.value)}
                  disabled={pipelinesLoading}
                >
                  <option value="">Любой</option>
                  {pipelinesLoading && (
                    <option value="" disabled>
                      Загрузка...
                    </option>
                  )}
                  {pipelines?.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
