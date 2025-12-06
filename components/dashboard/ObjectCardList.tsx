'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Maximize2, Loader2, GitBranch } from 'lucide-react'
import { useObjects } from '@/hooks/useObjects'
import { cn } from '@/lib/utils'

interface ObjectCardListProps {
  onCardSelect: (id: string) => void
  onExpandTable: () => void
  selectedId: string | null
}

const objectTypeConfig: Record<
  string,
  { variant: 'destructive' | 'secondary' | 'outline'; label: string; color: string }
> = {
  crane: {
    variant: 'secondary',
    label: 'Кран',
    color: 'text-blue-600 dark:text-blue-400'
  },
  compressor: {
    variant: 'destructive',
    label: 'Компрессор',
    color: 'text-red-600 dark:text-red-400'
  },
  pipeline_section: {
    variant: 'outline',
    label: 'Участок',
    color: 'text-green-600 dark:text-green-400'
  },
}

const urgencyConfig = {
  high: {
    label: 'Высокий',
    color: 'text-risk-critical',
    bgColor: 'bg-risk-critical/10',
    dotColor: 'bg-risk-critical',
  },
  medium: {
    label: 'Средний',
    color: 'text-risk-medium',
    bgColor: 'bg-risk-medium/10',
    dotColor: 'bg-risk-medium',
  },
  low: {
    label: 'Низкий',
    color: 'text-risk-low',
    bgColor: 'bg-risk-low/10',
    dotColor: 'bg-risk-low',
  },
  none: {
    label: 'Нет данных',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    dotColor: 'bg-muted-foreground',
  },
}

type HealthStatus = 'OK' | 'WARNING' | 'CRITICAL'

const healthStatusConfig = {
  OK: {
    label: 'OK',
    borderColor: 'border-l-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    textColor: 'text-green-700 dark:text-green-400',
  },
  WARNING: {
    label: 'WARNING',
    borderColor: 'border-l-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  },
  CRITICAL: {
    label: 'CRITICAL',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    textColor: 'text-red-700 dark:text-red-400',
  },
}

/**
 * Calculates urgency score for an object.
 * TODO: Replace this placeholder with real diagnostic-based urgency calculation.
 * Urgency should be calculated from the most recent diagnostic's ml_label or quality_grade.
 */
function calculateUrgency(objectType?: string): keyof typeof urgencyConfig {
  if (!objectType) return 'none'
  // Temporary logic based on object type:
  if (objectType === 'compressor') return 'high'
  if (objectType === 'crane') return 'medium'
  return 'low'
}

/**
 * Calculates health status for an object.
 * TODO: Replace this placeholder with real diagnostic data.
 * Should be based on the most recent diagnostic's ml_label or quality_grade.
 * - ml_label "high" or quality_grade "недопустимо" → CRITICAL
 * - ml_label "medium" or quality_grade "требует_мер" → WARNING
 * - ml_label "normal" or quality_grade "удовлетворительно/допустимо" → OK
 */
function calculateHealthStatus(objectType?: string): HealthStatus {
  if (!objectType) return 'OK'
  // Temporary placeholder logic:
  // Compressors are critical infrastructure, so more likely to have issues
  if (objectType === 'compressor') return 'CRITICAL'
  if (objectType === 'crane') return 'WARNING'
  return 'OK'
}

export function ObjectCardList({
  onCardSelect,
  onExpandTable,
  selectedId,
}: ObjectCardListProps) {
  const { data, isLoading, error } = useObjects({ perPage: 50 })

  const objects = data?.items || []

  return (
    <div className='flex h-full w-1/4 shrink-0 flex-col border-l border-border bg-card'>
      <div className='flex items-center justify-between border-b border-border px-4 py-3 shrink-0'>
        <span className='text-sm font-medium text-foreground'>
          Объекты ({isLoading ? '...' : objects.length})
        </span>
        <Button
          variant='ghost'
          size='sm'
          onClick={onExpandTable}
          className='gap-1.5 text-muted-foreground'
        >
          <Maximize2 className='h-4 w-4' />
          Развернуть
        </Button>
      </div>

      <ScrollArea className='flex-1 overflow-hidden'>
        {isLoading ? (
          <div className='flex h-32 items-center justify-center'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        ) : error ? (
          <div className='p-4 text-center text-sm text-destructive'>
            Ошибка загрузки объектов
          </div>
        ) : objects.length === 0 ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            Нет объектов
          </div>
        ) : (
          <div className='space-y-2 p-3'>
            {objects.map(obj => {
              const typeConfig = objectTypeConfig[obj.object_type || 'pipeline_section']
              const urgency = calculateUrgency(obj.object_type)
              const urgencyStyle = urgencyConfig[urgency]
              const healthStatus = calculateHealthStatus(obj.object_type)
              const healthStyle = healthStatusConfig[healthStatus]
              const isSelected = selectedId === obj.id
              const pipelineName = obj.expand?.pipeline?.name || 'Не назначен'

              return (
                <button
                  key={obj.id}
                  onClick={() => onCardSelect(obj.id)}
                  className={cn(
                    'w-full rounded-lg border border-l-4 p-3 text-left transition-all',
                    healthStyle.borderColor,
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : cn(
                          'border-border hover:border-primary/50',
                          healthStyle.bgColor
                        )
                  )}
                >
                  {/* Row 1: Name and Type */}
                  <div className='flex items-start justify-between gap-2 mb-2.5'>
                    <div className='min-w-0 flex-1'>
                      <h4 className='truncate text-sm font-semibold text-foreground'>
                        {obj.object_name || 'Без названия'}
                      </h4>
                    </div>
                    <Badge
                      variant={typeConfig.variant}
                      className='shrink-0 text-xs font-medium'
                    >
                      {typeConfig.label}
                    </Badge>
                  </div>

                  {/* Row 2: Pipeline and Urgency */}
                  <div className='grid grid-cols-2 gap-2 text-xs'>
                    {/* Pipeline */}
                    <div className='flex items-center gap-1.5 min-w-0'>
                      <GitBranch className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                      <span className='truncate text-muted-foreground'>
                        {pipelineName}
                      </span>
                    </div>

                    {/* Urgency Score */}
                    <div className='flex items-center gap-1.5 justify-end'>
                      <div className='flex items-center gap-1.5'>
                        <div className={cn('h-2 w-2 rounded-full', urgencyStyle.dotColor)} />
                        <span className={cn('font-medium whitespace-nowrap', urgencyStyle.color)}>
                          {urgencyStyle.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
