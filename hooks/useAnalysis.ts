'use client';

import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { AnalysisResponse, AnalysisResult } from '@/app/api/analyze/route';
import type { GetObjectsResult, ObjectWithPipeline } from '@/app/api/objects';

interface UseAnalysisOptions {
  onSuccess?: (result: AnalysisResult) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface BatchAnalysisState {
  isRunning: boolean;
  currentIndex: number;
  total: number;
  results: Map<string, AnalysisResult>;
  errors: Map<string, string>;
}

type ObjectsQueryData = GetObjectsResult | InfiniteData<GetObjectsResult>;

const patchObjectsCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  objectId: string,
  patch: Partial<ObjectWithPipeline>,
) => {
  queryClient.setQueriesData<ObjectsQueryData>(
    { queryKey: ['objects'] },
    (existing) => {
      if (!existing) return existing;

      const applyPatch = (item: ObjectWithPipeline) =>
        item.id === objectId ? { ...item, ...patch } : item;

      if ('pages' in existing) {
        const data = existing as InfiniteData<GetObjectsResult>;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map(applyPatch),
          })),
        };
      }

      if ('items' in existing) {
        const data = existing as GetObjectsResult;
        return {
          ...data,
          items: data.items.map(applyPatch),
        };
      }

      return existing;
    },
  );
};

const buildAnalysisPatch = (
  objectId: string,
  result: AnalysisResult,
): Partial<ObjectWithPipeline> => {
  const timestamp = new Date().toISOString();
  return {
    id: objectId,
    health_status: result.health_status,
    urgency_score: result.urgency_score,
    ai_summary: result.ai_summary,
    recommended_action: result.recommended_action,
    has_defects: result.has_defects,
    last_analysis_at: timestamp,
    updated: timestamp,
  };
};

/**
 * Hook for analyzing a single object
 */
export function useObjectAnalysis(options: UseAnalysisOptions = {}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (objectId: string): Promise<AnalysisResponse> => {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object_id: objectId }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.result) {
        options.onSuccess?.(data.result);
        patchObjectsCache(
          queryClient,
          data.object_id,
          buildAnalysisPatch(data.object_id, data.result),
        );
      }
    },
    onError: (error) => {
      options.onError?.(error as Error);
    },
  });

  return {
    analyze: mutation.mutate,
    analyzeAsync: mutation.mutateAsync,
    isAnalyzing: mutation.isPending,
    result: mutation.data?.result,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Hook for batch analyzing multiple objects
 */
export function useBatchAnalysis(options: UseAnalysisOptions = {}) {
  const queryClient = useQueryClient();
  const onComplete = options.onComplete;
  const [state, setState] = useState<BatchAnalysisState>({
    isRunning: false,
    currentIndex: 0,
    total: 0,
    results: new Map(),
    errors: new Map(),
  });

  const fetchPriorityQueue = useCallback(
    async (highRiskOnly: boolean = true): Promise<string[]> => {
      const response = await fetch('/api/analyze', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prioritize_high_risk: highRiskOnly }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch objects');
      }

      const data = await response.json();
      return data.object_ids || [];
    },
    [],
  );

  const analyzeObject = useCallback(
    async (objectId: string): Promise<AnalysisResponse> => {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object_id: objectId }),
      });

      return response.json();
    },
    [],
  );

  const runBatchAnalysis = useCallback(
    async (
      objectIds?: string[],
      runOptions: { highRiskOnly?: boolean; delayMs?: number } = {},
    ) => {
      const { highRiskOnly = true, delayMs = 300 } = runOptions;

      setState((prev) => ({
        ...prev,
        isRunning: true,
        currentIndex: 0,
        results: new Map(),
        errors: new Map(),
      }));

      try {
        // Get objects to analyze
        const ids = objectIds || (await fetchPriorityQueue(highRiskOnly));
        setState((prev) => ({ ...prev, total: ids.length }));

        if (ids.length === 0) {
          setState((prev) => ({ ...prev, isRunning: false }));
          return { results: new Map(), errors: new Map() };
        }

        const results = new Map<string, AnalysisResult>();
        const errors = new Map<string, string>();

        for (let i = 0; i < ids.length; i++) {
          const objectId = ids[i];
          setState((prev) => ({ ...prev, currentIndex: i + 1 }));

          try {
            const response = await analyzeObject(objectId);

            if (response.success && response.result) {
              results.set(objectId, response.result);
              patchObjectsCache(
                queryClient,
                objectId,
                buildAnalysisPatch(objectId, response.result),
              );
            } else {
              errors.set(objectId, response.error || 'Unknown error');
            }
          } catch (error) {
            errors.set(
              objectId,
              error instanceof Error ? error.message : 'Unknown error',
            );
          }

          // Update state with current progress
          setState((prev) => ({
            ...prev,
            results: new Map(results),
            errors: new Map(errors),
          }));

          // Delay between requests
          if (i < ids.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }

        onComplete?.();

        return { results, errors };
      } finally {
        setState((prev) => ({ ...prev, isRunning: false }));
      }
    },
    [fetchPriorityQueue, analyzeObject, queryClient, onComplete],
  );

  const reset = useCallback(() => {
    setState({
      isRunning: false,
      currentIndex: 0,
      total: 0,
      results: new Map(),
      errors: new Map(),
    });
  }, []);

  return {
    runBatchAnalysis,
    reset,
    ...state,
    progress: state.total > 0 ? (state.currentIndex / state.total) * 100 : 0,
    summary: {
      total: state.total,
      completed: state.results.size + state.errors.size,
      successful: state.results.size,
      failed: state.errors.size,
      critical: Array.from(state.results.values()).filter(
        (r) => r.health_status === 'CRITICAL',
      ).length,
      warning: Array.from(state.results.values()).filter(
        (r) => r.health_status === 'WARNING',
      ).length,
      ok: Array.from(state.results.values()).filter(
        (r) => r.health_status === 'OK',
      ).length,
    },
  };
}

/**
 * Helper hook to get high-risk object IDs for targeted analysis
 */
export function useHighRiskObjects() {
  const [objectIds, setObjectIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHighRiskObjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prioritize_high_risk: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch high-risk objects');
      }

      const data = await response.json();
      setObjectIds(data.object_ids || []);
      return data.object_ids || [];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    objectIds,
    isLoading,
    error,
    fetchHighRiskObjects,
  };
}
