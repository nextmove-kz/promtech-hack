"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiagnostic } from "@/hooks/useDiagnostic";
import { useObject } from "@/hooks/useObject";
import { usePlanByObjectId } from "@/hooks/usePlan";
import { ActionPlanModal } from "./ActionPlanModal";
import { useRouter } from "next/navigation";

interface DiagnosticDetailsPanelProps {
  objectId: string | null;
  onClose: () => void;
}

const healthStatusConfig = {
  OK: {
    label: "Норма",
    variant: "outline" as const,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
  WARNING: {
    label: "Предупреждение",
    variant: "secondary" as const,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
  },
  CRITICAL: {
    label: "Критический",
    variant: "destructive" as const,
    iconColor: "text-red-600",
    iconBg: "bg-red-100",
  },
  UNKNOWN: {
    label: "Неизвестно",
    variant: "outline" as const,
    iconColor: "text-gray-600",
    iconBg: "bg-gray-100",
  },
};

const objectTypeLabels: Record<string, string> = {
  crane: "Кран",
  compressor: "Компрессор",
  pipeline_section: "Участок трубопровода",
};

const renderParams = (
  method?: string,
  p1?: number | string,
  p2?: number | string,
  p3?: number | string
) => {
  const hasValue = (v?: number | string | null) => {
    if (v === undefined || v === null) return false;
    if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
    if (typeof v === "string") return v.trim() !== "" && v.trim() !== "0";
    return true;
  };

  const v1 = hasValue(p1);
  const v2 = hasValue(p2);
  const v3 = hasValue(p3);
  const hasAny = v1 || v2 || v3;

  if (!hasAny) return null;

  switch (method) {
    case "VIBRO":
      return (
        <>
          {v1 && (
            <div>
              Виброскорость: <b>{p1} мм/с</b>
            </div>
          )}
          {v2 && <div>Ускорение: {p2} м/с²</div>}
          {v3 && <div>Частота/Температура: {p3}</div>}
        </>
      );
    case "MFL":
    case "UTWM":
      return (
        <>
          {v1 && (
            <div>
              Глубина коррозии: <b className="text-red-500">{p1} мм</b>
            </div>
          )}
          {v2 && <div>Остаток стенки: {p2} мм</div>}
          {v3 && <div>Длина дефекта: {p3} мм</div>}
        </>
      );
    case "TVK":
      // TVK параметры без названий не показываем
      return null;
    default:
      if (v1 && v2) {
        return (
          <>
            <div>
              Размеры (ДхШ): {p1} x {p2} мм
            </div>
          </>
        );
      }

      return null;
  }
};

export function DiagnosticDetailsPanel({
  objectId,
  onClose,
}: DiagnosticDetailsPanelProps) {
  const { data: diagnostics, isLoading, error } = useDiagnostic(objectId);
  const { data: objectData, isLoading: isObjectLoading } = useObject(objectId);
  const { data: plan } = usePlanByObjectId(objectId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  if (!objectId) return null;

  const isLoadingState = isLoading || isObjectLoading;

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
  const object = firstDiagnostic?.expand?.object ?? objectData ?? null;
  const pipeline = object?.expand?.pipeline;
  const objectType = object?.type;
  const objectName = object?.name;
  const pipelineName = pipeline?.name;
  const healthStatus = object?.health_status;
  const urgencyScore = object?.urgency_score;
  const aiSummary = object?.ai_summary;
  const displayId = object?.id || firstDiagnostic?.id || objectId;

  const statusKey = (healthStatus ??
    "UNKNOWN") as keyof typeof healthStatusConfig;
  const statusConfig =
    healthStatusConfig[statusKey] ?? healthStatusConfig.UNKNOWN;

  const contentState = error
    ? "error"
    : hasDiagnostics
      ? "data"
      : "empty";

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
            <div className={cn("rounded p-1.5 mt-0.5", statusConfig.iconBg)}>
              <AlertTriangle
                className={cn("h-4 w-4", statusConfig.iconColor)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-xl text-foreground truncate">
                  {objectName || "Объект без имени"}
                </h2>
              </div>
              <div className="mt-1 text-xs text-muted-foreground/70">
                ID: {displayId}
              </div>
              {(objectType || pipelineName) && (
                <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                  {objectType && (
                    <div>{objectTypeLabels[objectType] || objectType}</div>
                  )}
                  {pipelineName && <div>{pipelineName}</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {contentState === "data" && firstDiagnostic ? (
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
                                "text-2xl font-bold tabular-nums",
                                statusConfig.iconColor
                              )}
                            >
                              {urgencyScore}
                            </span>
                            <span className="text-muted-foreground text-sm mb-0.5">
                              /100
                            </span>
                          </div>
                          <Progress value={urgencyScore} className="mt-2 h-1.5" />
                        </div>
                      )}
                      {aiSummary && (
                        <div
                          className={
                            urgencyScore !== undefined
                              ? "pt-3 border-t border-border/50"
                              : ""
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

              <Separator />
              {/* Diagnostic History Accordion */}
              <h3 className="text-sm font-medium text-foreground mb-5">
                История диагностик
              </h3>
              <Accordion type="single" collapsible className="w-full">
                {diagnosticsList.map((diagnostic) => {
                  const hasDiagnosticIssue = diagnostic.defect_found ?? false;
                  const diagnosticDate = diagnostic.date
                    ? new Date(diagnostic.date).toLocaleDateString("ru-RU")
                    : "-";

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
                            {diagnostic.method || "-"}
                          </span>
                          <Badge
                            variant={
                              hasDiagnosticIssue ? "destructive" : "outline"
                            }
                            className="text-xs shrink-0"
                          >
                            {hasDiagnosticIssue ? "Дефект" : "Норма"}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="text-xs">Дата диагностики</span>
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
                                {diagnostic.method || "-"}
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
                                    hasDiagnosticIssue ? "destructive" : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {hasDiagnosticIssue ? "Да" : "Нет"}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {(() => {
                            const paramsContent = renderParams(
                              diagnostic.method,
                              diagnostic.param1,
                              diagnostic.param2,
                              diagnostic.param3
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
                  {contentState === "error"
                    ? "Ошибка загрузки данных диагностики"
                    : "Диагностики не найдены"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {contentState === "error"
                    ? "Попробуйте обновить страницу или выбрать другой объект."
                    : "Для этого объекта нет диагностик, поэтому AI-анализ и история недоступны."}
                </p>
              </div>
            </div>
          )}
        </div>

        {contentState === "data" && firstDiagnostic && (
          <div className="border-t border-border p-4">
            {plan?.status === "pending" ? (
              <Button
                className="w-full gap-2"
                onClick={() => router.push(`/plan/${plan.object}`)}
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

      {contentState === "data" && firstDiagnostic && (
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
