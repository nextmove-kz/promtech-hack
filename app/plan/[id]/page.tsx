'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Calendar,
  AlertTriangle,
  Gauge,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { OBJECT_TYPE_LABELS } from '@/lib/constants'
import { renderDiagnosticParams } from '@/lib/utils/diagnosticParams'
import {
  usePlanByObjectId,
  usePlan,
  useLatestDiagnostic,
  useUpdateActionStatus,
  useUpdatePlanStatus,
} from '@/hooks/usePlan'
import { PlanStatusOptions } from '@/app/api/api_types'
import Link from 'next/link'
import Image from 'next/image'

export default function PlanPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const objectId = params.id as string
  const planId = searchParams.get('planId')

  const {
    data: planByObject,
    isLoading: planLoading,
    error: planError,
  } = usePlanByObjectId(objectId)
  const {
    data: planById,
    isLoading: planByIdLoading,
    error: planByIdError,
  } = usePlan(planId)
  const { data: diagnostic, isLoading: diagnosticLoading } =
    useLatestDiagnostic(objectId)

  const updateActionMutation = useUpdateActionStatus()
  const updatePlanMutation = useUpdatePlanStatus()

  const [localActionStates, setLocalActionStates] = useState<
    Record<string, boolean>
  >({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleActionToggle = (actionId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    setLocalActionStates(prev => ({ ...prev, [actionId]: newStatus }))
    updateActionMutation.mutate({ actionId, status: newStatus })
  }

  const handleStatusChange = (status: PlanStatusOptions) => {
    if (!plan) return
    updatePlanMutation.mutate({ planId: plan.id, status })
  }

  const handleMarkAsDoneClick = () => {
    if (!plan) return

    const actions = plan.expand?.actions || []
    const allActionsCompleted = actions.every(
      action => localActionStates[action.id] ?? action.status
    )

    // If not all actions completed, show confirmation dialog
    if (!allActionsCompleted) {
      setShowConfirmDialog(true)
    } else {
      // All actions completed, proceed directly
      handleStatusChange(PlanStatusOptions.done)
    }
  }

  const confirmMarkAsDone = () => {
    handleStatusChange(PlanStatusOptions.done)
    setShowConfirmDialog(false)
  }

  const plan = planById ?? planByObject
  const isPlanLoading = planId ? planByIdLoading : planLoading
  const planLoadError = planId ? planByIdError : planError

  if (isPlanLoading) {
    return (
      <div className='flex h-screen items-center justify-center bg-background'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (planLoadError || !plan) {
    return (
      <div className='flex h-screen items-center justify-center bg-background p-4'>
        <div className='text-center'>
          <div className='text-lg font-semibold text-destructive mb-2'>
            План не найден для данного объекта
          </div>
          <Button onClick={() => router.push('/')} variant='outline' size='sm'>
            <ArrowLeft className='h-4 w-4 mr-2' />
            На главную
          </Button>
        </div>
      </div>
    )
  }

  const object = plan.expand?.object
  const actions = plan.expand?.actions || []
  const completedCount = actions.filter(
    a => localActionStates[a.id] ?? a.status
  ).length
  const totalCount = actions.length

  return (
    <div className='min-h-screen bg-background pb-24'>
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <div className='flex items-center gap-3 mb-2'>
              <div className='rounded-full bg-amber-100 p-2'>
                <AlertTriangle className='h-5 w-5 text-amber-600' />
              </div>
              <DialogTitle>Не все действия выполнены</DialogTitle>
            </div>
            <DialogDescription className='text-left'>
              Выполнено {completedCount} из {totalCount} действий. Вы уверены,
              что хотите отметить план как выполненный?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              onClick={() => setShowConfirmDialog(false)}
              disabled={updatePlanMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              onClick={confirmMarkAsDone}
              disabled={updatePlanMutation.isPending}
            >
              {updatePlanMutation.isPending ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Сохранение...
                </>
              ) : (
                'Да, завершить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className='sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur'>
        <div className='px-4 py-3'>
          <div className='flex items-center gap-3'>
            <div className='flex h-8 w-8 items-center justify-center rounded-md bg-primary'>
              <Gauge className='h-5 w-5 text-primary-foreground' />
            </div>
            <span className='text-lg font-semibold text-foreground'>
              IntegrityOS
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='px-4 py-6 space-y-6 max-w-2xl mx-auto'>
        {/* Problem Section */}
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <Link href='/plans'>
                <ArrowLeft className='h-6 w-6 mr-2' />
              </Link>
              <h1 className='text-2xl font-bold text-foreground'>План работ</h1>
            </div>
            <Badge
              variant={
                plan.status === PlanStatusOptions.done
                  ? 'default'
                  : plan.status === PlanStatusOptions.pending
                  ? 'secondary'
                  : 'outline'
              }
            >
              {plan.status === PlanStatusOptions.done
                ? 'Выполнено'
                : plan.status === PlanStatusOptions.pending
                ? 'В работе'
                : plan.status === PlanStatusOptions.created
                ? 'Новый'
                : 'Архив'}
            </Badge>
          </div>

          {plan.problem && (
            <div className='rounded-lg border border-border bg-muted/30 p-4'>
              <h2 className='text-sm font-medium text-muted-foreground mb-2'>
                Описание проблемы
              </h2>
              <p className='text-base text-foreground leading-relaxed'>
                {plan.problem}
              </p>
            </div>
          )}

          {object && (
            <div className='text-sm text-muted-foreground space-y-1.5'>
              <div className='font-medium text-foreground'>
                {object.name || 'Объект без имени'}
              </div>
              {object.type && (
                <div>
                  {OBJECT_TYPE_LABELS[
                    object.type as keyof typeof OBJECT_TYPE_LABELS
                  ] ||
                    object.type ||
                    'Неизвестный тип'}
                </div>
              )}
              {object.lat !== undefined && object.lon !== undefined && (
                <div className='flex flex-col gap-2 pt-1'>
                  <Button
                    asChild
                    size='default'
                    className='w-full justify-between bg-green-500 hover:bg-green-600 text-white py-6'
                  >
                    <Link
                      href={`https://2gis.kz/geo/${object.lon},${object.lat}?m=${object.lon},${object.lat}/17`}
                      target='_blank'
                      rel='noreferrer'
                    >
                      <Image
                        src='/2gis.svg'
                        alt='2ГИС'
                        width={72}
                        height={24}
                        className='h-6 w-auto'
                      />
                      <span className='text-xs text-black'>
                        {object.lon.toFixed(4)}, {object.lat.toFixed(4)}
                      </span>
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Object Diagnostics Section */}
        {diagnostic && (
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-foreground'>
              Данные диагностики
            </h3>

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
                <div className='space-y-1 space-x-2'>
                  <span className='text-xs text-muted-foreground'>
                    Дефект обнаружен
                  </span>
                  <Badge
                    variant={
                      diagnostic.defect_found ? 'destructive' : 'outline'
                    }
                    className='text-xs'
                  >
                    {diagnostic.defect_found ? 'Да' : 'Нет'}
                  </Badge>
                </div>
              )}
            </div>

            {(() => {
              const paramsContent = renderDiagnosticParams(
                diagnostic.method,
                diagnostic.param1,
                diagnostic.param2,
                diagnostic.param3
              )
              if (!paramsContent) return null

              return (
                <div className='space-y-2'>
                  <h4 className='text-sm font-medium text-foreground'>
                    Параметры диагностики
                  </h4>
                  <div className='space-y-1 rounded-md border border-border/70 bg-muted/30 p-3 text-sm leading-relaxed text-foreground'>
                    {paramsContent}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {diagnosticLoading && (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        )}

        <Separator />

        {/* Actions Checklist */}
        <div className='space-y-4'>
          <h3 className='text-lg font-semibold text-foreground'>
            Действия ({completedCount}/{totalCount})
          </h3>

          {actions.length === 0 ? (
            <div className='text-sm text-muted-foreground text-center py-8'>
              Нет действий в плане
            </div>
          ) : (
            <div className='space-y-3'>
              {actions.map(action => {
                const isChecked = localActionStates[action.id] ?? action.status
                return (
                  <button
                    type='button'
                    key={action.id}
                    onClick={() => handleActionToggle(action.id, isChecked)}
                    disabled={
                      updateActionMutation.isPending ||
                      plan.status === PlanStatusOptions.done ||
                      plan.status === PlanStatusOptions.archive ||
                      plan.status === PlanStatusOptions.created
                    }
                    className={cn(
                      'w-full flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-all hover:bg-accent/50',
                      isChecked && 'bg-muted/50'
                    )}
                  >
                    <div className='mt-0.5'>
                      {isChecked ? (
                        <CheckCircle2 className='h-5 w-5 text-primary' />
                      ) : (
                        <Circle className='h-5 w-5 text-muted-foreground' />
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isChecked
                            ? 'text-muted-foreground line-through'
                            : 'text-foreground'
                        )}
                      >
                        {action.description || 'Действие без описания'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className='fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur p-4'>
        <div className='max-w-2xl mx-auto flex gap-3'>
          {plan.status === PlanStatusOptions.created && (
            <Button
              onClick={() => handleStatusChange(PlanStatusOptions.pending)}
              disabled={updatePlanMutation.isPending}
              className='w-full'
              size='lg'
            >
              {updatePlanMutation.isPending ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Сохранение...
                </>
              ) : (
                'Взять в работу'
              )}
            </Button>
          )}

          {plan.status === PlanStatusOptions.pending && (
            <Button
              onClick={handleMarkAsDoneClick}
              disabled={updatePlanMutation.isPending}
              className='w-full'
              size='lg'
            >
              {updatePlanMutation.isPending ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Сохранение...
                </>
              ) : (
                'Завершить'
              )}
            </Button>
          )}

          {plan.status === PlanStatusOptions.done && (
            <>
              <Button
                onClick={() => handleStatusChange(PlanStatusOptions.pending)}
                disabled={updatePlanMutation.isPending}
                className='flex-1'
                variant='outline'
                size='lg'
              >
                Вернуть в работу
              </Button>
              <Button
                onClick={() => handleStatusChange(PlanStatusOptions.archive)}
                disabled={updatePlanMutation.isPending}
                className='flex-1'
                size='lg'
              >
                Архивировать
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
