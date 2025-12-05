'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Gauge } from 'lucide-react'
import { FilterBar } from '@/components/dashboard/FilterBar'
import { DataImportDialog } from '@/components/dashboard/DataImportDialog'

export function Header() {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <>
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

          <Button
            size='sm'
            onClick={() => setImportOpen(true)}
            className='gap-2'
          >
            <Upload className='h-4 w-4' />
            Импорт
          </Button>
        </div>

        {/* Filter Bar */}
        <FilterBar />
      </header>

      {/* Import Dialog */}
      <DataImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  )
}

