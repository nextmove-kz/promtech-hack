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
    name: 'Аномалия истончения стенки',
    severity: 'critical',
    location: 'KP 45.2',
    pipeline: 'MT-02 Главная магистраль',
    corrosionDepth: 68,
    lastInspection: '2024-01-15',
    material: 'Углеродистая сталь X52',
    pressure: '72 бар',
    yearInstalled: 1998,
    description:
      'Обнаружена значительная потеря толщины стенки. Подозрение на внешнюю коррозию из-за повреждения покрытия.',
  },
  'DEF-002': {
    id: 'DEF-002',
    name: 'Вмятина с потерей металла',
    severity: 'medium',
    location: 'KP 78.9',
    pipeline: 'BR-04 Отвод',
    corrosionDepth: 35,
    lastInspection: '2024-02-20',
    material: 'Углеродистая сталь X60',
    pressure: '65 бар',
    yearInstalled: 2005,
    description:
      'Механическое повреждение с сопутствующей потерей металла. Рекомендуется мониторинг.',
  },
  'DEF-003': {
    id: 'DEF-003',
    name: 'Незначительное питтингование',
    severity: 'low',
    location: 'KP 23.1',
    pipeline: 'MT-02 Главная магистраль',
    corrosionDepth: 12,
    lastInspection: '2024-03-01',
    material: 'Углеродистая сталь X52',
    pressure: '72 бар',
    yearInstalled: 1998,
    description:
      'Разрозненное питтингование в пределах допустимых норм. Продолжить плановый мониторинг.',
  },
  'DEF-004': {
    id: 'DEF-004',
    name: 'Аномалия кольцевого шва',
    severity: 'medium',
    location: 'KP 92.4',
    pipeline: 'BR-04 Отвод',
    corrosionDepth: 28,
    lastInspection: '2024-01-28',
    material: 'Углеродистая сталь X60',
    pressure: '65 бар',
    yearInstalled: 2005,
    description:
      'Индикация, связанная со сварным швом, требующая дальнейшей оценки.',
  },
}

const severityConfig = {
  critical: {
    label: 'Критический',
    variant: 'destructive' as const,
    color: 'text-risk-critical',
  },
  high: {
    label: 'Высокий',
    variant: 'destructive' as const,
    color: 'text-risk-high',
  },
  medium: {
    label: 'Средний',
    variant: 'secondary' as const,
    color: 'text-risk-medium',
  },
  low: { label: 'Низкий', variant: 'outline' as const, color: 'text-risk-low' },
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
    <div className='h-full w-1/4 shrink-0 border-l border-border bg-card overflow-hidden'>
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
            Назад к списку
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
                  Глубина коррозии
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
                    от толщины стенки
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
                  <span className='text-xs'>Местоположение</span>
                </div>
                <p className='font-medium text-foreground'>{defect.location}</p>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 text-muted-foreground'>
                  <Calendar className='h-3.5 w-3.5' />
                  <span className='text-xs'>Последний осмотр</span>
                </div>
                <p className='font-medium text-foreground'>
                  {defect.lastInspection}
                </p>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 text-muted-foreground'>
                  <Wrench className='h-3.5 w-3.5' />
                  <span className='text-xs'>Материал</span>
                </div>
                <p className='font-medium text-foreground'>{defect.material}</p>
              </div>
              <div className='space-y-1'>
                <span className='text-xs text-muted-foreground'>Давление</span>
                <p className='font-medium text-foreground'>{defect.pressure}</p>
              </div>
              <div className='space-y-1'>
                <span className='text-xs text-muted-foreground'>
                  Трубопровод
                </span>
                <p className='font-medium text-foreground'>{defect.pipeline}</p>
              </div>
              <div className='space-y-1'>
                <span className='text-xs text-muted-foreground'>
                  Год установки
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
            Экспорт отчета (PDF)
          </Button>
        </div>
      </div>
    </div>
  )
}
