'use client'

import { useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { MapView } from '@/components/dashboard/MapView'
import { TableView } from '@/components/dashboard/TableView'
import { Sidebar } from '@/components/dashboard/Sidebar'

type ViewMode = 'map' | 'table'

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [selectedDefect, setSelectedDefect] = useState<string | null>(null)

  const handleDefectSelect = (defectId: string) => setSelectedDefect(defectId)
  const handleClosePanel = () => setSelectedDefect(null)
  const handleExpandTable = () => setViewMode('table')
  const handleBackToMap = () => setViewMode('map')

  return (
    <div className='relative h-screen w-full overflow-hidden bg-background'>
      <Header />
      <main className='flex h-full overflow-hidden pt-[120px]'>
        <div className='flex min-w-0 flex-1'>
          {viewMode === 'map' ? (
            <MapView onDefectSelect={handleDefectSelect} />
          ) : (
            <TableView
              onDefectSelect={handleDefectSelect}
              onBackToMap={handleBackToMap}
            />
          )}
          <Sidebar
            selectedDefect={selectedDefect}
            viewMode={viewMode}
            onDefectSelect={handleDefectSelect}
            onClosePanel={handleClosePanel}
            onExpandTable={handleExpandTable}
          />
        </div>
      </main>
    </div>
  )
}

export default Index
