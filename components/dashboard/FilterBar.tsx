import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Clock,
  Flame,
  Layers,
  X,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type FilterPreset = 'all' | 'critical' | 'recent' | 'high-density' | 'custom'

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void
}

interface FilterState {
  preset: FilterPreset
  riskLevels: string[]
  dateRange: string | null
}

const presets = [
  {
    id: 'all' as const,
    label: 'Все дефекты',
    icon: Layers,
    count: 847,
  },
  {
    id: 'critical' as const,
    label: 'Критический',
    icon: Flame,
    count: 23,
    variant: 'destructive' as const,
  },
  {
    id: 'recent' as const,
    label: 'Последние 7 дней',
    icon: Clock,
    count: 156,
  },
  {
    id: 'high-density' as const,
    label: 'Зоны высокой плотности',
    icon: AlertTriangle,
    count: 45,
  },
]

const riskFilters = [
  { id: 'critical', label: 'Критический', color: 'bg-risk-critical' },
  { id: 'high', label: 'Высокий', color: 'bg-risk-high' },
  { id: 'medium', label: 'Средний', color: 'bg-risk-medium' },
  { id: 'low', label: 'Низкий', color: 'bg-risk-low' },
]

export const FilterBar = ({ onFilterChange }: FilterBarProps) => {
  const [activePreset, setActivePreset] = useState<FilterPreset>('all')
  const [selectedRisks, setSelectedRisks] = useState<string[]>([])
  const [showRiskDropdown, setShowRiskDropdown] = useState(false)

  const handlePresetClick = (preset: FilterPreset) => {
    setActivePreset(preset)
    setSelectedRisks([])
    onFilterChange?.({
      preset,
      riskLevels: [],
      dateRange: preset === 'recent' ? '7d' : null,
    })
  }

  const toggleRiskFilter = (riskId: string) => {
    const newRisks = selectedRisks.includes(riskId)
      ? selectedRisks.filter(r => r !== riskId)
      : [...selectedRisks, riskId]
    setSelectedRisks(newRisks)
    setActivePreset(newRisks.length > 0 ? 'custom' : 'all')
    onFilterChange?.({
      preset: newRisks.length > 0 ? 'custom' : 'all',
      riskLevels: newRisks,
      dateRange: null,
    })
  }

  const clearFilters = () => {
    setActivePreset('all')
    setSelectedRisks([])
    onFilterChange?.({
      preset: 'all',
      riskLevels: [],
      dateRange: null,
    })
  }

  return (
    <div className='flex flex-col gap-3 border-b border-border bg-card px-4 py-3'>
      {/* Quick Presets Row */}
      <div className='flex items-center gap-2 overflow-x-auto'>
        <span className='text-sm font-medium text-muted-foreground whitespace-nowrap'>
          Быстрые фильтры:
        </span>
        <div className='flex items-center gap-2'>
          {presets.map(preset => {
            const Icon = preset.icon
            const isActive = activePreset === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                  'border border-border hover:border-primary/50',
                  isActive
                    ? preset.variant === 'destructive'
                      ? 'bg-risk-critical/20 border-risk-critical text-risk-critical'
                      : 'bg-primary/10 border-primary text-primary'
                    : 'bg-background text-foreground hover:bg-accent'
                )}
              >
                <Icon className='h-3.5 w-3.5' />
                <span>{preset.label}</span>
                <Badge
                  variant='secondary'
                  className={cn(
                    'ml-1 h-5 min-w-[20px] px-1.5 text-xs',
                    isActive &&
                      preset.variant === 'destructive' &&
                      'bg-risk-critical/30 text-risk-critical'
                  )}
                >
                  {preset.count}
                </Badge>
              </button>
            )
          })}
        </div>

        {/* Separator */}
        <div className='h-6 w-px bg-border mx-2' />

        {/* Risk Level Filter */}
        <div className='relative'>
          <button
            onClick={() => setShowRiskDropdown(!showRiskDropdown)}
            className={cn(
              'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
              'border border-border hover:border-primary/50',
              selectedRisks.length > 0
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-background text-foreground hover:bg-accent'
            )}
          >
            <span>Уровень риска</span>
            {selectedRisks.length > 0 && (
              <Badge
                variant='secondary'
                className='h-5 min-w-[20px] px-1.5 text-xs'
              >
                {selectedRisks.length}
              </Badge>
            )}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                showRiskDropdown && 'rotate-180'
              )}
            />
          </button>

          {showRiskDropdown && (
            <div className='absolute top-full left-0 mt-2 z-50 min-w-[160px] rounded-lg border border-border bg-popover p-2 shadow-lg'>
              {riskFilters.map(risk => (
                <button
                  key={risk.id}
                  onClick={() => toggleRiskFilter(risk.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    'hover:bg-accent',
                    selectedRisks.includes(risk.id) && 'bg-accent'
                  )}
                >
                  <span
                    className={cn('h-2.5 w-2.5 rounded-full', risk.color)}
                  />
                  <span>{risk.label}</span>
                  {selectedRisks.includes(risk.id) && (
                    <span className='ml-auto text-primary'>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Filters Summary & Clear */}
        {(activePreset !== 'all' || selectedRisks.length > 0) && (
          <>
            <div className='h-6 w-px bg-border mx-2' />
            <Button
              variant='ghost'
              size='sm'
              onClick={clearFilters}
              className='gap-1.5 text-muted-foreground hover:text-foreground'
            >
              <X className='h-3.5 w-3.5' />
              Очистить фильтры
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
