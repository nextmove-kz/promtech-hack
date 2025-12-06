import type { ObjectsHealthStatusOptions } from "@/app/api/api_types";

export type HealthStatusKey = ObjectsHealthStatusOptions | "UNKNOWN";

export const HEALTH_STATUS_CONFIG: Record<
  HealthStatusKey,
  {
    label: string;
    variant: "outline" | "secondary" | "destructive";
    iconColor: string;
    iconBg: string;
  }
> = {
  OK: {
    label: "Норма",
    variant: "outline",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
  WARNING: {
    label: "Предупреждение",
    variant: "secondary",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
  },
  CRITICAL: {
    label: "Критический",
    variant: "destructive",
    iconColor: "text-red-600",
    iconBg: "bg-red-100",
  },
  UNKNOWN: {
    label: "Неизвестно",
    variant: "outline",
    iconColor: "text-gray-600",
    iconBg: "bg-gray-100",
  },
};

export const HEALTH_STATUS_LABELS: Record<HealthStatusKey, string> = {
  OK: HEALTH_STATUS_CONFIG.OK.label,
  WARNING: HEALTH_STATUS_CONFIG.WARNING.label,
  CRITICAL: HEALTH_STATUS_CONFIG.CRITICAL.label,
  UNKNOWN: HEALTH_STATUS_CONFIG.UNKNOWN.label,
};

export const getHealthLabel = (status?: string) => {
  const key = (status ?? "UNKNOWN") as HealthStatusKey;
  return HEALTH_STATUS_LABELS[key] ?? HEALTH_STATUS_CONFIG.UNKNOWN.label;
};

