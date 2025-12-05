'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Download,
  AlertTriangle,
  Calendar,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDiagnostic } from '@/hooks/useDiagnostic'
import type { DiagnosticsMlLabelOptions } from '@/app/api/api_types'

interface DefectDetailsPanelProps {
  defectId: string | null
  onClose: () => void
}

const mapMlLabelToSeverity = (
  mlLabel?: DiagnosticsMlLabelOptions
): 'critical' | 'high' | 'medium' | 'low' => {
  switch (mlLabel) {
    case 'high':
      return 'critical'
    case 'medium':
      return 'medium'
    case 'normal':
    default:
      return 'low'
  }
}

const severityConfig = {
  critical: {
    label: 'Критический',
    variant: 'destructive' as const,
    color: 'text-risk-critical',
  },
  high: {
    label: 'Высокий',
    variant: 'destructive' as const,
    color: 'text-risk-high',
  },
  medium: {
    label: 'Средний',
    variant: 'secondary' as const,
    color: 'text-risk-medium',
  },
  low: { label: 'Низкий', variant: 'outline' as const, color: 'text-risk-low' },
}

export function DefectDetailsPanel({
  defectId,
  onClose,
}: DefectDetailsPanelProps) {
  const { data: diagnostic, isLoading, error } = useDiagnostic(defectId)

  if (!defectId) return null

  if (isLoading) {
    return (
      <div className='h-full w-1/4 shrink-0 border-l border-border bg-card overflow-hidden'>
        <div className='flex h-full items-center justify-center'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      </div>
    )
  }

  if (error || !diagnostic) {
    return (
      <div className='h-full w-1/4 shrink-0 border-l border-border bg-card overflow-hidden'>
        <div className='flex h-full items-center justify-center p-4'>
          <div className='text-center text-sm text-destructive'>
            Ошибка загрузки данных диагностики
          </div>
        </div>
      </div>
    )
  }

  const severityKey = mapMlLabelToSeverity(diagnostic.ml_label)
  const severity = severityConfig[severityKey]
  const hasDefect = diagnostic.defect_found ?? false
  const corrosionDepth = diagnostic.param1 ?? 0

  return (
    <div className='h-full w-1/4 shrink-0 border-l border-border bg-card overflow-hidden'>
      <div className='flex h-full flex-col'>
        {/* Header */}
        <div className='border-b border-border p-4'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onClose}
            className='mb-3 gap-1.5 -ml-2 text-muted-foreground hover:text-foreground'
          >
            <ArrowLeft className='h-4 w-4' />
            Назад к списку
          </Button>
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'rounded-md p-2',
                severityKey === 'critical' ? 'bg-risk-critical/20' : 'bg-muted'
              )}
            >
              <AlertTriangle className={cn('h-5 w-5', severity.color)} />
            </div>
            <div>
              <h2 className='font-semibold text-foreground'>{diagnostic.id}</h2>
              <Badge variant={severity.variant} className='mt-1'>
                {severity.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-auto p-4'>
          <div className='space-y-6'>
            {/* Defect Name & Description */}
            <div>
              <h3 className='text-lg font-medium text-foreground'>
                {diagnostic.method || 'Диагностика'}
              </h3>
              <p className='mt-1 text-sm text-muted-foreground'>
                {diagnostic.defect_description ||
                  (hasDefect ? 'Обнаружен дефект' : 'Дефекты не обнаружены')}
              </p>
            </div>

            {/* Parameters */}
            {corrosionDepth > 0 && (
              <Card className='border-border/50'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>
                    Параметр 1
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='flex items-end gap-2'>
                    <span
                      className={cn(
                        'text-3xl font-bold tabular-nums',
                        severity.color
                      )}
                    >
                      {corrosionDepth}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(corrosionDepth, 100)}
                    className='mt-2 h-2'
                  />
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Properties Grid */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 text-muted-foreground'>
                  <Calendar className='h-3.5 w-3.5' />
                  <span className='text-xs'>Дата диагностики</span>
                </div>
                <p className='font-medium text-foreground'>
                  {diagnostic.date
                    ? new Date(diagnostic.date).toLocaleDateString('ru-RU')
                    : '-'}
                </p>
              </div>
              <div className='space-y-1'>
                <span className='text-xs text-muted-foreground'>Метод</span>
                <p className='font-medium text-foreground'>
                  {diagnostic.method || '-'}
                </p>
              </div>
              {diagnostic.temperature !== undefined && (
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>
                    Температура
                  </span>
                  <p className='font-medium text-foreground'>
                    {diagnostic.temperature}°C
                  </p>
                </div>
              )}
              {diagnostic.humidity !== undefined && (
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>
                    Влажность
                  </span>
                  <p className='font-medium text-foreground'>
                    {diagnostic.humidity}%
                  </p>
                </div>
              )}
              {diagnostic.illumination !== undefined && (
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>
                    Освещенность
                  </span>
                  <p className='font-medium text-foreground'>
                    {diagnostic.illumination}
                  </p>
                </div>
              )}
              {diagnostic.quality_grade && (
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>
                    Оценка качества
                  </span>
                  <p className='font-medium text-foreground'>
                    {diagnostic.quality_grade}
                  </p>
                </div>
              )}
              {diagnostic.defect_found !== undefined && (
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>
                    Дефект обнаружен
                  </span>
                  <Badge
                    variant={hasDefect ? 'destructive' : 'outline'}
                    className='text-xs'
                  >
                    {hasDefect ? 'Да' : 'Нет'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className='border-t border-border p-4'>
          <Button className='w-full gap-2'>
            <Download className='h-4 w-4' />
            Экспорт отчета (PDF)
          </Button>
        </div>
      </div>
    </div>
  )
}
