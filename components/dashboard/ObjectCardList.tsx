import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Maximize2 } from 'lucide-react'

interface ObjectCardListProps {
  onCardSelect: (id: string) => void
  onExpandTable: () => void
  selectedId: string | null
}

const mockObjects = [
  {
    id: 'DEF-001',
    name: 'Кластер потери металла A',
    severity: 'critical',
    depth: '72%',
    location: 'KP 45.2',
  },
  {
    id: 'DEF-002',
    name: 'Вмятина #127',
    severity: 'medium',
    depth: '34%',
    location: 'KP 67.8',
  },
  {
    id: 'DEF-003',
    name: 'Участок коррозии B',
    severity: 'low',
    depth: '18%',
    location: 'KP 89.1',
  },
  {
    id: 'DEF-004',
    name: 'Аномалия сварного шва #45',
    severity: 'critical',
    depth: '65%',
    location: 'KP 112.4',
  },
  {
    id: 'DEF-005',
    name: 'Внешняя коррозия',
    severity: 'medium',
    depth: '41%',
    location: 'KP 134.7',
  },
  {
    id: 'DEF-006',
    name: 'Расслоение #12',
    severity: 'low',
    depth: '22%',
    location: 'KP 156.3',
  },
]

const severityConfig: Record<
  string,
  { variant: 'destructive' | 'secondary' | 'outline'; label: string }
> = {
  critical: { variant: 'destructive', label: 'Критический' },
  medium: { variant: 'secondary', label: 'Средний' },
  low: { variant: 'outline', label: 'Низкий' },
}

export function ObjectCardList({
  onCardSelect,
  onExpandTable,
  selectedId,
}: ObjectCardListProps) {
  return (
    <div className='flex h-full w-1/4 shrink-0 flex-col border-l border-border bg-card overflow-hidden'>
      <div className='flex items-center justify-between border-b border-border px-4 py-3'>
        <span className='text-sm font-medium text-foreground'>
          Объекты ({mockObjects.length})
        </span>
        <Button
          variant='ghost'
          size='sm'
          onClick={onExpandTable}
          className='gap-1.5 text-muted-foreground'
        >
          <Maximize2 className='h-4 w-4' />
          Развернуть
        </Button>
      </div>

      <ScrollArea className='flex-1'>
        <div className='space-y-2 p-3'>
          {mockObjects.map(obj => {
            const config = severityConfig[obj.severity]
            const isSelected = selectedId === obj.id

            return (
              <button
                key={obj.id}
                onClick={() => onCardSelect(obj.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className='flex items-start justify-between gap-2 min-w-0'>
                  <div className='min-w-0 flex-1 overflow-hidden'>
                    <p className='truncate text-sm font-medium text-foreground'>
                      {obj.name}
                    </p>
                    <p className='mt-0.5 text-xs text-muted-foreground truncate'>
                      {obj.id} · {obj.location}
                    </p>
                  </div>
                  <Badge variant={config.variant} className='shrink-0 text-xs'>
                    {config.label}
                  </Badge>
                </div>
                <div className='mt-2 flex items-center gap-1.5'>
                  <div className='h-1.5 flex-1 rounded-full bg-muted'>
                    <div
                      className={`h-full rounded-full ${
                        obj.severity === 'critical'
                          ? 'bg-destructive'
                          : obj.severity === 'medium'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: obj.depth }}
                    />
                  </div>
                  <span className='text-xs tabular-nums text-muted-foreground'>
                    {obj.depth}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
