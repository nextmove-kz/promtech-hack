'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import clientPocketBase from '@/app/api/client_pb';
import type {
  ObjectsResponse,
  DiagnosticsResponse,
  PlanResponse,
  PipelinesResponse,
} from '@/app/api/api_types';
import { withDerivedUrgencyScore } from '@/lib/utils/urgency';

export interface StatsReportData {
  pipeline: PipelinesResponse | null;
  objects: ObjectsResponse[];
  diagnostics: DiagnosticsResponse[];
  plans: PlanResponse[];
  kpiMetrics: {
    safetyScore: number;
    avgUrgency: number;
    activeAnomalies: number;
    pendingActions: number;
    totalObjects: number;
    totalDiagnostics: number;
    criticalCount: number;
    warningCount: number;
  };
  criticalObjects: ObjectsResponse[];
  defectiveDiagnostics: Array<
    DiagnosticsResponse & { expand?: { object?: ObjectsResponse } }
  >;
}

export function useStatsReportData(pipelineId: string | null | undefined) {
  // Fetch pipelines to get pipeline metadata
  const { data: pipelines = [] } = useQuery<PipelinesResponse[]>({
    queryKey: ['pipelines'],
    queryFn: async () =>
      clientPocketBase.collection('pipelines').getFullList<PipelinesResponse>(),
    staleTime: Infinity,
  });

  // Fetch all objects
  const { data: allObjects = [], isLoading: objectsLoading } = useQuery<
    ObjectsResponse[]
  >({
    queryKey: ['objects'],
    queryFn: async () => {
      const records = await clientPocketBase
        .collection('objects')
        .getFullList<ObjectsResponse>({ sort: '-created', expand: 'pipeline' });
      return records.map((r) => withDerivedUrgencyScore(r));
    },
  });

  // Fetch all diagnostics with object expansion
  const { data: allDiagnostics = [], isLoading: diagnosticsLoading } = useQuery<
    Array<DiagnosticsResponse & { expand?: { object?: ObjectsResponse } }>
  >({
    queryKey: ['diagnostics-expanded'],
    queryFn: async () =>
      clientPocketBase.collection('diagnostics').getFullList({
        sort: '-created',
        expand: 'object,object.pipeline',
      }),
  });

  // Fetch all plans
  const { data: allPlans = [], isLoading: plansLoading } = useQuery<
    PlanResponse[]
  >({
    queryKey: ['plans'],
    queryFn: async () =>
      clientPocketBase
        .collection('plan')
        .getFullList<PlanResponse>({ sort: '-created' }),
  });

  const isLoading = objectsLoading || diagnosticsLoading || plansLoading;

  // Memoize processed data
  const reportData = useMemo<StatsReportData | null>(() => {
    if (isLoading) return null;

    const pipeline = pipelineId
      ? (pipelines.find((p) => p.id === pipelineId) ?? null)
      : null;

    // Filter by pipeline
    const objects = pipelineId
      ? allObjects.filter((obj) => obj.pipeline === pipelineId)
      : allObjects;

    const objectIds = objects.map((o) => o.id);
    const diagnostics = allDiagnostics.filter((d) =>
      objectIds.includes(d.object),
    );

    // Calculate KPIs (same logic as KPICards)
    const avgUrgency =
      objects.length > 0
        ? objects.reduce((sum, obj) => sum + (obj.urgency_score || 0), 0) /
          objects.length
        : 0;

    const safetyScore = Math.round(100 - avgUrgency);
    const activeAnomalies = objects.filter(
      (obj) => obj.health_status !== 'OK',
    ).length;
    const pendingActions = allPlans.filter(
      (p) => p.status === 'pending' || p.status === 'created',
    ).length;

    const criticalCount = objects.filter(
      (o) => o.health_status === 'CRITICAL',
    ).length;
    const warningCount = objects.filter(
      (o) => o.health_status === 'WARNING',
    ).length;

    // Get top 5 critical objects
    const criticalObjects = [...objects]
      .sort((a, b) => (b.urgency_score || 0) - (a.urgency_score || 0))
      .slice(0, 5);

    // Get defective diagnostics
    const defectiveDiagnostics = diagnostics.filter(
      (d) => d.defect_found === true,
    );

    return {
      pipeline,
      objects,
      diagnostics,
      plans: allPlans,
      kpiMetrics: {
        safetyScore,
        avgUrgency,
        activeAnomalies,
        pendingActions,
        totalObjects: objects.length,
        totalDiagnostics: diagnostics.length,
        criticalCount,
        warningCount,
      },
      criticalObjects,
      defectiveDiagnostics,
    };
  }, [isLoading, pipelineId, pipelines, allObjects, allDiagnostics, allPlans]);

  return {
    data: reportData,
    isLoading,
    error: null,
  };
}
