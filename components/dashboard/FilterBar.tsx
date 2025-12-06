import { Layers, Flame, Clock, X } from 'lucide-react'
import { useAtom } from 'jotai'
import { cn } from '@/lib/utils'
import type { FilterState, FilterOptionId } from '@/store/filterStore'
import { filterAtom } from '@/store/filterStore'

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

  const resetFilters = () => {
    applyFilters({ activeFilters: [] })
  }

  const hasFilters = filters.activeFilters.length > 0

  return (
    <div className='flex flex-col gap-3 border-b border-border bg-card px-4 py-3'>
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
    </div>
  )
}
