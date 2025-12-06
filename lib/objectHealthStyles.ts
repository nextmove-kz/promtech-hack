import type { ObjectsHealthStatusOptions } from '@/app/api/api_types'

type HealthStatus = ObjectsHealthStatusOptions | 'UNKNOWN'

const healthStyles: Record<
  HealthStatus,
  { badgeClass: string; borderClass: string; hoverClass: string }
> = {
  OK: {
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderClass: 'border-l-4 border-l-emerald-500',
    hoverClass: 'hover:bg-muted/70',
  },
  WARNING: {
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    borderClass: 'border-l-4 border-l-amber-500',
    hoverClass: 'hover:bg-muted/70',
  },
  CRITICAL: {
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    borderClass: 'border-l-4 border-l-red-600',
    hoverClass: 'hover:bg-muted/70',
  },
  UNKNOWN: {
    badgeClass: 'bg-muted text-foreground border-border',
    borderClass: 'border-l-4 border-l-border',
    hoverClass: 'hover:bg-muted/70',
  },
}

export function getHealthStyles(status?: ObjectsHealthStatusOptions | null) {
  const key = (status ?? 'UNKNOWN') as HealthStatus
  return healthStyles[key] ?? healthStyles.UNKNOWN
}
