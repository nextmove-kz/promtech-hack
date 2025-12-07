import type { ObjectsHealthStatusOptions } from '@/app/api/api_types';

type UrgencySource = {
  urgency_score?: number | null;
  health_status?: ObjectsHealthStatusOptions | null;
};

/**
 * Returns the urgency score for display. If the object has no health status
 * (no diagnostics yet) or no urgency value, we surface -1 instead of 0.
 */
export function deriveUrgencyScore(source: UrgencySource): number {
  if (!source.health_status) return -1;
  const score = source.urgency_score;
  return score === null || score === undefined ? -1 : score;
}

/**
 * Produces a copy of the entity with urgency_score replaced by the derived
 * display value so downstream consumers don't need to duplicate the check.
 */
export function withDerivedUrgencyScore<T extends UrgencySource>(
  source: T,
): T & { urgency_score: number } {
  return {
    ...source,
    urgency_score: deriveUrgencyScore(source),
  };
}

