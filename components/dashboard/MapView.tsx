import { MapPlaceholder } from './MapPlaceholder'

interface MapViewProps {
  onDefectSelect: (defectId: string) => void
}

export function MapView({ onDefectSelect }: MapViewProps) {
  return (
    <div className='min-w-0 flex-1'>
      <MapPlaceholder onDefectSelect={onDefectSelect} />
    </div>
  )
}

