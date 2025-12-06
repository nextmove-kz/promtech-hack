import { Button } from '@/components/ui/button'
import { RecentScansTable } from './RecentScansTable'
import { PlanTrackerTable } from './PlanTrackerTable'

interface TableViewProps {
  onObjectSelect: (objectId: string) => void
  onBackToMap: () => void
}

export function TableView({
  onObjectSelect,
  onBackToMap,
}: TableViewProps) {
  const handleShowOnMap = (objectId: string) => {
    onObjectSelect(objectId)
    onBackToMap()
  }

  return (
    <div className='min-w-0 flex-1 overflow-auto p-4 space-y-4'>
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
      <RecentScansTable onRowClick={onObjectSelect} />
      <PlanTrackerTable onShowOnMap={handleShowOnMap} />
    </div>
  )
}

