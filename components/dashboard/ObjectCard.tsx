'use client'

import { Badge } from '@/components/ui/badge'
import type { ObjectsResponse } from '@/app/api/api_types'

const typeLabels: Record<string, string> = {
  crane: 'Кран',
  compressor: 'Компрессор',
  pipeline_section: 'Участок трубопровода',
}

const typeConfig: Record<
  string,
  { variant: 'destructive' | 'secondary' | 'outline' }
> = {
  crane: { variant: 'destructive' },
  compressor: { variant: 'secondary' },
  pipeline_section: { variant: 'outline' },
}

interface ObjectCardProps {
  object: ObjectsResponse
  isSelected: boolean
  onSelect: (id: string) => void
}

export function ObjectCard({ object, isSelected, onSelect }: ObjectCardProps) {
  const config = typeConfig[object.type ?? 'pipeline_section'] ?? {
    variant: 'outline' as const,
  }

  return (
    <button
      onClick={() => onSelect(object.id)}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50'
      }`}
    >
      <div className='flex items-start justify-between gap-2 min-w-0'>
        <div className='min-w-0 flex-1 overflow-hidden'>
          <p className='truncate text-sm font-medium text-foreground'>
            {object.name || 'Без названия'}
          </p>
          <p className='mt-0.5 text-xs text-muted-foreground truncate'>
            {object.id} · {object.material || '—'}
          </p>
        </div>
        <Badge variant={config.variant} className='shrink-0 text-xs'>
          {typeLabels[object.type ?? ''] || object.type || 'Неизвестно'}
        </Badge>
      </div>
      {object.year && (
        <p className='mt-2 text-xs text-muted-foreground'>
          Год: {object.year}
        </p>
      )}
    </button>
  )
}

