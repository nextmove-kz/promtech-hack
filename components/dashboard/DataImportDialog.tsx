import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ImportStep = 'upload' | 'validating' | 'processing' | 'complete' | 'error'

const mockErrors = [
  {
    row: 23,
    field: 'Pressure',
    error: 'Value exceeds maximum limit (1500 PSI)',
  },
  { row: 47, field: 'Date', error: 'Invalid date format' },
  { row: 89, field: 'Material', error: 'Unknown material type' },
]

interface DataImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DataImportDialog({
  open,
  onOpenChange,
}: DataImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  const simulateUpload = () => {
    setStep('validating')
    setProgress(0)

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setStep('processing')
          return 100
        }
        return prev + 10
      })
    }, 200)

    setTimeout(() => {
      setStep('processing')
      setProgress(0)

      const processInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(processInterval)
            setStep('complete')
            return 100
          }
          return prev + 5
        })
      }, 100)
    }, 2500)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    simulateUpload()
  }

  const resetDialog = () => {
    setStep('upload')
    setProgress(0)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        onOpenChange(isOpen)
        if (!isOpen) resetDialog()
      }}
    >
      <DialogContent className='border-border bg-card sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Upload className='h-5 w-5' />
            Import Inspection Data
          </DialogTitle>
          <DialogDescription className='text-muted-foreground'>
            Upload CSV or Excel files containing inspection records
          </DialogDescription>
        </DialogHeader>

        <div className='mt-4 space-y-4'>
          {step === 'upload' && (
            <div
              className={cn(
                'flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={simulateUpload}
            >
              <Upload className='mb-4 h-10 w-10 text-muted-foreground' />
              <p className='mb-2 text-sm font-medium text-foreground'>
                Drag and drop files here
              </p>
              <p className='text-xs text-muted-foreground'>
                or click to browse • CSV, XLS, XLSX up to 50MB
              </p>
            </div>
          )}

          {(step === 'validating' || step === 'processing') && (
            <div className='space-y-4 py-8'>
              <div className='flex items-center justify-center'>
                <Loader2 className='h-10 w-10 animate-spin text-primary' />
              </div>
              <div className='space-y-2 text-center'>
                <p className='text-sm font-medium text-foreground'>
                  {step === 'validating'
                    ? 'Validating data...'
                    : 'Processing ML analysis...'}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {step === 'validating'
                    ? 'Checking data integrity and format'
                    : 'Running anomaly detection algorithms'}
                </p>
              </div>
              <Progress value={progress} className='mx-auto max-w-[300px]' />
              <p className='text-center text-xs text-muted-foreground'>
                {progress}% complete
              </p>
            </div>
          )}

          {step === 'complete' && (
            <div className='space-y-4'>
              <div className='flex flex-col items-center py-6'>
                <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-risk-low/20'>
                  <CheckCircle2 className='h-6 w-6 text-risk-low' />
                </div>
                <p className='text-lg font-medium text-foreground'>
                  Import Complete
                </p>
                <p className='text-sm text-muted-foreground'>
                  1,247 records processed successfully
                </p>
              </div>

              {/* Errors Table */}
              {mockErrors.length > 0 && (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <AlertTriangle className='h-4 w-4 text-risk-medium' />
                    <span className='text-sm font-medium text-foreground'>
                      {mockErrors.length} records with errors
                    </span>
                  </div>
                  <div className='max-h-[200px] overflow-y-auto rounded-md border border-border'>
                    <Table>
                      <TableHeader>
                        <TableRow className='border-border hover:bg-transparent'>
                          <TableHead className='text-xs'>Row</TableHead>
                          <TableHead className='text-xs'>Field</TableHead>
                          <TableHead className='text-xs'>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockErrors.map((error, idx) => (
                          <TableRow key={idx} className='border-border'>
                            <TableCell className='font-mono text-xs text-muted-foreground'>
                              #{error.row}
                            </TableCell>
                            <TableCell>
                              <Badge variant='outline' className='text-xs'>
                                {error.field}
                              </Badge>
                            </TableCell>
                            <TableCell className='text-xs text-risk-critical'>
                              {error.error}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className='flex gap-3'>
                <Button className='flex-1' onClick={() => onOpenChange(false)}>
                  Done
                </Button>
                <Button variant='outline' onClick={resetDialog}>
                  Import Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
