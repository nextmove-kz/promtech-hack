import { Button } from '@/components/ui/button'
import { RecentScansTable } from './RecentScansTable'

interface TableViewProps {
  onDefectSelect: (defectId: string) => void
  onBackToMap: () => void
}

export function TableView({
  onDefectSelect,
  onBackToMap,
}: TableViewProps) {
  return (
    <div className='min-w-0 flex-1 overflow-auto p-4'>
      <div className='mb-4'>
        <Button
          variant='ghost'
          size='sm'
          onClick={onBackToMap}
          className='gap-1.5'
        >
          ← Назад к карте
        </Button>
      </div>
      <RecentScansTable onRowClick={onDefectSelect} />
    </div>
  )
}

