'use client'

import { useQuery } from '@tanstack/react-query'
import { Shield, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/app/api/client_pb'
import type { ObjectsResponse, PlanResponse } from '@/app/api/api_types'

export function KPICards() {
  // Fetch all objects
  const { data: objects = [] } = useQuery<ObjectsResponse[]>({
    queryKey: ['objects'],
    queryFn: async () => {
      return await pb.collection('objects').getFullList<ObjectsResponse>({
        sort: '-created',
      })
    },
  })

  // Fetch all plans
  const { data: plans = [] } = useQuery<PlanResponse[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      return await pb.collection('plan').getFullList<PlanResponse>({
        sort: '-created',
      })
    },
  })

  // Calculate Safety Score (0-100, inverse of average urgency_score)
  const avgUrgency = objects.length > 0
    ? objects.reduce((sum, obj) => sum + (obj.urgency_score || 0), 0) / objects.length
    : 0
  const safetyScore = Math.round(100 - avgUrgency)

  // Determine safety status color
  const safetyStatus = safetyScore >= 80 ? 'success' : safetyScore >= 60 ? 'warning' : 'critical'

  // Calculate CAPEX Forecast (synthetic: Critical = $50k, Warning = $10k)
  const criticalObjects = objects.filter(obj => obj.health_status === 'CRITICAL')
  const warningObjects = objects.filter(obj => obj.health_status === 'WARNING')
  const capexForecast = (criticalObjects.length * 50000) + (warningObjects.length * 10000)

  // Count active anomalies (objects with status != OK)
  const activeAnomalies = objects.filter(obj => obj.health_status !== 'OK').length

  // Count pending actions
  const pendingActions = plans.filter(plan => plan.status === 'pending' || plan.status === 'created').length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Safety Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
          <Shield className={`h-4 w-4 ${
            safetyStatus === 'success' ? 'text-green-500' :
            safetyStatus === 'warning' ? 'text-yellow-500' :
            'text-red-500'
          }`} />
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${
            safetyStatus === 'success' ? 'text-green-500' :
            safetyStatus === 'warning' ? 'text-yellow-500' :
            'text-red-500'
          }`}>
            {safetyScore}
          </div>
          <p className="text-xs text-muted-foreground">
            Индекс безопасности (0-100)
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all ${
                  safetyStatus === 'success' ? 'bg-green-500' :
                  safetyStatus === 'warning' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${safetyScore}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CAPEX Forecast */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CAPEX Forecast</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-500">
            ${(capexForecast / 1000000).toFixed(1)}M
          </div>
          <p className="text-xs text-muted-foreground">
            Прогноз затрат на ремонт
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-red-500">{criticalObjects.length} Critical</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-yellow-500">{warningObjects.length} Warning</span>
          </div>
        </CardContent>
      </Card>

      {/* Active Anomalies */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Anomalies</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-500">
            {activeAnomalies}
          </div>
          <p className="text-xs text-muted-foreground">
            Объектов требуют внимания
          </p>
          <div className="mt-2 text-xs text-muted-foreground">
            из {objects.length} всего объектов
          </div>
        </CardContent>
      </Card>

      {/* Pending Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
          <CheckCircle className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-500">
            {pendingActions}
          </div>
          <p className="text-xs text-muted-foreground">
            Открытых задач в плане
          </p>
          <div className="mt-2 text-xs text-muted-foreground">
            из {plans.length} всего планов
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
