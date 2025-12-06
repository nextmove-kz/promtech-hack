import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAllPlans,
  getPlan,
  getPlanByObjectId,
  getLatestDiagnostic,
  updateActionStatus,
  updatePlanStatus,
  type PlanWithExpanded,
  type DiagnosticWithObject,
} from '@/app/api/plan'
import type { PlanStatusOptions } from '@/app/api/api_types'

/**
 * Hook to fetch a plan by object ID
 */
export function usePlanByObjectId(objectId: string | null) {
  return useQuery<PlanWithExpanded | null>({
    queryKey: ['plan', 'byObject', objectId],
    queryFn: () => {
      if (!objectId) return null
      return getPlanByObjectId(objectId)
    },
    enabled: !!objectId,
    staleTime: 60000, // 1 minute
  })
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
  })
}

/**
 * Hook to fetch a plan by plan ID (for backward compatibility)
 */
export function usePlan(planId: string | null) {
  return useQuery<PlanWithExpanded>({
    queryKey: ['plan', planId],
    queryFn: () => {
      if (!planId) throw new Error('Plan ID is required')
      return getPlan(planId)
    },
    enabled: !!planId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook to fetch the latest diagnostic for an object
 */
export function useLatestDiagnostic(objectId: string | null) {
  return useQuery<DiagnosticWithObject | null>({
    queryKey: ['diagnostic', 'latest', objectId],
    queryFn: () => {
      if (!objectId) return null
      return getLatestDiagnostic(objectId)
    },
    enabled: !!objectId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook to update an action's status
 */
export function useUpdateActionStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      actionId,
      status,
    }: {
      actionId: string
      status: boolean
    }) => updateActionStatus(actionId, status),
    onSuccess: (_, variables) => {
      // Invalidate plan queries that might contain this action
      queryClient.invalidateQueries({ queryKey: ['plan'] })
    },
  })
}

/**
 * Hook to update a plan's status
 */
export function useUpdatePlanStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      planId,
      status,
    }: {
      planId: string
      status: PlanStatusOptions
    }) => updatePlanStatus(planId, status),
    onSuccess: (_, variables) => {
      // Invalidate the specific plan query
      queryClient.invalidateQueries({ queryKey: ['plan', variables.planId] })
    },
  })
}
