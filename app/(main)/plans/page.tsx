'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PlanTrackerTable } from '@/components/dashboard/PlanTrackerTable'
import { Button } from '@/components/ui/button'

export default function PlansPage() {
  const router = useRouter()

  const handleShowOnMap = (objectId: string) => {
    router.push(`/?object=${objectId}`)
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Назад к карте
              </Link>
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Трекер задач</h1>
          </div>
        </div>

        <PlanTrackerTable onShowOnMap={handleShowOnMap} />
      </div>
    </div>
  )
}

