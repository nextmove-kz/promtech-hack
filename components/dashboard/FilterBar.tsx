'use client'

import { useMemo, useState } from 'react'
import { Layers, Flame, Clock, X } from 'lucide-react'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import { useAtom } from 'jotai'
import { cn } from '@/lib/utils'
import type { FilterState, FilterOptionId } from '@/store/filterStore'
import {
  defaultAdvancedFilters,
  filterAtom,
} from '@/store/filterStore'
import {
  DiagnosticsMethodOptions,
  ObjectsHealthStatusOptions,
  ObjectsTypeOptions,
} from '@/app/api/api_types'

const MATERIAL_OPTIONS = ['Ст3', '09Г2С', '17Г1С', '13ХФА', '20А', '10Г2']
const PIPELINE_OPTIONS = [
  { value: 'gyb5o38bnf3t0hn', label: 'Магистраль Павлодар-Шымкент' },
  { value: 'vrm8bp99zwvnda3', label: 'Магистраль Актау-Актобе' },
  { value: 'fnhxk2x3j5mkawy', label: 'Магистраль Атырау-Самара' },
]

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void
}

const filterOptions: Array<{
  id: FilterOptionId
  label: string
  icon: typeof Flame
  helper?: string
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
    id: 'recent',
    label: 'Последние 7 дней',
    icon: Clock,
    helper: 'Объекты с обновлениями за неделю',
  },
]

export const FilterBar = ({ onFilterChange }: FilterBarProps) => {
  const [filters, setFilters] = useAtom(filterAtom)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const applyFilters = (next: FilterState) => {
    setFilters(next)
    onFilterChange?.(next)
  }

  const toggleFilter = (id: FilterOptionId) => {
    const isActive = filters.activeFilters.includes(id)
    const activeFilters = isActive
      ? filters.activeFilters.filter((f: FilterOptionId) => f !== id)
      : [...filters.activeFilters, id]
    applyFilters({ ...filters, activeFilters })
  }

  const updateAdvanced = <K extends keyof FilterState['advanced']>(
    key: K,
    value: FilterState['advanced'][K]
  ) => {
    const nextAdvanced = { ...filters.advanced, [key]: value }
    applyFilters({ ...filters, advanced: nextAdvanced })
  }

  const resetFilters = () => {
    applyFilters({ activeFilters: [], advanced: { ...defaultAdvancedFilters } })
  }

  const hasAdvancedFilters = useMemo(() => {
    const adv = filters.advanced
    return Boolean(
      adv.type ||
        adv.diagnosticMethod ||
        adv.healthStatus ||
        adv.material ||
        adv.pipeline ||
        adv.yearFrom ||
        adv.yearTo
    )
  }, [filters.advanced])

  const hasFilters = filters.activeFilters.length > 0 || hasAdvancedFilters

  const typeOptions = useMemo(() => Object.values(ObjectsTypeOptions), [])
  const diagnosticOptions = useMemo(
    () => Object.values(DiagnosticsMethodOptions),
    []
  )
  const healthOptions = useMemo(
    () => Object.values(ObjectsHealthStatusOptions),
    []
  )

  return (
    <div className='flex flex-col gap-3 border-b border-border bg-card px-4 py-3'>
      <div className='flex flex-col gap-3'>
        <div className='flex items-center gap-2 overflow-x-auto'>
          <span className='text-sm font-medium text-muted-foreground whitespace-nowrap'>
            Фильтры:
          </span>

          {filterOptions.map(option => {
            const Icon = option.icon
            const isActive = filters.activeFilters.includes(option.id)
            return (
              <button
                key={option.id}
                onClick={() => toggleFilter(option.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                  'border border-border hover:border-primary/50',
                  isActive
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background text-foreground hover:bg-accent'
                )}
                title={option.helper}
              >
                <Icon className='h-3.5 w-3.5' />
                <span>{option.label}</span>
              </button>
            )
          })}

          <div className='flex items-center gap-2 pl-2'>
            <div className='h-6 w-px bg-border' />
            <button
              onClick={() => setShowAdvanced(prev => !prev)}
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                'border border-border hover:border-primary/50',
                showAdvanced
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-background text-foreground hover:bg-accent'
              )}
              aria-expanded={showAdvanced}
            >
              <SlidersHorizontal className='h-3.5 w-3.5' />
              <span>Расширенные</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  showAdvanced ? 'rotate-180' : 'rotate-0'
                )}
              />
            </button>
          </div>

          {hasFilters && (
            <>
              <div className='h-6 w-px bg-border mx-2' />
              <button
                onClick={resetFilters}
                className='flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground'
              >
                <X className='h-3.5 w-3.5' />
                Очистить
              </button>
            </>
          )}
        </div>

        {showAdvanced && (
          <div className='rounded-lg border border-border bg-background/60 p-4'>
            <div className='grid gap-3 md:grid-cols-3'>
              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>
                  Тип
                </label>
                <select
                  className='h-9 rounded-md border border-border bg-card px-2 text-sm'
                  value={filters.advanced.type ?? ''}
                  onChange={e =>
                    updateAdvanced(
                      'type',
                      e.target.value as ObjectsTypeOptions | ''
                    )
                  }
                >
                  <option value=''>Любой</option>
                  {typeOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>
                  Метод диагностики
                </label>
                <select
                  className='h-9 rounded-md border border-border bg-card px-2 text-sm'
                  value={filters.advanced.diagnosticMethod ?? ''}
                  onChange={e =>
                    updateAdvanced(
                      'diagnosticMethod',
                      e.target.value as DiagnosticsMethodOptions | ''
                    )
                  }
                >
                  <option value=''>Любой</option>
                  {diagnosticOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>
                  Статус
                </label>
                <select
                  className='h-9 rounded-md border border-border bg-card px-2 text-sm'
                  value={filters.advanced.healthStatus ?? ''}
                  onChange={e =>
                    updateAdvanced(
                      'healthStatus',
                      e.target.value as ObjectsHealthStatusOptions | ''
                    )
                  }
                >
                  <option value=''>Любой</option>
                  {healthOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>
                  Материал
                </label>
                <select
                  className='h-9 rounded-md border border-border bg-card px-2 text-sm'
                  value={filters.advanced.material ?? ''}
                  onChange={e => updateAdvanced('material', e.target.value)}
                >
                  <option value=''>Любой</option>
                  {MATERIAL_OPTIONS.map(material => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </select>
              </div>

              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>
                  Год (от)
                </label>
                <input
                  type='number'
                  className='h-9 rounded-md border border-border bg-card px-3 text-sm'
                  placeholder='Мин.'
                  value={filters.advanced.yearFrom ?? ''}
                  onChange={e =>
                    updateAdvanced(
                      'yearFrom',
                      e.target.value ? Number(e.target.value) : ''
                    )
                  }
                />
              </div>

              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>
                  Год (до)
                </label>
                <input
                  type='number'
                  className='h-9 rounded-md border border-border bg-card px-3 text-sm'
                  placeholder='Макс.'
                  value={filters.advanced.yearTo ?? ''}
                  onChange={e =>
                    updateAdvanced(
                      'yearTo',
                      e.target.value ? Number(e.target.value) : ''
                    )
                  }
                />
              </div>

              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-muted-foreground'>
                  Трубопровод
                </label>
                <select
                  className='h-9 rounded-md border border-border bg-card px-2 text-sm'
                  value={filters.advanced.pipeline ?? ''}
                  onChange={e => updateAdvanced('pipeline', e.target.value)}
                >
                  <option value=''>Любой</option>
                  {PIPELINE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
