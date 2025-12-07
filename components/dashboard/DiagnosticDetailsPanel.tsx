'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HEALTH_STATUS_CONFIG, OBJECT_TYPE_LABELS } from '@/lib/constants';
import { renderDiagnosticParams } from '@/lib/utils/diagnosticParams';
import { useDiagnostic } from '@/hooks/useDiagnostic';
import { useObject } from '@/hooks/useObject';
import { usePlanByObjectId, usePlanHistory } from '@/hooks/usePlan';
import { ActionPlanModal } from './ActionPlanModal';
import { useRouter } from 'next/navigation';
import { PlanStatusOptions } from '@/app/api/api_types';

interface DiagnosticDetailsPanelProps {
  objectId: string | null;
  onClose: () => void;
}

const planStatusConfig: Record<
  PlanStatusOptions | 'unknown',
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  [PlanStatusOptions.done]: { label: 'Выполнен', variant: 'default' },
  [PlanStatusOptions.pending]: { label: 'В работе', variant: 'secondary' },
  [PlanStatusOptions.created]: { label: 'Создан', variant: 'outline' },
  [PlanStatusOptions.archive]: { label: 'Архив', variant: 'outline' },
  unknown: { label: 'Неизвестно', variant: 'outline' },
};

export function DiagnosticDetailsPanel({
  objectId,
  onClose,
}: DiagnosticDetailsPanelProps) {
  const { data: diagnostics, isLoading, error } = useDiagnostic(objectId);
  const { data: plan } = usePlanByObjectId(objectId);
  const { data: objectFromQuery } = useObject(objectId);
  const { data: planHistory } = usePlanHistory(objectId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  if (!objectId) return null;

  const isLoadingState = isLoading;

  if (isLoadingState) {
    return (
      <div className="h-full w-1/4 shrink-0 border-l border-border bg-card overflow-hidden">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const hasDiagnostics = !!diagnostics && diagnostics.length > 0 && !error;
  const diagnosticsList = hasDiagnostics && diagnostics ? diagnostics : [];
  const firstDiagnostic = diagnosticsList[0] ?? null;

  // Prefer expanded object from diagnostics, otherwise fall back to direct fetch
  const object = firstDiagnostic?.expand?.object ?? objectFromQuery ?? null;
  const pipeline = object?.expand?.pipeline;
  const objectType = object?.type;
  const objectName = object?.name;
  const pipelineName = pipeline?.name;
  const healthStatus = object?.health_status;
  const urgencyScore = object?.urgency_score;
  const aiSummary = object?.ai_summary;
  const displayId = object?.id || firstDiagnostic?.id || objectId;

  const statusKey = (healthStatus ??
    'UNKNOWN') as keyof typeof HEALTH_STATUS_CONFIG;
  const statusConfig =
    HEALTH_STATUS_CONFIG[statusKey] ?? HEALTH_STATUS_CONFIG.UNKNOWN;

  const contentState = error ? 'error' : hasDiagnostics ? 'data' : 'empty';

  return (
    <div className="h-full w-1/4 shrink-0 border-l border-border bg-card overflow-hidden">
      <div className="flex h-full flex-col">
        <div className="border-b border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="mb-2 gap-1.5 -ml-2 text-muted-foreground cursor-pointer hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к списку
          </Button>
          <div className="flex items-start gap-2.5">
            <div className={cn('rounded p-1.5 mt-0.5', statusConfig.iconBg)}>
              <AlertTriangle
                className={cn('h-4 w-4', statusConfig.iconColor)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-xl text-foreground truncate">
                  {objectName || 'Объект без имени'}
                </h2>
              </div>
              <div className="mt-1 text-xs text-muted-foreground/70">
                ID: {displayId}
              </div>
              {(objectType || pipelineName) && (
                <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                  {objectType && (
                    <div>
                      {OBJECT_TYPE_LABELS[
                        objectType as keyof typeof OBJECT_TYPE_LABELS
                      ] ||
                        objectType ||
                        'Неизвестный тип'}
                    </div>
                  )}
                  {pipelineName && <div>{pipelineName}</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {contentState === 'data' && firstDiagnostic ? (
            <div className="space-y-6">
              {(urgencyScore !== undefined || aiSummary) && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">
                      AI-анализ
                    </h3>
                    <div className="space-y-3">
                      {urgencyScore !== undefined && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">
                            Оценка срочности
                          </div>
                          <div className="flex items-end gap-2">
                            <span
                              className={cn(
                                'text-2xl font-bold tabular-nums',
                                statusConfig.iconColor,
                              )}
                            >
                              {urgencyScore}
                            </span>
                            <span className="text-muted-foreground text-sm mb-0.5">
                              /100
                            </span>
                          </div>
                          <Progress
                            value={urgencyScore}
                            className="mt-2 h-1.5"
                          />
                        </div>
                      )}
                      {aiSummary && (
                        <div
                          className={
                            urgencyScore !== undefined
                              ? 'pt-3 border-t border-border/50'
                              : ''
                          }
                        >
                          <p className="text-sm text-foreground leading-relaxed">
                            {aiSummary}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Plan history (conditionally shown only if there are any plans) */}
              {planHistory && planHistory.length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="plan-history">
                    <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                      История работ
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {planHistory.map((p) => {
                          const planDate = p.updated
                            ? new Date(p.updated).toLocaleDateString('ru-RU')
                            : '—';
                          const planHref = `/plan/${objectId}?planId=${p.id}`;
                          const status =
                            planStatusConfig[
                              p.status as keyof typeof planStatusConfig
                            ] || planStatusConfig.unknown;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              aria-label={`Открыть план от ${planDate}`}
                              className="flex w-full items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm cursor-pointer hover:bg-muted/30 transition text-left"
                              onClick={() => router.push(planHref)}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {planDate}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={status.variant}
                                  className="text-xs"
                                >
                                  {status.label}
                                </Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              <Separator />
              {/* Diagnostic History Accordion */}
              <h3 className="text-sm font-medium text-foreground mb-5">
                История диагностик
              </h3>
              <Accordion type="single" collapsible className="w-full">
                {diagnosticsList.map((diagnostic) => {
                  const hasDiagnosticIssue = diagnostic.defect_found ?? false;
                  const diagnosticDate = diagnostic.date
                    ? new Date(diagnostic.date).toLocaleDateString('ru-RU')
                    : '-';

                  return (
                    <AccordionItem key={diagnostic.id} value={diagnostic.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs truncate">
                              {diagnosticDate}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {diagnostic.method || '-'}
                          </span>
                          <Badge
                            variant={
                              hasDiagnosticIssue ? 'destructive' : 'outline'
                            }
                            className="text-xs shrink-0"
                          >
                            {hasDiagnosticIssue ? 'Дефект' : 'Норма'}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="text-xs">
                                  Дата диагностики
                                </span>
                              </div>
                              <p className="font-medium text-foreground">
                                {diagnosticDate}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">
                                Метод
                              </span>
                              <p className="font-medium text-foreground">
                                {diagnostic.method || '-'}
                              </p>
                            </div>
                            {diagnostic.temperature !== undefined && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">
                                  Температура
                                </span>
                                <p className="font-medium text-foreground">
                                  {diagnostic.temperature}°C
                                </p>
                              </div>
                            )}
                            {diagnostic.humidity !== undefined && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">
                                  Влажность
                                </span>
                                <p className="font-medium text-foreground">
                                  {diagnostic.humidity}%
                                </p>
                              </div>
                            )}
                            {diagnostic.illumination !== undefined && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">
                                  Освещенность
                                </span>
                                <p className="font-medium text-foreground">
                                  {diagnostic.illumination}
                                </p>
                              </div>
                            )}
                            {diagnostic.quality_grade && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">
                                  Оценка качества
                                </span>
                                <p className="font-medium text-foreground">
                                  {diagnostic.quality_grade}
                                </p>
                              </div>
                            )}
                            {diagnostic.defect_found !== undefined && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">
                                  Дефект обнаружен
                                </span>
                                <Badge
                                  variant={
                                    hasDiagnosticIssue
                                      ? 'destructive'
                                      : 'outline'
                                  }
                                  className="text-xs"
                                >
                                  {hasDiagnosticIssue ? 'Да' : 'Нет'}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {(() => {
                            const paramsContent = renderDiagnosticParams(
                              diagnostic.method,
                              diagnostic.param1,
                              diagnostic.param2,
                              diagnostic.param3,
                            );
                            if (!paramsContent) return null;

                            return (
                              <div className="space-y-2">
                                <h4 className="text-xs font-medium text-foreground">
                                  Параметры диагностики
                                </h4>
                                <div className="space-y-1 rounded-md border border-border/70 bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
                                  {paramsContent}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="space-y-3 text-center max-w-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {contentState === 'error'
                    ? 'Ошибка загрузки данных диагностики'
                    : 'Диагностики не найдены'}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {contentState === 'error'
                    ? 'Попробуйте обновить страницу или выбрать другой объект.'
                    : 'Для этого объекта нет диагностик, поэтому AI-анализ и история недоступны.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {contentState === 'data' && firstDiagnostic && (
          <div className="border-t border-border p-4">
            {plan && plan.status !== PlanStatusOptions.archive ? (
              <Button
                className="w-full gap-2"
                onClick={() => router.push(`/plan/${plan?.object ?? ''}`)}
              >
                <ClipboardList className="h-4 w-4" />
                Перейти к плану
              </Button>
            ) : (
              <Button
                className="w-full gap-2"
                onClick={() => setIsModalOpen(true)}
              >
                <ClipboardList className="h-4 w-4" />
                Сгенерировать план действий
              </Button>
            )}
          </div>
        )}
      </div>

      {contentState === 'data' && firstDiagnostic && (
        <ActionPlanModal
          diagnosticId={firstDiagnostic.id}
          diagnostic={firstDiagnostic}
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
    </div>
  );
}
