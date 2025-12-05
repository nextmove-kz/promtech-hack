import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Activity, ExternalLink, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const recentScans = [
  {
    id: 'DEF-001',
    type: 'ILI прогон',
    pipeline: 'MT-02',
    date: '2024-01-15',
    method: 'MFL',
    grade: 'D',
    defects: 3,
  },
  {
    id: 'DEF-002',
    type: 'Прямая оценка',
    pipeline: 'BR-04',
    date: '2024-01-14',
    method: 'ECDA',
    grade: 'C',
    defects: 12,
  },
  {
    id: 'DEF-003',
    type: 'ILI прогон',
    pipeline: 'MT-02',
    date: '2024-01-12',
    method: 'UT',
    grade: 'A',
    defects: 28,
  },
  {
    id: 'DEF-004',
    type: 'Испытание давлением',
    pipeline: 'BR-04',
    date: '2024-01-10',
    method: 'Гидро',
    grade: 'C',
    defects: 0,
  },
]

const gradeColors: Record<string, string> = {
  A: 'bg-risk-low text-background',
  B: 'bg-risk-low/70 text-background',
  C: 'bg-risk-medium text-background',
  D: 'bg-risk-high text-foreground',
  F: 'bg-risk-critical text-foreground',
}

interface RecentScansTableProps {
  onRowClick?: (defectId: string) => void
}

export function RecentScansTable({ onRowClick }: RecentScansTableProps) {
  return (
    <Card className='border-border/50 bg-card'>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center justify-between'>
          <span className='flex items-center gap-2 text-sm font-medium text-muted-foreground'>
            <Activity className='h-4 w-4' />
            Последние сканирования
          </span>
          <Button variant='ghost' size='sm' className='text-xs'>
            Показать все
            <ExternalLink className='ml-1.5 h-3 w-3' />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className='border-border/50 hover:bg-transparent'>
              <TableHead className='text-xs font-medium text-muted-foreground'>
                ID
              </TableHead>
              <TableHead className='text-xs font-medium text-muted-foreground'>
                Тип
              </TableHead>
              <TableHead className='text-xs font-medium text-muted-foreground'>
                Трубопровод
              </TableHead>
              <TableHead className='text-xs font-medium text-muted-foreground'>
                Дата
              </TableHead>
              <TableHead className='text-xs font-medium text-muted-foreground'>
                Метод
              </TableHead>
              <TableHead className='text-xs font-medium text-muted-foreground'>
                Оценка
              </TableHead>
              <TableHead className='text-xs font-medium text-muted-foreground'>
                Дефекты
              </TableHead>
              <TableHead className='w-[40px]'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentScans.map(scan => (
              <TableRow
                key={scan.id}
                onClick={() => onRowClick?.(scan.id)}
                className='cursor-pointer border-border/50 transition-colors hover:bg-secondary/50'
              >
                <TableCell className='font-mono text-xs text-muted-foreground'>
                  {scan.id}
                </TableCell>
                <TableCell className='text-sm'>{scan.type}</TableCell>
                <TableCell className='font-medium'>{scan.pipeline}</TableCell>
                <TableCell className='tabular-nums text-sm text-muted-foreground'>
                  {scan.date}
                </TableCell>
                <TableCell>
                  <Badge variant='outline' className='text-xs'>
                    {scan.method}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn('text-xs font-bold', gradeColors[scan.grade])}
                  >
                    {scan.grade}
                  </Badge>
                </TableCell>
                <TableCell
                  className={cn(
                    'tabular-nums text-sm',
                    scan.defects > 20 && 'text-risk-medium',
                    scan.defects > 40 && 'text-risk-critical'
                  )}
                >
                  {scan.defects}
                </TableCell>
                <TableCell>
                  <ChevronRight className='h-4 w-4 text-muted-foreground' />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
