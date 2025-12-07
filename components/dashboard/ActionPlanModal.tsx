'use client';

import { AlertTriangle, Download, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ActionPlanResponse,
  ActionPlanResult,
} from '@/app/api/action-plan/route';
import type {
  DiagnosticsResponse,
  ObjectsHealthStatusOptions,
  PlanStatusOptions,
} from '@/app/api/api_types';
import clientPocketBase from '@/app/api/client_pb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getHealthLabel } from '@/lib/constants';
import { getHealthStyles } from '@/lib/objectHealthStyles';
import { generateActionPlanPdf } from '@/lib/pdf-generator';
import { cn } from '@/lib/utils';

interface ActionPlanModalProps {
  objectId: string | null;
  diagnostic?: DiagnosticsResponse<unknown>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}
interface ActionPlanFieldProps {
  id: string;
  label: string;
  value: string;
  minHeight?: string;
  onChange: (value: string) => void;
}

function ActionPlanField({
  id,
  label,
  value,
  minHeight = 'min-h-[80px]',
  onChange,
}: ActionPlanFieldProps) {
  return (
    <div className="grid w-full gap-4">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={minHeight}
      />
    </div>
  );
}

const PLAN_FIELDS = [
  {
    id: 'problem_summary',
    label: 'Краткое заключение',
    minHeight: 'min-h-[120px]',
  },
  {
    id: 'action_plan',
    label: 'План действий (каждый пункт с новой строки)',
    minHeight: 'min-h-[150px]',
    isList: true,
  },
  {
    id: 'required_resources',
    label: 'Необходимые ресурсы',
    minHeight: 'min-h-[100px]',
  },
  {
    id: 'safety_requirements',
    label: 'Требования по безопасности',
    minHeight: 'min-h-[100px]',
  },
  {
    id: 'expected_outcome',
    label: 'Ожидаемый результат',
    minHeight: 'min-h-[100px]',
  },
] as const;

export function ActionPlanModal({
  objectId,
  diagnostic,
  isOpen,
  onOpenChange,
}: ActionPlanModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionPlanData, setActionPlanData] =
    useState<ActionPlanResponse | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionPlanText, setActionPlanText] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasRequestedRef = useRef(false);

  const selectedDiagnostic =
    actionPlanData?.selected_diagnostic ??
    (diagnostic
      ? {
          id: diagnostic.id,
          date: diagnostic.date,
          method: diagnostic.method,
          defect_found: diagnostic.defect_found,
          defect_description: diagnostic.defect_description,
          quality_grade: diagnostic.quality_grade,
          ml_label: diagnostic.ml_label,
          param1: diagnostic.param1,
          param2: diagnostic.param2,
          param3: diagnostic.param3,
          temperature: diagnostic.temperature,
          humidity: diagnostic.humidity,
          illumination: diagnostic.illumination,
        }
      : null);

  const generateActionPlan = useCallback(async () => {
    if (!objectId) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setGenerationError(null);
    setActionPlanData(null);

    try {
      const response = await fetch('/api/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object_id: objectId }),
        signal: abortControllerRef.current.signal,
      });

      const data: ActionPlanResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка генерации плана');
      }

      setActionPlanData(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setGenerationError(
        err instanceof Error ? err.message : 'Неизвестная ошибка',
      );
    } finally {
      setIsGenerating(false);
    }
  }, [objectId]);

  // Trigger generation when modal opens
  useEffect(() => {
    if (isOpen && objectId && !hasRequestedRef.current) {
      hasRequestedRef.current = true;
      generateActionPlan();
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [isOpen, objectId, generateActionPlan]);

  // Keep raw textarea text in sync with fetched plan
  useEffect(() => {
    const joinedPlan = actionPlanData?.result?.action_plan?.join('\n') ?? '';
    setActionPlanText(joinedPlan);
  }, [actionPlanData?.result?.action_plan]);

  const savePlanToPocketBase = useCallback(
    async (planData: ActionPlanResult, objectId: string) => {
      const actionItems = (planData.action_plan || [])
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const actionIds: string[] = [];
      let createdPlanId: string | null = null;

      try {
        for (const actionDescription of actionItems) {
          const actionRecord = await clientPocketBase
            .collection('action')
            .create({
              description: actionDescription,
              status: false,
            });
          actionIds.push(actionRecord.id);
        }

        const planRecord = await clientPocketBase.collection('plan').create({
          object: objectId,
          problem: planData.problem_summary,
          status: 'created' as PlanStatusOptions,
          actions: actionIds,
        });
        createdPlanId = planRecord.id;

        // Backlink actions to the created plan so relations stay in sync
        if (actionIds.length > 0) {
          await Promise.all(
            actionIds.map((actionId) =>
              clientPocketBase
                .collection('action')
                .update(actionId, { plan: planRecord.id }),
            ),
          );
        }

        setPlanId(planRecord.id);
        return planRecord.id;
      } catch (error) {
        // Cleanup any created actions to avoid orphaned records
        await Promise.all(
          actionIds.map((id) =>
            clientPocketBase
              .collection('action')
              .delete(id)
              .catch(() => {}),
          ),
        );
        if (createdPlanId) {
          await clientPocketBase
            .collection('plan')
            .delete(createdPlanId)
            .catch(() => {});
        }
        throw error;
      }
    },
    [],
  );

  const router = useRouter();

  const handleDownloadPdf = async () => {
    if (
      !actionPlanData?.result ||
      !actionPlanData.object_data ||
      !selectedDiagnostic
    )
      return;

    try {
      setIsSaving(true);

      // Save plan to PocketBase first (only if not already saved)
      const targetObjectId =
        actionPlanData.object_data.id ||
        objectId ||
        (diagnostic?.object as string | undefined) ||
        null;
      if (!planId && targetObjectId) {
        await savePlanToPocketBase(actionPlanData.result, targetObjectId);
      }

      // Generate PDF with the current (potentially edited) data
      const pdfData = {
        object_data: {
          ...actionPlanData.object_data,
          critical_diagnostic: {
            id: selectedDiagnostic.id,
            date: selectedDiagnostic.date || '',
            method: selectedDiagnostic.method || '',
            params: {
              param1: selectedDiagnostic.param1,
              param2: selectedDiagnostic.param2,
              param3: selectedDiagnostic.param3,
            },
            ml_label: selectedDiagnostic.ml_label,
            quality_grade: selectedDiagnostic.quality_grade,
            temperature: selectedDiagnostic.temperature ?? undefined,
            illumination: selectedDiagnostic.illumination ?? undefined,
            humidity: selectedDiagnostic.humidity ?? undefined,
            defect_found: selectedDiagnostic.defect_found,
          },
        },
        result: actionPlanData.result,
        critical_reason:
          actionPlanData.diagnostic_reason ??
          actionPlanData.result?.critical_reason,
      };

      await generateActionPlanPdf(pdfData);
      router.push('/plans');
    } catch (error) {
      console.error('Failed to save plan or generate PDF:', error);
      alert('Ошибка при сохранении плана. Попробуйте еще раз.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Reset state when closing
      setActionPlanData(null);
      setGenerationError(null);
      setPlanId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            План действий
          </DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Генерация плана действий...</p>
          </div>
        ) : generationError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-destructive">{generationError}</p>
            <Button variant="outline" onClick={generateActionPlan}>
              Попробовать снова
            </Button>
          </div>
        ) : actionPlanData?.result && actionPlanData.object_data ? (
          <div className="flex-1 overflow-auto space-y-8">
            {/* Object Info */}
            <div className="rounded-lg border border-border bg-muted/30 p-8 hidden">
              <h4 className="text-sm font-medium text-muted-foreground mb-4">
                Информация об объекте
              </h4>
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <span className="text-muted-foreground">Название:</span>
                  <p className="font-medium">
                    {actionPlanData.object_data.name}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Тип:</span>
                  <p className="font-medium">
                    {actionPlanData.object_data.type}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Трубопровод:</span>
                  <p className="font-medium">
                    {actionPlanData.object_data.pipeline_name}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Статус:</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        getHealthStyles(
                          actionPlanData.object_data
                            .health_status as ObjectsHealthStatusOptions,
                        ).badgeClass,
                      )}
                    >
                      {getHealthLabel(actionPlanData.object_data.health_status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({actionPlanData.object_data.urgency_score}/100)
                    </span>
                  </div>
                </div>
              </div>
              {diagnostic && (
                <div className="mt-6 border-t border-border/50 pt-6">
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">
                    Последняя диагностика
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Дата:
                      </span>
                      <div className="font-medium">
                        {diagnostic.date
                          ? new Date(diagnostic.date).toLocaleDateString(
                              'ru-RU',
                            )
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Метод:
                      </span>
                      <div className="font-medium">
                        {diagnostic.method || '-'}
                      </div>
                    </div>
                    {diagnostic.ml_label && (
                      <div>
                        <span className="text-muted-foreground text-xs">
                          AI Анализ:
                        </span>
                        <div className="font-medium">
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
                        <span className="text-muted-foreground text-xs">
                          Оценка качества:
                        </span>
                        <div className="font-medium">
                          {diagnostic.quality_grade}
                        </div>
                      </div>
                    )}
                    {diagnostic.temperature !== undefined && (
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Температура:
                        </span>
                        <div className="font-medium">
                          {diagnostic.temperature}°C
                        </div>
                      </div>
                    )}
                    {diagnostic.illumination !== undefined && (
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Освещенность:
                        </span>
                        <div className="font-medium">
                          {diagnostic.illumination}
                        </div>
                      </div>
                    )}
                    {diagnostic.defect_found !== undefined && (
                      <div className="col-span-2 mt-1">
                        <span className="text-muted-foreground text-xs">
                          Результат:
                        </span>
                        <div
                          className={cn(
                            'font-medium',
                            diagnostic.defect_found
                              ? 'text-destructive'
                              : 'text-emerald-600',
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
            {selectedDiagnostic && (
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Используемая диагностика
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-foreground">
                  <Badge variant="outline" className="text-xs">
                    {selectedDiagnostic.id}
                  </Badge>
                  <span className="font-medium">
                    {selectedDiagnostic.method || '—'}
                  </span>
                  <span className="text-muted-foreground">
                    {selectedDiagnostic.date
                      ? new Date(selectedDiagnostic.date).toLocaleDateString(
                          'ru-RU',
                        )
                      : 'Дата не указана'}
                  </span>
                </div>
                {actionPlanData.diagnostic_reason && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {actionPlanData.diagnostic_reason}
                  </p>
                )}
              </div>
            )}
            {PLAN_FIELDS.map((field) => {
              const value =
                field.id === 'action_plan'
                  ? actionPlanText
                  : (actionPlanData.result?.[
                      field.id as keyof ActionPlanResult
                    ] as string) || '';

              return (
                <ActionPlanField
                  key={field.id}
                  id={field.id}
                  label={field.label}
                  value={value}
                  minHeight={field.minHeight}
                  onChange={(updatedValue) => {
                    if (field.id === 'action_plan') {
                      setActionPlanText(updatedValue);
                    }

                    setActionPlanData((prev) => {
                      if (!prev) return prev;

                      const currentResult: ActionPlanResult = prev.result ?? {
                        action_plan: [],
                        problem_summary: '',
                        required_resources: '',
                        safety_requirements: '',
                        expected_outcome: '',
                      };

                      return {
                        ...prev,
                        result: {
                          ...currentResult,
                          ...(field.id === 'action_plan'
                            ? {
                                action_plan: updatedValue.split('\n'),
                              }
                            : { [field.id]: updatedValue }),
                        },
                      };
                    });
                  }}
                />
              );
            })}
          </div>
        ) : null}

        {actionPlanData?.result && !isGenerating && (
          <DialogFooter className="border-t border-border pt-8">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Закрыть
            </Button>
            <Button
              onClick={handleDownloadPdf}
              className="gap-2"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Скачать PDF
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
