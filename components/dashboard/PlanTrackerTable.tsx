'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ClipboardList,
  Loader2,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { usePlans } from '@/hooks/usePlan';
import { PlanStatusOptions } from '@/app/api/api_types';

interface PlanTrackerTableProps {
  onShowOnMap?: (objectId: string) => void;
}

const statusConfig: Record<
  PlanStatusOptions | 'unknown',
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  [PlanStatusOptions.done]: { label: 'Выполнен', variant: 'default' },
  [PlanStatusOptions.pending]: { label: 'В работе', variant: 'secondary' },
  [PlanStatusOptions.created]: { label: 'Создан', variant: 'outline' },
  [PlanStatusOptions.archive]: { label: 'Архив', variant: 'outline' },
  unknown: { label: 'Неизвестно', variant: 'outline' },
};

const getUrgencyBadgeClass = (score?: number) => {
  if (score === undefined || score === null)
    return 'border-muted-foreground/40 text-muted-foreground';
  if (score >= 80) return 'border-red-500/60 text-red-600 bg-red-500/5';
  if (score >= 50) return 'border-amber-500/60 text-amber-600 bg-amber-500/5';
  if (score >= 20) return 'border-blue-500/60 text-blue-600 bg-blue-500/5';
  return 'border-slate-400/50 text-slate-600 bg-slate-200/40';
};

export function PlanTrackerTable({ onShowOnMap }: PlanTrackerTableProps) {
  const router = useRouter();
  const { data: plans, isLoading, error, refetch, isRefetching } = usePlans();
  const [statusFilter, setStatusFilter] = useState<PlanStatusOptions | 'all'>(
    'all',
  );
  const [urgencyFilter, setUrgencyFilter] = useState<
    'all' | 'high' | 'medium' | 'low' | 'none'
  >('all');

  const renderStatusBadge = (status?: PlanStatusOptions) => {
    const config = status ? statusConfig[status] : statusConfig.unknown;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const filteredPlans = useMemo(() => {
    if (!plans) return [];

    return plans.filter((plan) => {
      const statusOk =
        statusFilter === 'all' ? true : plan.status === statusFilter;
      const score = plan.expand?.object?.urgency_score;

      const urgencyOk = (() => {
        if (urgencyFilter === 'all') return true;
        if (urgencyFilter === 'high') return (score ?? 0) >= 80;
        if (urgencyFilter === 'medium')
          return score !== undefined && score >= 50 && score < 80;
        if (urgencyFilter === 'low')
          return score !== undefined && score >= 20 && score < 50;
        if (urgencyFilter === 'none') return score === undefined || score < 20;
        return true;
      })();

      return statusOk && urgencyOk;
    });
  }, [plans, statusFilter, urgencyFilter]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card">
        <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка планов...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/50 bg-card">
        <CardContent className="py-8 flex items-center justify-between text-sm">
          <div className="text-destructive">Не удалось загрузить планы</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Трекер задач
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Показано: {filteredPlans.length} / {plans?.length ?? 0}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              title="Обновить"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefetching ? 'animate-spin text-muted-foreground' : ''}`}
              />
            </Button>
          </div>
        </CardTitle>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Статус:</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as PlanStatusOptions | 'all')
              }
            >
              <option value="all">Все</option>
              <option value={PlanStatusOptions.pending}>В работе</option>
              <option value={PlanStatusOptions.created}>Создан</option>
              <option value={PlanStatusOptions.done}>Выполнен</option>
              <option value={PlanStatusOptions.archive}>Архив</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span>Срочность:</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              value={urgencyFilter}
              onChange={(e) =>
                setUrgencyFilter(e.target.value as typeof urgencyFilter)
              }
            >
              <option value="all">Все</option>
              <option value="high">Высокая (80+)</option>
              <option value="medium">Средняя (50-79)</option>
              <option value="low">Низкая (20-49)</option>
              <option value="none">Нет / &lt;20</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground">
                Объект
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Срочность
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Статус
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Прогресс
              </TableHead>
              <TableHead className="w-28 text-right text-xs font-medium text-muted-foreground">
                На карте
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlans.map((plan) => {
              const object = plan.expand?.object;
              const actions = plan.expand?.actions ?? [];
              const completedActions = actions.filter(
                (action) => action.status,
              ).length;
              const totalActions = actions.length;
              const progress =
                totalActions > 0
                  ? Math.round((completedActions / totalActions) * 100)
                  : 0;
              const objectId = object?.id ?? plan.object ?? '';

              return (
                <TableRow
                  key={plan.id}
                  className="border-border/50 hover:bg-secondary/40"
                >
                  <TableCell className="space-y-1">
                    <button
                      type="button"
                      className="text-left text-sm font-semibold leading-tight cursor-pointer underline-offset-2 hover:underline"
                      onClick={() =>
                        objectId && router.push(`/plan/${objectId}`)
                      }
                    >
                      {object?.name ?? 'Без названия'}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      План: {plan.id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getUrgencyBadgeClass(object?.urgency_score)}`}
                    >
                      {object?.urgency_score ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>{renderStatusBadge(plan.status)}</TableCell>
                  <TableCell className="min-w-[180px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {completedActions}/{totalActions || 0}
                        </span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs cursor-pointer"
                      onClick={() => objectId && onShowOnMap?.(objectId)}
                      disabled={!objectId}
                    >
                      <MapPin className="h-4 w-4" />
                      Открыть
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredPlans.length === 0 && (plans?.length ?? 0) > 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-base font-semibold text-foreground">
                      Нет планов по текущим фильтрам
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Попробуйте изменить статус или срочность.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatusFilter('all');
                        setUrgencyFilter('all');
                      }}
                    >
                      Сбросить фильтры
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {plans?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  Планы отсутствуют
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
