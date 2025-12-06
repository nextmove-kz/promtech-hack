'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KPICards } from '@/components/dashboard/stats/KPICards'
import { LinearAssetVisualization } from '@/components/dashboard/stats/LinearAssetVisualization'
import { MaterialDegradationChart } from '@/components/dashboard/stats/MaterialDegradationChart'
import { AgeDefectsChart } from '@/components/dashboard/stats/AgeDefectsChart'
import { DefectTypesChart } from '@/components/dashboard/stats/DefectTypesChart'

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back to Map
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Digital Pipeline Passport</h1>
              <p className="text-sm text-muted-foreground">Strategic Management Dashboard</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards />

        {/* Linear Asset Visualization - Hero Section */}
        <LinearAssetVisualization />

        {/* Analytical Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <MaterialDegradationChart />
          <AgeDefectsChart />
          <DefectTypesChart />
        </div>
      </div>
    </div>
  )
}
