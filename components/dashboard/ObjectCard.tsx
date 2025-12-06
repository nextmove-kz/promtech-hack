'use client'

import { Badge } from '@/components/ui/badge'
import type { ObjectsResponse } from '@/app/api/api_types'
import { getHealthStyles } from '@/lib/objectHealthStyles'

const typeLabels: Record<string, string> = {
  crane: 'Кран',
  compressor: 'Компрессор',
  pipeline_section: 'Участок трубопровода',
}

interface ObjectCardProps {
  object: ObjectsResponse
  isSelected: boolean
  onSelect: (id: string) => void
}

export function ObjectCard({ object, isSelected, onSelect }: ObjectCardProps) {
  const statusStyles = getHealthStyles(object.health_status)
  const typeLabel = typeLabels[object.type ?? ''] || object.type || '—'

  return (
    <button
      onClick={() => onSelect(object.id)}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        statusStyles.borderClass
      } ${
        isSelected
          ? 'border-primary bg-primary/5'
          : `border-border bg-background ${statusStyles.hoverClass}`
      }`}
    >
      <div className='flex items-start justify-between gap-2 min-w-0'>
        <div className='min-w-0 flex-1 overflow-hidden'>
          <p className='truncate text-sm font-medium text-foreground'>
            {object.name || 'Без названия'}
          </p>
          <p className='mt-0.5 text-xs text-muted-foreground truncate'>
            {typeLabel} · {object.material || '—'}
          </p>
        </div>
        <Badge
          variant='outline'
          className={`shrink-0 text-xs ${statusStyles.badgeClass}`}
        >
          {object.urgency_score ?? '—'}
        </Badge>
      </div>
      {object.year && (
        <p className='mt-2 text-xs text-muted-foreground'>Год: {object.year}</p>
      )}
    </button>
  )
}
