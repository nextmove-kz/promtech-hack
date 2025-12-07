'use client';

import type { ObjectsResponse } from '@/app/api/api_types';
import { Badge } from '@/components/ui/badge';
import { OBJECT_TYPE_LABELS } from '@/lib/constants';
import { getHealthStyles } from '@/lib/objectHealthStyles';

interface ObjectCardProps {
  object: ObjectsResponse;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function ObjectCard({ object, isSelected, onSelect }: ObjectCardProps) {
  const statusStyles = getHealthStyles(object.health_status);
  const typeLabel =
    typeof object.type === 'string' && object.type in OBJECT_TYPE_LABELS
      ? OBJECT_TYPE_LABELS[object.type as keyof typeof OBJECT_TYPE_LABELS]
      : object.type || '—';

  return (
    <button
      type="button"
      onClick={() => onSelect(object.id)}
      className={`w-full rounded-lg border p-3 text-left transition-colors cursor-pointer ${
        statusStyles.borderClass
      } ${
        isSelected
          ? 'border-primary bg-primary/5'
          : `border-border bg-background ${statusStyles.hoverClass}`
      }`}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-foreground">
            {object.name || 'Без названия'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            {typeLabel} · {object.material || '—'}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`shrink-0 text-xs ${statusStyles.badgeClass}`}
        >
          {object.urgency_score ?? '—'}
        </Badge>
      </div>
      {object.year && (
        <p className="mt-2 text-xs text-muted-foreground">Год: {object.year}</p>
      )}
    </button>
  );
}
