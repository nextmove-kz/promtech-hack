'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import clientPocketBase from '@/app/api/client_pb';

type Candidate = {
  object_id: string;
  object_name: string;
  plan_id: string;
  plan_updated: string;
  object_last_analysis_at?: string;
  object_updated?: string;
};

export function ReanalysisAlert() {
  const [dismissed, setDismissed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const queryClient = useQueryClient();

  const { data, refetch, isFetching } = useQuery<{
    success: boolean;
    items: Candidate[];
  }>({
    queryKey: ['reanalysis', 'candidates'],
    queryFn: async () => {
      const res = await fetch('/api/reanalysis');
      if (!res.ok) throw new Error('Не удалось получить список для переоценки');
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const candidates = useMemo(() => data?.items ?? [], [data]);

  // Subscribe to finished plans in PocketBase and refetch when they appear
  useEffect(() => {
    const subscribe = async () => {
      try {
        await clientPocketBase.collection('plan').subscribe('*', (e) => {
          const status = (e.record as { status?: string }).status;
          if (status === 'done') {
            refetch();
          }
        });
      } catch (e) {
        console.error('PB subscribe error (plan):', e);
      }
    };

    subscribe();

    return () => {
      clientPocketBase.collection('plan').unsubscribe('*');
    };
  }, [refetch]);
  useEffect(() => {
    if (candidates.length > 0) {
      setDismissed(false);
    }
  }, [candidates.length]);

  useEffect(() => {
    const notifyId = 'reanalysis-notify';
    if (dismissed || isRunning || candidates.length === 0) {
      toast.dismiss(notifyId);
      return;
    }

    const listedNames = candidates
      .slice(0, 3)
      .map((c) => c.object_name)
      .join(', ');
    const subtitle =
      candidates.length > 1
        ? `Есть ${candidates.length} объекта с завершенными планами.`
        : 'Есть объект с завершенным планом.';

    toast.custom(
      () => (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm">
          <div className="mt-0.5 rounded-full bg-amber-100 p-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-semibold leading-tight">
              Нужно переоценить объекты
            </div>
            <div className="text-xs text-amber-800">
              {subtitle}{' '}
              {listedNames &&
                `(${listedNames}${candidates.length > 3 ? '…' : ''})`}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  toast.dismiss('reanalysis-notify');
                  handleRun();
                }}
              >
                Переоценить
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDismissed(true);
                  toast.dismiss('reanalysis-notify');
                }}
              >
                Скрыть
              </Button>
            </div>
          </div>
        </div>
      ),
      { id: notifyId, duration: Infinity },
    );

    return () => {
      toast.dismiss(notifyId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, dismissed, isRunning]);

  const updateProgressToast = (current: number, total: number) => {
    toast.custom(
      () => (
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-foreground shadow">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div className="flex flex-col">
            <span className="font-medium">Переоценка объектов</span>
            <span className="text-xs text-muted-foreground">
              {current}/{total}
            </span>
          </div>
        </div>
      ),
      { id: 'reanalysis-progress', duration: Infinity },
    );
  };

  const handleRun = async () => {
    if (isRunning || candidates.length === 0) return;
    setIsRunning(true);
    setProgress({ current: 0, total: candidates.length });
    toast.dismiss('reanalysis-notify');
    updateProgressToast(0, candidates.length);

    try {
      const res = await fetch('/api/reanalysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object_ids: candidates.map((c) => c.object_id),
        }),
      });

      const data = (await res.json()) as {
        success: boolean;
        results?: Array<{ object_id: string }>;
        skipped?: Array<{ object_id: string; reason: string }>;
        errors?: Array<{ object_id: string; error: string }>;
      };

      const successCount = data.results?.length ?? 0;
      const skippedCount = data.skipped?.length ?? 0;
      const failedCount = data.errors?.length ?? 0;

      setProgress({ current: candidates.length, total: candidates.length });
      updateProgressToast(candidates.length, candidates.length);
      toast.dismiss('reanalysis-progress');
      setIsRunning(false);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['objects'] });

      if (successCount > 0) {
        toast.success(
          `Переоценка завершена: ${successCount} обновлено, ${skippedCount} пропущено`,
        );
      }
      if (failedCount > 0) {
        toast.error(`Ошибка при переоценке: ${failedCount} объект(ов)`);
      }
    } catch (error) {
      console.error('Re-analysis batch failed', error);
      toast.dismiss('reanalysis-progress');
      setIsRunning(false);
      toast.error('Не удалось запустить переоценку');
    }
  };

  return null;
}
