import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllPlans,
  getPlan,
  getPlanByObjectId,
  getLatestDiagnostic,
  getPlanHistory,
  updateActionStatus,
  updatePlanStatus,
  type PlanWithExpanded,
  type DiagnosticWithObject,
} from '@/app/api/plan';
import type { PlanStatusOptions, ActionResponse } from '@/app/api/api_types';

/**
 * Hook to fetch a plan by object ID
 */
export function usePlanByObjectId(objectId: string | null) {
  return useQuery<PlanWithExpanded | null>({
    queryKey: ['plan', 'byObject', objectId],
    queryFn: () => {
      if (!objectId) return null;
      return getPlanByObjectId(objectId);
    },
    enabled: !!objectId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch all plans
 */
export function usePlans() {
  return useQuery<PlanWithExpanded[]>({
    queryKey: ['plans', 'all'],
    queryFn: getAllPlans,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch a plan by plan ID (for backward compatibility)
 */
export function usePlan(planId: string | null) {
  return useQuery<PlanWithExpanded>({
    queryKey: ['plan', planId],
    queryFn: () => {
      if (!planId) throw new Error('Plan ID is required');
      return getPlan(planId);
    },
    enabled: !!planId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch all plans for an object (history)
 */
export function usePlanHistory(objectId: string | null) {
  return useQuery<PlanWithExpanded[]>({
    queryKey: ['plan', 'history', objectId],
    queryFn: () => {
      if (!objectId) return [];
      return getPlanHistory(objectId);
    },
    enabled: !!objectId,
    staleTime: 60000,
  });
}

/**
 * Hook to fetch the latest diagnostic for an object
 */
export function useLatestDiagnostic(objectId: string | null) {
  return useQuery<DiagnosticWithObject | null>({
    queryKey: ['diagnostic', 'latest', objectId],
    queryFn: () => {
      if (!objectId) return null;
      return getLatestDiagnostic(objectId);
    },
    enabled: !!objectId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to update an action's status with optimistic updates
 */
export function useUpdateActionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ actionId, status }: { actionId: string; status: boolean }) =>
      updateActionStatus(actionId, status),

    onMutate: async ({ actionId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['plan'] });

      const previousPlans = queryClient.getQueriesData<
        PlanWithExpanded | PlanWithExpanded[] | null
      >({
        queryKey: ['plan'],
      });

      const updateActionInPlan = (plan: PlanWithExpanded): PlanWithExpanded => {
        if (!plan.expand?.actions) return plan;
        return {
          ...plan,
          expand: {
            ...plan.expand,
            actions: plan.expand.actions.map((action: ActionResponse) =>
              action.id === actionId ? { ...action, status } : action,
            ),
          },
        };
      };

      queryClient.setQueriesData<PlanWithExpanded | null>(
        { queryKey: ['plan', 'byObject'] },
        (old) => (old ? updateActionInPlan(old) : old),
      );

      queryClient.setQueriesData<PlanWithExpanded>(
        {
          queryKey: ['plan'],
          predicate: (query) =>
            query.queryKey.length === 2 &&
            typeof query.queryKey[1] === 'string' &&
            query.queryKey[1] !== 'byObject' &&
            query.queryKey[1] !== 'history' &&
            query.queryKey[1] !== 'all',
        },
        (old) => (old ? updateActionInPlan(old) : old),
      );

      queryClient.setQueriesData<PlanWithExpanded[]>(
        { queryKey: ['plans', 'all'] },
        (old) => old?.map(updateActionInPlan),
      );

      queryClient.setQueriesData<PlanWithExpanded[]>(
        { queryKey: ['plan', 'history'] },
        (old) => old?.map(updateActionInPlan),
      );

      return { previousPlans };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousPlans) {
        for (const [queryKey, data] of context.previousPlans) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
  });
}

/**
 * Hook to update a plan's status with optimistic updates
 */
export function useUpdatePlanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      status,
    }: {
      planId: string;
      status: PlanStatusOptions;
    }) => updatePlanStatus(planId, status),

    onMutate: async ({ planId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['plan'] });
      await queryClient.cancelQueries({ queryKey: ['plans'] });

      const previousPlans = queryClient.getQueriesData<
        PlanWithExpanded | PlanWithExpanded[] | null
      >({
        queryKey: ['plan'],
      });
      const previousAllPlans = queryClient.getQueryData<PlanWithExpanded[]>([
        'plans',
        'all',
      ]);

      const updatePlanStatusInCache = (
        plan: PlanWithExpanded,
      ): PlanWithExpanded => {
        if (plan.id !== planId) return plan;
        return { ...plan, status };
      };

      queryClient.setQueriesData<PlanWithExpanded | null>(
        { queryKey: ['plan', 'byObject'] },
        (old) => (old && old.id === planId ? { ...old, status } : old),
      );

      queryClient.setQueryData<PlanWithExpanded>(['plan', planId], (old) =>
        old ? { ...old, status } : old,
      );

      queryClient.setQueryData<PlanWithExpanded[]>(['plans', 'all'], (old) =>
        old?.map(updatePlanStatusInCache),
      );

      queryClient.setQueriesData<PlanWithExpanded[]>(
        { queryKey: ['plan', 'history'] },
        (old) => old?.map(updatePlanStatusInCache),
      );

      return { previousPlans, previousAllPlans };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousPlans) {
        for (const [queryKey, data] of context.previousPlans) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      if (context?.previousAllPlans) {
        queryClient.setQueryData(['plans', 'all'], context.previousAllPlans);
      }
    },
  });
}
