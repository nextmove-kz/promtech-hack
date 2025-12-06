"use client"

import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Leaflet
const MapCanvas = dynamic(
  () => import('@/app/components/map/MapCanvas').then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center">
        <div className="text-slate-500 text-sm">Загрузка карты...</div>
      </div>
    )
  }
)

interface MapViewProps {
  onObjectSelect: (objectId: string) => void
  selectedObjectId: string | null
}

export function MapView({ onObjectSelect, selectedObjectId }: MapViewProps) {
  return (
    <div className='relative min-w-0 flex-1 h-full'>
      <MapCanvas
        onObjectSelect={onObjectSelect}
        selectedObjectId={selectedObjectId}
      />
    </div>
  )
}
