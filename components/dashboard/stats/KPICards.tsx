'use client';

import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import pb from '@/app/api/client_pb';
import { useAtom } from 'jotai';
import { filterAtom } from '@/store/filterStore';
import type { ObjectsResponse, PlanResponse } from '@/app/api/api_types';
import { withDerivedUrgencyScore } from '@/lib/utils/urgency';

export function KPICards() {
  const [filters] = useAtom(filterAtom);
  const selectedPipelineId = filters.advanced.pipeline;

  // Fetch all objects
  const { data: allObjects = [] } = useQuery<ObjectsResponse[]>({
    queryKey: ['objects'],
    queryFn: async () => {
      const records = await pb
        .collection('objects')
        .getFullList<ObjectsResponse>({
          sort: '-created',
          expand: 'pipeline',
        });

      return records.map((record) => withDerivedUrgencyScore(record));
    },
  });

  // Filter objects by selected pipeline
  const objects = selectedPipelineId
    ? allObjects.filter((obj) => obj.pipeline === selectedPipelineId)
    : allObjects;

  // Fetch all plans
  const { data: plans = [] } = useQuery<PlanResponse[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      return await pb.collection('plan').getFullList<PlanResponse>({
        sort: '-created',
      });
    },
  });

  // Calculate average urgency score
  const avgUrgency =
    objects.length > 0
      ? objects.reduce((sum, obj) => sum + (obj.urgency_score || 0), 0) /
        objects.length
      : 0;

  // Determine urgency status
  const getUrgencyStatus = (
    score: number,
  ): { label: string; color: string } => {
    if (score <= 30) return { label: 'Нормальный', color: 'text-emerald-600' };
    if (score <= 60) return { label: 'Повышенный', color: 'text-amber-600' };
    return { label: 'Критический', color: 'text-rose-600' };
  };

  const urgencyStatus = getUrgencyStatus(avgUrgency);

  // Calculate Safety Score (0-100, inverse of average urgency_score)
  const safetyScore = Math.round(100 - avgUrgency);

  // Determine safety status color
  const safetyStatus =
    safetyScore >= 70 ? 'success' : safetyScore >= 40 ? 'warning' : 'critical';

  // Count active anomalies (objects with status != OK)
  const activeAnomalies = objects.filter(
    (obj) => obj.health_status !== 'OK',
  ).length;

  // Count pending actions
  const pendingActions = plans.filter(
    (plan) => plan.status === 'pending' || plan.status === 'created',
  ).length;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Safety Score */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">
            Индекс безопасности
          </CardTitle>
          <Shield
            className={`h-4 w-4 ${
              safetyStatus === 'success'
                ? 'text-emerald-500'
                : safetyStatus === 'warning'
                  ? 'text-amber-500'
                  : 'text-rose-500'
            }`}
          />
        </CardHeader>
        <CardContent>
          <div
            className={`text-3xl font-semibold ${
              safetyStatus === 'success'
                ? 'text-emerald-600'
                : safetyStatus === 'warning'
                  ? 'text-amber-600'
                  : 'text-rose-600'
            }`}
          >
            {safetyScore}
          </div>
          <p className="mt-1 text-xs text-slate-500">шкала 0-100</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full transition-all ${
                  safetyStatus === 'success'
                    ? 'bg-emerald-500'
                    : safetyStatus === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${safetyScore}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Urgency Score */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">
            Средняя срочность
          </CardTitle>
          <TrendingUp className={`h-4 w-4 ${urgencyStatus.color}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-semibold ${urgencyStatus.color}`}>
            {avgUrgency.toFixed(1)}
          </div>
          <p className="mt-1 text-xs text-slate-500">{urgencyStatus.label}</p>
          <div className="mt-3 text-xs text-slate-400">
            по {objects.length} объектам
          </div>
        </CardContent>
      </Card>

      {/* Active Anomalies */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">
            Требуют внимания
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold text-slate-700">
            {activeAnomalies}
          </div>
          <p className="mt-1 text-xs text-slate-500">объектов с проблемами</p>
          <div className="mt-3 text-xs text-slate-400">
            из {objects.length} всего
          </div>
        </CardContent>
      </Card>

      {/* Pending Actions */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">
            Открытые задачи
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold text-slate-700">
            {pendingActions}
          </div>
          <p className="mt-1 text-xs text-slate-500">в плане действий</p>
          <div className="mt-3 text-xs text-slate-400">
            из {plans.length} всего
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
