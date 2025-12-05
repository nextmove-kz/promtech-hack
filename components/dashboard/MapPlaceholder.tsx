import { Badge } from '@/components/ui/badge'
import { Layers, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const filterPills = [
  { label: 'Defects > 30%', active: true },
  { label: 'Critical Only', active: false },
  { label: 'Recent Scans', active: true },
  { label: 'High Pressure', active: false },
]

const defectPoints = [
  { id: 'DEF-001', x: 400, y: 180, severity: 'critical' },
  { id: 'DEF-002', x: 600, y: 280, severity: 'medium' },
  { id: 'DEF-003', x: 300, y: 200, severity: 'low' },
  { id: 'DEF-004', x: 750, y: 220, severity: 'medium' },
]

interface MapPlaceholderProps {
  onDefectSelect?: (defectId: string) => void
}

export function MapPlaceholder({ onDefectSelect }: MapPlaceholderProps) {
  const [activeFilters, setActiveFilters] = useState(
    filterPills.map(p => p.active)
  )

  const toggleFilter = (index: number) => {
    setActiveFilters(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'hsl(var(--risk-critical))'
      case 'medium':
        return 'hsl(var(--risk-medium))'
      case 'low':
        return 'hsl(var(--risk-low))'
      default:
        return 'hsl(var(--primary))'
    }
  }

  return (
    <div className='relative h-full w-full overflow-hidden bg-background'>
      {/* Filter Pills */}
      <div className='absolute left-4 top-4 z-10 flex flex-wrap gap-2'>
        {filterPills.map((pill, index) => (
          <Badge
            key={pill.label}
            variant={activeFilters[index] ? 'default' : 'secondary'}
            className='cursor-pointer transition-colors hover:bg-primary/80'
            onClick={() => toggleFilter(index)}
          >
            {pill.label}
          </Badge>
        ))}
      </div>

      {/* Layer Toggle */}
      <div className='absolute right-4 top-4 z-10'>
        <Button variant='secondary' size='icon' className='h-9 w-9'>
          <Layers className='h-4 w-4' />
        </Button>
      </div>

      {/* Grid Pattern */}
      <div
        className='absolute inset-0 opacity-20'
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Simulated Pipeline Network */}
      <svg className='absolute inset-0 h-full w-full'>
        {/* Main pipelines */}
        <path
          d='M 50 300 Q 300 200 500 250 T 900 200 T 1400 250'
          stroke='hsl(var(--primary))'
          strokeWidth='4'
          fill='none'
          className='opacity-60'
        />
        <path
          d='M 100 450 Q 400 500 700 400 T 1200 450'
          stroke='hsl(var(--primary))'
          strokeWidth='3'
          fill='none'
          className='opacity-40'
        />
        <path
          d='M 200 150 L 400 250 L 700 200 L 1000 280'
          stroke='hsl(var(--primary))'
          strokeWidth='3'
          fill='none'
          className='opacity-40'
        />
        <path
          d='M 500 250 L 600 350 L 800 320'
          stroke='hsl(var(--primary))'
          strokeWidth='2'
          fill='none'
          className='opacity-30'
        />

        {/* Defect Points (clickable) */}
        {defectPoints.map(point => (
          <g
            key={point.id}
            className='cursor-pointer'
            onClick={() => onDefectSelect?.(point.id)}
          >
            {point.severity === 'critical' && (
              <circle
                cx={point.x}
                cy={point.y}
                r='20'
                fill='none'
                stroke={getSeverityColor(point.severity)}
                strokeWidth='2'
                className='animate-ping opacity-50'
              />
            )}
            <circle
              cx={point.x}
              cy={point.y}
              r={point.severity === 'critical' ? 10 : 8}
              fill={getSeverityColor(point.severity)}
              className={point.severity === 'critical' ? 'animate-pulse' : ''}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={point.severity === 'critical' ? 14 : 12}
              fill='transparent'
              stroke={getSeverityColor(point.severity)}
              strokeWidth='2'
              className='opacity-50 transition-opacity hover:opacity-100'
            />
          </g>
        ))}

        {/* Junction Points */}
        <circle cx='500' cy='250' r='6' fill='hsl(var(--primary))' />
        <circle cx='700' cy='200' r='6' fill='hsl(var(--primary))' />
        <circle cx='900' cy='200' r='6' fill='hsl(var(--primary))' />
      </svg>

      {/* Zoom Controls */}
      <div className='absolute bottom-6 right-4 z-10 flex flex-col gap-1'>
        <Button variant='secondary' size='icon' className='h-9 w-9'>
          <ZoomIn className='h-4 w-4' />
        </Button>
        <Button variant='secondary' size='icon' className='h-9 w-9'>
          <ZoomOut className='h-4 w-4' />
        </Button>
      </div>

      {/* Legend */}
      <div className='absolute bottom-6 left-4 z-10 rounded-md border border-border/50 bg-card/90 p-3 backdrop-blur-sm'>
        <div className='space-y-2 text-xs'>
          <div className='flex items-center gap-2'>
            <div className='h-2 w-6 rounded-full bg-primary opacity-60' />
            <span className='text-muted-foreground'>Active Pipeline</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-3 w-3 rounded-full bg-risk-critical' />
            <span className='text-muted-foreground'>Critical Defect</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-3 w-3 rounded-full bg-risk-medium' />
            <span className='text-muted-foreground'>Medium Risk</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='h-3 w-3 rounded-full bg-risk-low' />
            <span className='text-muted-foreground'>Low Risk</span>
          </div>
        </div>
      </div>
    </div>
  )
}
