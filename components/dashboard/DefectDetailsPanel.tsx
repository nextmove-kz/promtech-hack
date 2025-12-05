import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Download,
  AlertTriangle,
  MapPin,
  Calendar,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DefectDetailsPanelProps {
  defectId: string | null
  onClose: () => void
}

const defectData: Record<
  string,
  {
    id: string
    name: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    location: string
    pipeline: string
    corrosionDepth: number
    lastInspection: string
    material: string
    pressure: string
    yearInstalled: number
    description: string
  }
> = {
  'DEF-001': {
    id: 'DEF-001',
    name: 'Wall Thinning Anomaly',
    severity: 'critical',
    location: 'KP 45.2',
    pipeline: 'MT-02 Main Trunk',
    corrosionDepth: 68,
    lastInspection: '2024-01-15',
    material: 'Carbon Steel X52',
    pressure: '72 bar',
    yearInstalled: 1998,
    description:
      'Significant wall loss detected. External corrosion suspected due to coating damage.',
  },
  'DEF-002': {
    id: 'DEF-002',
    name: 'Dent with Metal Loss',
    severity: 'medium',
    location: 'KP 78.9',
    pipeline: 'BR-04 Branch',
    corrosionDepth: 35,
    lastInspection: '2024-02-20',
    material: 'Carbon Steel X60',
    pressure: '65 bar',
    yearInstalled: 2005,
    description:
      'Mechanical damage with associated metal loss. Monitoring recommended.',
  },
  'DEF-003': {
    id: 'DEF-003',
    name: 'Minor Pitting',
    severity: 'low',
    location: 'KP 23.1',
    pipeline: 'MT-02 Main Trunk',
    corrosionDepth: 12,
    lastInspection: '2024-03-01',
    material: 'Carbon Steel X52',
    pressure: '72 bar',
    yearInstalled: 1998,
    description:
      'Scattered pitting within acceptable limits. Continue routine monitoring.',
  },
  'DEF-004': {
    id: 'DEF-004',
    name: 'Girth Weld Anomaly',
    severity: 'medium',
    location: 'KP 92.4',
    pipeline: 'BR-04 Branch',
    corrosionDepth: 28,
    lastInspection: '2024-01-28',
    material: 'Carbon Steel X60',
    pressure: '65 bar',
    yearInstalled: 2005,
    description: 'Weld-related indication requiring further assessment.',
  },
}

const severityConfig = {
  critical: {
    label: 'Critical',
    variant: 'destructive' as const,
    color: 'text-risk-critical',
  },
  high: {
    label: 'High',
    variant: 'destructive' as const,
    color: 'text-risk-high',
  },
  medium: {
    label: 'Medium',
    variant: 'secondary' as const,
    color: 'text-risk-medium',
  },
  low: { label: 'Low', variant: 'outline' as const, color: 'text-risk-low' },
}

export function DefectDetailsPanel({
  defectId,
  onClose,
}: DefectDetailsPanelProps) {
  if (!defectId) return null

  const defect = defectData[defectId]
  if (!defect) return null

  const severity = severityConfig[defect.severity]

  return (
    <div className='h-full w-96 shrink-0 border-l border-border bg-card'>
      <div className='flex h-full flex-col'>
        {/* Header */}
        <div className='border-b border-border p-4'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onClose}
            className='mb-3 gap-1.5 -ml-2 text-muted-foreground hover:text-foreground'
          >
            <ArrowLeft className='h-4 w-4' />
            Back to list
          </Button>
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'rounded-md p-2',
                defect.severity === 'critical'
                  ? 'bg-risk-critical/20'
                  : 'bg-muted'
              )}
            >
              <AlertTriangle className={cn('h-5 w-5', severity.color)} />
            </div>
            <div>
              <h2 className='font-semibold text-foreground'>{defect.id}</h2>
              <Badge variant={severity.variant} className='mt-1'>
                {severity.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-auto p-4'>
          <div className='space-y-6'>
            {/* Defect Name & Description */}
            <div>
              <h3 className='text-lg font-medium text-foreground'>
                {defect.name}
              </h3>
              <p className='mt-1 text-sm text-muted-foreground'>
                {defect.description}
              </p>
            </div>

            {/* Corrosion Depth */}
            <Card className='border-border/50'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  Corrosion Depth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-end gap-2'>
                  <span
                    className={cn(
                      'text-3xl font-bold tabular-nums',
                      severity.color
                    )}
                  >
                    {defect.corrosionDepth}%
                  </span>
                  <span className='mb-1 text-sm text-muted-foreground'>
                    of wall thickness
                  </span>
                </div>
                <Progress value={defect.corrosionDepth} className='mt-2 h-2' />
              </CardContent>
            </Card>

            <Separator />

            {/* Properties Grid */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 text-muted-foreground'>
                  <MapPin className='h-3.5 w-3.5' />
                  <span className='text-xs'>Location</span>
                </div>
                <p className='font-medium text-foreground'>{defect.location}</p>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 text-muted-foreground'>
                  <Calendar className='h-3.5 w-3.5' />
                  <span className='text-xs'>Last Inspection</span>
                </div>
                <p className='font-medium text-foreground'>
                  {defect.lastInspection}
                </p>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 text-muted-foreground'>
                  <Wrench className='h-3.5 w-3.5' />
                  <span className='text-xs'>Material</span>
                </div>
                <p className='font-medium text-foreground'>{defect.material}</p>
              </div>
              <div className='space-y-1'>
                <span className='text-xs text-muted-foreground'>Pressure</span>
                <p className='font-medium text-foreground'>{defect.pressure}</p>
              </div>
              <div className='space-y-1'>
                <span className='text-xs text-muted-foreground'>Pipeline</span>
                <p className='font-medium text-foreground'>{defect.pipeline}</p>
              </div>
              <div className='space-y-1'>
                <span className='text-xs text-muted-foreground'>
                  Year Installed
                </span>
                <p className='font-medium text-foreground'>
                  {defect.yearInstalled}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className='border-t border-border p-4'>
          <Button className='w-full gap-2'>
            <Download className='h-4 w-4' />
            Export Report (PDF)
          </Button>
        </div>
      </div>
    </div>
  )
}
