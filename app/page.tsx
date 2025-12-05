'use client'

import { useState } from 'react'
import { MapPlaceholder } from '@/components/dashboard/MapPlaceholder'
import { RecentScansTable } from '@/components/dashboard/RecentScansTable'
import { DefectDetailsPanel } from '@/components/dashboard/DefectDetailsPanel'
import { DataImportDialog } from '@/components/dashboard/DataImportDialog'
import { FilterBar } from '@/components/dashboard/FilterBar'
import { Button } from '@/components/ui/button'
import { Upload, Map, Table2, Gauge } from 'lucide-react'

type ViewMode = 'map' | 'table'

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [selectedDefect, setSelectedDefect] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const handleDefectSelect = (defectId: string) => {
    setSelectedDefect(defectId)
  }

  const handleClosePanel = () => {
    setSelectedDefect(null)
  }

  return (
    <div className='relative h-screen w-full overflow-hidden bg-background'>
      {/* Top Header Bar */}
      <header className='absolute left-0 right-0 top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur-sm'>
        <div className='flex items-center justify-between px-4 py-3'>
          <div className='flex items-center gap-3'>
            <div className='flex h-8 w-8 items-center justify-center rounded-md bg-primary'>
              <Gauge className='h-5 w-5 text-primary-foreground' />
            </div>
            <span className='text-lg font-semibold text-foreground'>
              IntegrityOS
            </span>
          </div>

          <div className='flex items-center gap-2'>
            {/* View Toggle */}
            <div className='flex items-center rounded-lg border border-border bg-card p-1'>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('map')}
                className='gap-2'
              >
                <Map className='h-4 w-4' />
                Map
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('table')}
                className='gap-2'
              >
                <Table2 className='h-4 w-4' />
                Table
              </Button>
            </div>

            <Button
              size='sm'
              onClick={() => setImportOpen(true)}
              className='gap-2'
            >
              <Upload className='h-4 w-4' />
              Import
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar />
      </header>

      {/* Main Content Area */}
      <main className='h-full pt-[120px]'>
        {viewMode === 'map' ? (
          <MapPlaceholder onDefectSelect={handleDefectSelect} />
        ) : (
          <div className='h-full overflow-auto p-4'>
            <RecentScansTable onRowClick={handleDefectSelect} />
          </div>
        )}
      </main>

      {/* Floating Defect Details Panel */}
      <DefectDetailsPanel
        defectId={selectedDefect}
        onClose={handleClosePanel}
      />

      {/* Import Dialog */}
      <DataImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}

export default Index
