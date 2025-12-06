'use client'

import { useState } from 'react'
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
import { useObjects } from '@/hooks/useObjects'
import { Pagination } from '@/components/ui/pagination'

interface RecentScansTableProps {
  onRowClick?: (objectId: string) => void
}

export function RecentScansTable({ onRowClick }: RecentScansTableProps) {
  const [page, setPage] = useState(1)
  const perPage = 20
  const { data, isLoading, error } = useObjects({ page, perPage })

  if (isLoading) {
    return (
      <Card className='border-border/50 bg-card'>
        <CardContent className='py-8'>
          <div className='text-center text-sm text-muted-foreground'>
            Загрузка...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className='border-border/50 bg-card'>
        <CardContent className='py-8'>
          <div className='text-center text-sm text-destructive'>
            Ошибка загрузки данных
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='border-border/50 bg-card'>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center justify-between'>
          <span className='flex items-center gap-2 text-sm font-medium text-muted-foreground'>
            <Activity className='h-4 w-4' />
            Объекты
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
                Название
              </TableHead>
              <TableHead className='text-xs font-medium text-muted-foreground'>
                Тип
              </TableHead>
              <TableHead className='text-xs font-medium text-muted-foreground'>
                Материал
              </TableHead>
              <TableHead className='text-xs font-medium text-muted-foreground'>
                Год
              </TableHead>
              <TableHead className='w-[40px]'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items?.map(object => (
              <TableRow
                key={object.id}
                onClick={() => onRowClick?.(object.id)}
                className='cursor-pointer border-border/50 transition-colors hover:bg-secondary/50'
              >
                <TableCell className='text-sm font-medium'>
                  {object.object_name || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant='outline' className='text-xs'>
                    {object.object_type || '-'}
                  </Badge>
                </TableCell>
                <TableCell className='text-sm text-muted-foreground'>
                  {object.material || '-'}
                </TableCell>
                <TableCell className='tabular-nums text-sm text-muted-foreground'>
                  {object.year || '-'}
                </TableCell>
                <TableCell>
                  <ChevronRight className='h-4 w-4 text-muted-foreground' />
                </TableCell>
              </TableRow>
            ))}
            {data?.items?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className='text-center text-sm text-muted-foreground py-8'
                >
                  Нет данных
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {data && data.totalPages > 1 && (
          <div className='mt-4 flex justify-center'>
            <Pagination
              currentPage={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
