"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Brain,
  Play,
  Square,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  BarChart3,
  Zap,
} from "lucide-react";
import type { AnalysisResponse, AnalysisResult } from "@/app/api/analyze/route";

interface LogEntry {
  id: string;
  timestamp: Date;
  objectName: string;
  objectId: string;
  status: "pending" | "analyzing" | "success" | "error";
  result?: AnalysisResult;
  error?: string;
}

interface AnalysisSummary {
  total: number;
  completed: number;
  critical: number;
  warning: number;
  ok: number;
  errors: number;
  conflicts: number;
}

interface AnalysisTriggerProps {
  objectIds?: string[];
  onComplete?: () => void;
}

export function AnalysisTrigger({ objectIds, onComplete }: AnalysisTriggerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalObjects, setTotalObjects] = useState(0);
  const [summary, setSummary] = useState<AnalysisSummary>({
    total: 0,
    completed: 0,
    critical: 0,
    warning: 0,
    ok: 0,
    errors: 0,
    conflicts: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const objectQueueRef = useRef<string[]>([]);

  // Auto-scroll to latest log entry
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchObjectsToAnalyze = useCallback(async (): Promise<string[]> => {
    if (objectIds && objectIds.length > 0) {
      return objectIds;
    }

    // Fetch objects prioritized by risk
    const response = await fetch("/api/analyze", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prioritize_high_risk: true }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch objects");
    }

    const data = await response.json();
    return data.object_ids || [];
  }, [objectIds]);

  const analyzeObject = useCallback(
    async (objectId: string): Promise<AnalysisResponse> => {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object_id: objectId }),
      });

      return response.json();
    },
    []
  );

  const startAnalysis = useCallback(async () => {
    setIsRunning(true);
    setIsPaused(false);
    setLogs([]);
    setCurrentIndex(0);
    setSummary({
      total: 0,
      completed: 0,
      critical: 0,
      warning: 0,
      ok: 0,
      errors: 0,
      conflicts: 0,
    });

    abortControllerRef.current = new AbortController();

    try {
      // Fetch objects to analyze
      const objects = await fetchObjectsToAnalyze();
      objectQueueRef.current = objects;
      setTotalObjects(objects.length);
      setSummary((prev) => ({ ...prev, total: objects.length }));

      if (objects.length === 0) {
        toast.info("Нет объектов для анализа", {
          description: "Загрузите данные перед запуском анализа",
        });
        setIsRunning(false);
        return;
      }

      // Process objects sequentially
      for (let i = 0; i < objects.length; i++) {
        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        // Wait while paused
        while (isPaused) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (abortControllerRef.current?.signal.aborted) break;
        }

        const objectId = objects[i];
        const logId = `${objectId}-${Date.now()}`;

        // Add pending log entry
        setLogs((prev) => [
          ...prev,
          {
            id: logId,
            timestamp: new Date(),
            objectName: `Объект ${objectId.slice(0, 8)}...`,
            objectId,
            status: "analyzing",
          },
        ]);
        setCurrentIndex(i + 1);

        try {
          const result = await analyzeObject(objectId);

          // Update log entry with result
          setLogs((prev) =>
            prev.map((log) =>
              log.id === logId
                ? {
                    ...log,
                    status: result.success ? "success" : "error",
                    result: result.result,
                    error: result.error,
                    objectName: result.result
                      ? `${log.objectName}`
                      : log.objectName,
                  }
                : log
            )
          );

          // Update summary
          if (result.success && result.result) {
            setSummary((prev) => ({
              ...prev,
              completed: prev.completed + 1,
              critical:
                prev.critical +
                (result.result?.health_status === "CRITICAL" ? 1 : 0),
              warning:
                prev.warning +
                (result.result?.health_status === "WARNING" ? 1 : 0),
              ok: prev.ok + (result.result?.health_status === "OK" ? 1 : 0),
              conflicts:
                prev.conflicts + (result.result?.conflict_detected ? 1 : 0),
            }));
          } else {
            setSummary((prev) => ({
              ...prev,
              completed: prev.completed + 1,
              errors: prev.errors + 1,
            }));
          }

          // Small delay between requests to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          setLogs((prev) =>
            prev.map((log) =>
              log.id === logId
                ? {
                    ...log,
                    status: "error",
                    error:
                      error instanceof Error ? error.message : "Unknown error",
                  }
                : log
            )
          );

          setSummary((prev) => ({
            ...prev,
            completed: prev.completed + 1,
            errors: prev.errors + 1,
          }));
        }
      }

      // Analysis complete
      const finalSummary = summary;
      toast.success("Анализ завершён", {
        description: `Обработано ${finalSummary.completed} объектов. Критических: ${finalSummary.critical}`,
      });

      onComplete?.();
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Ошибка анализа", {
        description:
          error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [fetchObjectsToAnalyze, analyzeObject, isPaused, summary, onComplete]);

  const stopAnalysis = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
    toast.info("Анализ остановлен");
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const getStatusIcon = (status: LogEntry["status"]) => {
    switch (status) {
      case "analyzing":
        return <Loader2 className="size-4 animate-spin text-primary" />;
      case "success":
        return <CheckCircle2 className="size-4 text-green-500" />;
      case "error":
        return <AlertCircle className="size-4 text-destructive" />;
      default:
        return <div className="size-4 rounded-full bg-muted" />;
    }
  };

  const getHealthBadge = (status?: string, score?: number) => {
    if (!status) return null;

    const variants: Record<string, { color: string; icon: React.ReactNode }> = {
      CRITICAL: {
        color: "bg-red-500/20 text-red-600 border-red-500/30",
        icon: <AlertTriangle className="size-3" />,
      },
      WARNING: {
        color: "bg-amber-500/20 text-amber-600 border-amber-500/30",
        icon: <AlertCircle className="size-3" />,
      },
      OK: {
        color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
        icon: <CheckCircle2 className="size-3" />,
      },
    };

    const variant = variants[status] || variants.OK;

    return (
      <Badge
        variant="outline"
        className={`${variant.color} gap-1 font-mono text-xs`}
      >
        {variant.icon}
        {status} {score !== undefined && `(${score})`}
      </Badge>
    );
  };

  const progressPercent =
    totalObjects > 0 ? (currentIndex / totalObjects) * 100 : 0;

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="bg-linear-to-r from-primary/5 via-primary/10 to-transparent pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Brain className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="size-4 text-amber-500" />
                AI Intelligence Analysis
              </CardTitle>
              <CardDescription>
                Gemini 2.0 Flash • Pipeline Integrity Assessment
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePause}
                  className="gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play className="size-4" /> Продолжить
                    </>
                  ) : (
                    <>
                      <Square className="size-4" /> Пауза
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopAnalysis}
                  className="gap-2"
                >
                  <Square className="size-4" /> Остановить
                </Button>
              </>
            ) : (
              <Button onClick={startAnalysis} className="gap-2">
                <Zap className="size-4" />
                Запустить анализ
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Progress Section */}
        {(isRunning || logs.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isRunning
                  ? isPaused
                    ? "Приостановлено"
                    : "Анализ объектов..."
                  : "Анализ завершён"}
              </span>
              <span className="font-mono font-medium">
                {currentIndex} / {totalObjects}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Summary Stats */}
        {summary.completed > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Обработано</div>
                <div className="font-mono font-semibold">{summary.completed}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2">
              <AlertTriangle className="size-4 text-red-500" />
              <div>
                <div className="text-xs text-muted-foreground">Критических</div>
                <div className="font-mono font-semibold text-red-600">
                  {summary.critical}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
              <AlertCircle className="size-4 text-amber-500" />
              <div>
                <div className="text-xs text-muted-foreground">Внимание</div>
                <div className="font-mono font-semibold text-amber-600">
                  {summary.warning}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <div>
                <div className="text-xs text-muted-foreground">В норме</div>
                <div className="font-mono font-semibold text-emerald-600">
                  {summary.ok}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-2">
              <Brain className="size-4 text-purple-500" />
              <div>
                <div className="text-xs text-muted-foreground">Конфликты</div>
                <div className="font-mono font-semibold text-purple-600">
                  {summary.conflicts}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-gray-500/10 px-3 py-2">
              <AlertCircle className="size-4 text-gray-500" />
              <div>
                <div className="text-xs text-muted-foreground">Ошибки</div>
                <div className="font-mono font-semibold text-gray-600">
                  {summary.errors}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Log */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <div className="size-2 animate-pulse rounded-full bg-primary" />
              Live Analysis Log
            </div>
            <ScrollArea className="h-64 rounded-lg border bg-muted/30">
              <div ref={scrollRef} className="space-y-1 p-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      log.status === "analyzing"
                        ? "bg-primary/10"
                        : log.status === "error"
                          ? "bg-destructive/10"
                          : "bg-transparent hover:bg-muted/50"
                    }`}
                  >
                    <div className="mt-0.5">{getStatusIcon(log.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="font-medium truncate">
                          {log.objectName}
                        </span>
                        {log.result &&
                          getHealthBadge(
                            log.result.health_status,
                            log.result.urgency_score
                          )}
                        {log.result?.conflict_detected && (
                          <Badge
                            variant="outline"
                            className="bg-purple-500/20 text-purple-600 border-purple-500/30 text-xs"
                          >
                            Конфликт данных
                          </Badge>
                        )}
                      </div>
                      {log.result?.ai_summary && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {log.result.ai_summary}
                        </p>
                      )}
                      {log.error && (
                        <p className="mt-1 text-xs text-destructive">
                          {log.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty State */}
        {!isRunning && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Brain className="size-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">
              Готов к анализу
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Нажмите «Запустить анализ» для оценки состояния всех объектов
              трубопровода с помощью ИИ
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="size-3" /> Gemini 2.0 Flash
              </Badge>
              <Badge variant="secondary">Приоритет по риску</Badge>
              <Badge variant="secondary">Пакетная обработка</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

