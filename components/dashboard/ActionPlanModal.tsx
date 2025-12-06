'use client'

import { useState, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Download, AlertTriangle, Loader2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getHealthStyles } from '@/lib/objectHealthStyles'
import { generateActionPlanPdf } from '@/lib/pdf-generator'
import type {
  ObjectsHealthStatusOptions,
  DiagnosticsResponse,
} from '@/app/api/api_types'
import type {
  ActionPlanResponse,
  ActionPlanResult,
} from '@/app/api/action-plan/route'

interface ActionPlanModalProps {
  diagnosticId: string | null
  diagnostic?: DiagnosticsResponse<unknown>
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}
interface ActionPlanFieldProps {
  id: string
  label: string
  value: string
  minHeight?: string
  onChange: (value: string) => void
}

function ActionPlanField({
  id,
  label,
  value,
  minHeight = 'min-h-[80px]',
  onChange,
}: ActionPlanFieldProps) {
  return (
    <div className='grid w-full gap-1.5'>
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={minHeight}
      />
    </div>
  )
}

const healthStatusConfig = {
  OK: {
    label: 'Норма',
  },
  WARNING: {
    label: 'Предупреждение',
  },
  CRITICAL: {
    label: 'Критический',
  },
  UNKNOWN: {
    label: 'Неизвестно',
  },
}
const PLAN_FIELDS = [
  {
    id: 'problem_description',
    label: 'Описание проблемы',
    minHeight: 'min-h-[100px]',
  },
  {
    id: 'suggested_actions',
    label: 'Предлагаемые действия',
    minHeight: 'min-h-[120px]',
  },
  {
    id: 'expected_result',
    label: 'Планируемый результат',
    minHeight: 'min-h-[80px]',
  },
] as const

export function ActionPlanModal({
  diagnosticId,
  diagnostic,
  isOpen,
  onOpenChange,
}: ActionPlanModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [actionPlanData, setActionPlanData] =
    useState<ActionPlanResponse | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const generateActionPlan = useCallback(async () => {
    if (!diagnosticId) return

    setIsGenerating(true)
    setGenerationError(null)
    setActionPlanData(null)

    try {
      const response = await fetch('/api/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnostic_id: diagnosticId }),
      })

      const data: ActionPlanResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Ошибка генерации плана')
      }

      setActionPlanData(data)
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : 'Неизвестная ошибка'
      )
    } finally {
      setIsGenerating(false)
    }
  }, [diagnosticId])

  // Trigger generation when modal opens
  useEffect(() => {
    if (isOpen && diagnosticId && !actionPlanData && !isGenerating) {
      generateActionPlan()
    }
  }, [isOpen, diagnosticId, actionPlanData, isGenerating, generateActionPlan])

  const handleDownloadPdf = async () => {
    if (!actionPlanData?.result || !actionPlanData.object_data) return

    const pdfData = {
      object_data: {
        ...actionPlanData.object_data,
        last_diagnostic: diagnostic
          ? {
              date: diagnostic.date || '',
              method: diagnostic.method || '',
              params: {
                param1: diagnostic.param1,
                param2: diagnostic.param2,
                param3: diagnostic.param3,
              },
              ml_label: diagnostic.ml_label,
              quality_grade: diagnostic.quality_grade,
              temperature: diagnostic.temperature,
              illumination: diagnostic.illumination,
              defect_found: diagnostic.defect_found,
            }
          : undefined,
      },
      result: actionPlanData.result,
    }

    await generateActionPlanPdf(pdfData)
  }

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) {
      // Reset state when closing
      setActionPlanData(null)
      setGenerationError(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <FileText className='h-5 w-5' />
            План действий
          </DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className='flex flex-col items-center justify-center py-12 gap-4'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
            <p className='text-muted-foreground'>Генерация плана действий...</p>
          </div>
        ) : generationError ? (
          <div className='flex flex-col items-center justify-center py-12 gap-4'>
            <AlertTriangle className='h-10 w-10 text-destructive' />
            <p className='text-destructive'>{generationError}</p>
            <Button variant='outline' onClick={generateActionPlan}>
              Попробовать снова
            </Button>
          </div>
        ) : actionPlanData?.result && actionPlanData.object_data ? (
          <div className='flex-1 overflow-auto space-y-4'>
            {/* Object Info */}
            <div className='rounded-lg border border-border bg-muted/30 p-4'>
              <h4 className='text-sm font-medium text-muted-foreground mb-2'>
                Информация об объекте
              </h4>
              <div className='grid grid-cols-2 gap-3 text-sm'>
                <div>
                  <span className='text-muted-foreground'>Название:</span>
                  <p className='font-medium'>
                    {actionPlanData.object_data.name}
                  </p>
                </div>
                <div>
                  <span className='text-muted-foreground'>Тип:</span>
                  <p className='font-medium'>
                    {actionPlanData.object_data.type}
                  </p>
                </div>
                <div>
                  <span className='text-muted-foreground'>Трубопровод:</span>
                  <p className='font-medium'>
                    {actionPlanData.object_data.pipeline_name}
                  </p>
                </div>
                <div>
                  <span className='text-muted-foreground'>Статус:</span>
                  <div className='flex items-center gap-2'>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-xs',
                        getHealthStyles(
                          actionPlanData.object_data
                            .health_status as ObjectsHealthStatusOptions
                        ).badgeClass
                      )}
                    >
                      {healthStatusConfig[
                        actionPlanData.object_data
                          .health_status as keyof typeof healthStatusConfig
                      ]?.label || actionPlanData.object_data.health_status}
                    </Badge>
                    <span className='text-xs text-muted-foreground'>
                      ({actionPlanData.object_data.urgency_score}/100)
                    </span>
                  </div>
                </div>
              </div>
              {diagnostic && (
                <div className='mt-4 border-t border-border/50 pt-4'>
                  <h5 className='text-xs font-medium text-muted-foreground mb-2'>
                    Последняя диагностика
                  </h5>
                  <div className='grid grid-cols-2 gap-2 text-sm'>
                    <div>
                      <span className='text-muted-foreground text-xs'>
                        Дата:
                      </span>
                      <div className='font-medium'>
                        {diagnostic.date
                          ? new Date(diagnostic.date).toLocaleDateString(
                              'ru-RU'
                            )
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <span className='text-muted-foreground text-xs'>
                        Метод:
                      </span>
                      <div className='font-medium'>
                        {diagnostic.method || '-'}
                      </div>
                    </div>
                    {diagnostic.ml_label && (
                      <div>
                        <span className='text-muted-foreground text-xs'>
                          AI Анализ:
                        </span>
                        <div className='font-medium'>
                          {diagnostic.ml_label === 'normal'
                            ? 'Норма'
                            : diagnostic.ml_label === 'medium'
                            ? 'Средний риск'
                            : 'Высокий риск'}
                        </div>
                      </div>
                    )}
                    {diagnostic.quality_grade && (
                      <div>
                        <span className='text-muted-foreground text-xs'>
                          Оценка качества:
                        </span>
                        <div className='font-medium'>
                          {diagnostic.quality_grade}
                        </div>
                      </div>
                    )}
                    {diagnostic.temperature !== undefined && (
                      <div>
                        <span className='text-muted-foreground text-xs'>
                          Температура:
                        </span>
                        <div className='font-medium'>
                          {diagnostic.temperature}°C
                        </div>
                      </div>
                    )}
                    {diagnostic.illumination !== undefined && (
                      <div>
                        <span className='text-muted-foreground text-xs'>
                          Освещенность:
                        </span>
                        <div className='font-medium'>
                          {diagnostic.illumination}
                        </div>
                      </div>
                    )}
                    {diagnostic.defect_found !== undefined && (
                      <div className='col-span-2 mt-1'>
                        <span className='text-muted-foreground text-xs'>
                          Результат:
                        </span>
                        <div
                          className={cn(
                            'font-medium',
                            diagnostic.defect_found
                              ? 'text-destructive'
                              : 'text-emerald-600'
                          )}
                        >
                          {diagnostic.defect_found
                            ? 'Обнаружен дефект'
                            : 'Дефектов не обнаружено'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {PLAN_FIELDS.map(field => (
              <ActionPlanField
                key={field.id}
                id={field.id}
                label={field.label}
                value={
                  actionPlanData.result?.[field.id as keyof ActionPlanResult] ||
                  ''
                }
                minHeight={field.minHeight}
                onChange={value =>
                  setActionPlanData(prev =>
                    prev
                      ? {
                          ...prev,
                          result: {
                            ...prev.result!,
                            [field.id]: value,
                          },
                        }
                      : null
                  )
                }
              />
            ))}
          </div>
        ) : null}

        {actionPlanData?.result && !isGenerating && (
          <DialogFooter className='border-t border-border pt-4'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
            <Button onClick={handleDownloadPdf} className='gap-2'>
              <Download className='h-4 w-4' />
              Скачать PDF
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
