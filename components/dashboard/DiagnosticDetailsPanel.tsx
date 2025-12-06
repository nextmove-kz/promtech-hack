"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Download,
  AlertTriangle,
  Calendar,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiagnostic } from "@/hooks/useDiagnostic";
import type { DiagnosticsMlLabelOptions } from "@/app/api/api_types";
import type { DiagnosticWithObject } from "@/app/api/diagnostics";

interface DiagnosticDetailsPanelProps {
  objectId: string | null;
  onClose: () => void;
}

const mapMlLabelToSeverity = (
  mlLabel?: DiagnosticsMlLabelOptions
): "critical" | "high" | "medium" | "low" => {
  switch (mlLabel) {
    case "high":
      return "critical";
    case "medium":
      return "medium";
    case "normal":
    default:
      return "low";
  }
};

const severityConfig = {
  critical: {
    label: "Критический",
    variant: "destructive" as const,
    color: "text-risk-critical",
  },
  high: {
    label: "Высокий",
    variant: "destructive" as const,
    color: "text-risk-high",
  },
  medium: {
    label: "Средний",
    variant: "secondary" as const,
    color: "text-risk-medium",
  },
  low: { label: "Низкий", variant: "outline" as const, color: "text-risk-low" },
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
              Глубина коррозии:{" "}
              <b className="text-red-500">{p1} мм</b>
            </div>
          )}
          {v2 && <div>Остаток стенки: {p2} мм</div>}
          {v3 && <div>Длина дефекта: {p3} мм</div>}
        </>
      );
    default:
      if (v1 && v2) {
        return (
          <>
            <div>
              Размеры (ДхШ): {p1} x {p2} мм
            </div>
            {v3 && <div>Параметр 3: {p3}</div>}
          </>
        );
      }

      return (
        <>
          {v1 && <div>Параметр 1: {p1}</div>}
          {v2 && <div>Параметр 2: {p2}</div>}
          {v3 && <div>Параметр 3: {p3}</div>}
        </>
      );
  }
};

export function DiagnosticDetailsPanel({
  objectId,
  onClose,
}: DiagnosticDetailsPanelProps) {
  const { data: diagnostic, isLoading, error } = useDiagnostic(objectId);

  if (!objectId) return null;

  if (isLoading) {
    return (
      <div className="h-full w-1/4 shrink-0 border-l border-border bg-card overflow-hidden">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !diagnostic) {
    return (
      <div className="h-full w-1/4 shrink-0 border-l border-border bg-card overflow-hidden">
        <div className="flex h-full items-center justify-center p-4">
          <div className="text-center text-sm text-destructive">
            Ошибка загрузки данных диагностики
          </div>
        </div>
      </div>
    );
  }

  const severityKey = mapMlLabelToSeverity(diagnostic.ml_label);
  const severity = severityConfig[severityKey];
  const hasDiagnosticIssue = diagnostic.defect_found ?? false;

  // Extract expanded object and pipeline data
  const object = diagnostic.expand?.object;
  const pipeline = object?.expand?.pipeline;
  const objectType = object?.type;
  const objectName = object?.name;
  const pipelineName = pipeline?.name;
  const urgencyScore = object?.urgency_score;
  const aiSummary = object?.ai_summary;

  return (
    <div className="h-full w-1/4 shrink-0 border-l border-border bg-card overflow-hidden">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="mb-2 gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к списку
          </Button>
          <div className="flex items-start gap-2.5">
            <div
              className={cn(
                "rounded p-1.5 mt-0.5",
                severityKey === "critical" ? "bg-risk-critical/20" : "bg-muted"
              )}
            >
              <AlertTriangle className={cn("h-4 w-4", severity.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-xl text-foreground truncate">
                  {objectName || "Объект без имени"}
                </h2>
                <Badge variant={severity.variant} className="text-sm">
                  {severity.label}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground/70">
                ID: {diagnostic.id}
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

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-6">
            {/* Diagnostic Name & Description */}

            {/* AI Analysis */}
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
                              urgencyScore >= 80
                                ? "text-risk-critical"
                                : urgencyScore >= 60
                                ? "text-risk-high"
                                : urgencyScore >= 40
                                ? "text-risk-medium"
                                : "text-risk-low"
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
            {/* Properties Grid */}
            <h3 className="text-sm font-medium text-foreground mb-5">
              Последняя диагностика
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs">Дата диагностики</span>
                </div>
                <p className="font-medium text-foreground">
                  {diagnostic.date
                    ? new Date(diagnostic.date).toLocaleDateString("ru-RU")
                    : "-"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Метод</span>
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
                <div className="space-y-1 space-x-2">
                  <span className="text-xs text-muted-foreground">
                    Дефект обнаружен
                  </span>
                  <Badge
                    variant={hasDiagnosticIssue ? "destructive" : "outline"}
                    className="text-xs"
                  >
                    {hasDiagnosticIssue ? "Да" : "Нет"}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {(function () {
            const paramsContent = renderParams(
              diagnostic.method,
              diagnostic.param1,
              diagnostic.param2,
              diagnostic.param3
            );
            if (!paramsContent) return null;

            return (
              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-medium text-foreground">
                  Параметры диагностики
                </h3>
                <div className="space-y-1 rounded-md border border-border/70 bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
                  {paramsContent}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border p-4">
          <Button className="w-full gap-2">
            <Download className="h-4 w-4" />
            Экспорт отчета (PDF)
          </Button>
        </div>
      </div>
    </div>
  );
}
