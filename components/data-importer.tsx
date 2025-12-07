'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Brain, Loader2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useDataImport } from '@/hooks/use-data-import';

export function DataImporter({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({
    current: 0,
    total: 0,
  });
  const [analysisCounts, setAnalysisCounts] = useState({
    critical: 0,
    warning: 0,
    ok: 0,
    errors: 0,
  });

  const shouldAutoAnalyzeRef = useRef(true);
  const importToastId = useRef<string | number | null>(null);
  const analysisToastId = useRef<string | number | null>(null);
  const analysisAbortRef = useRef(false);

  const refreshObjects = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['objects'] });
  }, [queryClient]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: 0 });
    setAnalysisCounts({ critical: 0, warning: 0, ok: 0, errors: 0 });
    analysisAbortRef.current = false;

    try {
      // First, get the prioritized list of objects
      const prepRes = await fetch('/api/analyze', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prioritize_high_risk: true }),
      });

      if (!prepRes.ok) throw new Error('Failed to prepare analysis');

      const { object_ids } = await prepRes.json();

      if (!object_ids || object_ids.length === 0) {
        toast.info('Нет объектов для анализа');
        setIsAnalyzing(false);
        return;
      }

      setAnalysisProgress({ current: 0, total: object_ids.length });

      let critical = 0,
        warning = 0,
        ok = 0,
        errors = 0;

      // Process objects one by one for visual feedback
      for (let i = 0; i < object_ids.length; i++) {
        if (analysisAbortRef.current) break;

        const objectId = object_ids[i];

        setAnalysisProgress({
          current: i + 1,
          total: object_ids.length,
        });

        try {
          // Use POST for single object analysis
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ object_id: objectId }),
          });

          const data = await res.json();

          if (data.success && data.result) {
            const status = data.result.health_status;
            if (status === 'CRITICAL') critical++;
            else if (status === 'WARNING') warning++;
            else ok++;
          } else {
            errors++;
          }

          setAnalysisCounts({ critical, warning, ok, errors });

          // Refresh objects after each analysis to show progress
          refreshObjects();
        } catch {
          errors++;
          setAnalysisCounts({ critical, warning, ok, errors });
        }

        // Small delay between analyses for visual feedback and to avoid rate limiting
        if (i < object_ids.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (analysisAbortRef.current) {
        toast.info('Анализ остановлен');
        return;
      }

      toast.success('Анализ завершён', {
        description: `Критических: ${critical}, Внимание: ${warning}, OK: ${ok}, Ошибок: ${errors}`,
      });
      setOpen(false); // Close dialog after successful analysis
    } catch (error) {
      toast.error('Ошибка анализа', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const { state, isWorking, progress, onDrop, abort } = useDataImport({
    onComplete: () => {
      // Auto-trigger AI analysis after import completes
      if (shouldAutoAnalyzeRef.current) {
        runAnalysis();
      }
    },
  });

  const handleDrop = useCallback(
    (files: File[]) => {
      shouldAutoAnalyzeRef.current = true;
      onDrop(files);
    },
    [onDrop],
  );

  const handleAbort = useCallback(() => {
    shouldAutoAnalyzeRef.current = false;
    abort();
  }, [abort]);

  useEffect(() => {
    if (isWorking) {
      setOpen(false);
      const id = importToastId.current ?? 'import-progress';
      importToastId.current = id;

      toast.custom(
        () => (
          <div className="w-80 rounded-md border bg-white p-3 shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-900">
                  Импорт данных
                </p>
                <p className="text-xs text-zinc-500">
                  {state.phase === 'parsing'
                    ? 'Чтение файлов...'
                    : 'Загрузка...'}{' '}
                  • {state.processed}/{state.total} ({state.errors} ошибок)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Отменить импорт?')) {
                    handleAbort();
                    toast.dismiss(id);
                  }
                }}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Progress value={progress} className="mt-2 h-2" />
          </div>
        ),
        { id, duration: Infinity, position: 'bottom-left' },
      );
    } else if (importToastId.current) {
      toast.dismiss(importToastId.current);
      importToastId.current = null;
    }
  }, [
    handleAbort,
    isWorking,
    progress,
    state.errors,
    state.phase,
    state.processed,
    state.total,
  ]);

  useEffect(() => {
    if (isAnalyzing) {
      setOpen(false);
      const id = analysisToastId.current ?? 'analysis-progress';
      analysisToastId.current = id;
      const percent =
        analysisProgress.total > 0
          ? (analysisProgress.current / analysisProgress.total) * 100
          : 0;

      toast.custom(
        () => (
          <div className="w-80 rounded-md border bg-white p-3 shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-900">ИИ-анализ</p>
                <p className="text-xs text-zinc-500">
                  {analysisProgress.total === 0
                    ? 'Подготовка...'
                    : `${analysisProgress.current}/${analysisProgress.total} объектов`}
                </p>
                <p className="text-[11px] text-zinc-500">
                  CRIT {analysisCounts.critical} • WARN {analysisCounts.warning}{' '}
                  • OK {analysisCounts.ok} • ERR {analysisCounts.errors}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Остановить анализ?')) {
                    analysisAbortRef.current = true;
                    setIsAnalyzing(false);
                    toast.dismiss(id);
                  }
                }}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Progress value={percent} className="mt-2 h-2" />
          </div>
        ),
        { id, duration: Infinity, position: 'bottom-left' },
      );
    } else if (analysisToastId.current) {
      toast.dismiss(analysisToastId.current);
      analysisToastId.current = null;
    }
  }, [analysisCounts, analysisProgress, isAnalyzing]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 2,
    disabled: isWorking,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={`gap-2 ${className ?? ''}`}>
          <Upload className="h-4 w-4" />
          Импорт
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Импорт данных</DialogTitle>
          <DialogDescription>
            Загрузите CSV-файлы с объектами и/или диагностиками
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'}
            ${isWorking ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
              <Upload className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-600">
              {isDragActive
                ? 'Отпустите файлы...'
                : 'Перетащите CSV-файлы сюда'}
            </p>
            <p className="text-xs text-zinc-400">
              или нажмите для выбора (макс. 2 файла)
            </p>
          </div>
        </div>

        {/* Progress */}
        {isWorking && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">
                {state.phase === 'parsing' ? 'Чтение файлов...' : 'Загрузка...'}
              </span>
              <span className="text-zinc-500">
                {state.processed} / {state.total}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            {state.errors > 0 && (
              <p className="text-xs text-amber-600">Ошибок: {state.errors}</p>
            )}
          </div>
        )}

        {/* Cancel button */}
        {isWorking && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleAbort}
          >
            Отменить
          </Button>
        )}

        {/* AI Analysis trigger */}
        {!isWorking && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-muted-foreground">
              Запустите ИИ-анализ для оценки состояния объектов
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full gap-2"
              onClick={runAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Анализ {analysisProgress.current}/{analysisProgress.total}...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Запустить AI анализ
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
