'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/app/api/client_pb'
import { useAtom } from 'jotai'
import { filterAtom } from '@/store/filterStore'
import type { ObjectsResponse } from '@/app/api/api_types'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export function LinearAssetVisualization() {
  const [filters] = useAtom(filterAtom)
  const selectedPipelineId = filters.advanced.pipeline

  const { data: allObjects = [], isLoading } = useQuery<ObjectsResponse[]>({
    queryKey: ['objects'],
    queryFn: async () => {
      return await pb.collection('objects').getFullList<ObjectsResponse>({
        sort: '-created',
        expand: 'pipeline',
      })
    },
  })

  // Filter objects by selected pipeline
  const objects = selectedPipelineId
    ? allObjects.filter(obj => obj.pipeline === selectedPipelineId)
    : allObjects

  // Calculate "kilometer" position based on object coordinates
  // This is a simplified linear distance calculation
  const processedData = objects
    .filter(obj => obj.lat && obj.lon && obj.type === 'pipeline_section')
    .map(obj => {
      // Simple linear distance (you could use actual geodesic distance)
      const kmPosition = Math.sqrt(
        Math.pow((obj.lat || 0) - 43, 2) + Math.pow((obj.lon || 0) - 76, 2)
      ) * 111 // Rough km conversion

      return {
        km: Math.round(kmPosition * 10) / 10,
        risk: obj.urgency_score || 0,
        name: obj.name,
        status: obj.health_status,
        id: obj.id,
      }
    })
    .sort((a, b) => a.km - b.km)

  // Add interpolated points for smooth visualization
  const smoothedData: Array<{km: number, risk: number, name?: string}> = []

  if (processedData.length > 0) {
    for (let i = 0; i < processedData.length; i++) {
      smoothedData.push(processedData[i])

      // Add interpolated points between objects
      if (i < processedData.length - 1) {
        const current = processedData[i]
        const next = processedData[i + 1]
        const kmDiff = next.km - current.km

        if (kmDiff > 10) {
          const steps = Math.floor(kmDiff / 5)
          for (let j = 1; j < steps; j++) {
            const ratio = j / steps
            smoothedData.push({
              km: current.km + (kmDiff * ratio),
              risk: current.risk + (next.risk - current.risk) * ratio,
            })
          }
        }
      }
    }
  }

  // Calculate statistics
  const avgRisk = processedData.length > 0
    ? processedData.reduce((sum, d) => sum + d.risk, 0) / processedData.length
    : 0

  const maxRisk = Math.max(...processedData.map(d => d.risk), 0)
  const hotspot = processedData.find(d => d.risk === maxRisk)

  return (
    <Card className="col-span-full border-border/50">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg font-medium text-slate-700">Профиль состояния магистрали</CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Распределение уровня риска по протяженности трубопровода
          {processedData.length > 0 && (
            <>
              {' • '}Средний риск: <span className="font-medium text-slate-700">{avgRisk.toFixed(1)}</span>
              {hotspot && (
                <>{' • '}Пик: <span className="font-medium text-rose-600">{hotspot.km.toFixed(1)} км</span></>
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="flex h-[320px] items-center justify-center text-slate-400">
            Загрузка данных...
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-slate-400">
            Нет данных для отображения
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart
              data={smoothedData}
              margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="riskGradientCalm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis
                dataKey="km"
                label={{ value: 'Километраж (км)', position: 'insideBottom', offset: -5, style: { fill: '#64748b', fontSize: 12 } }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                stroke="#cbd5e1"
              />
              <YAxis
                label={{ value: 'Уровень риска', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 12 } }}
                domain={[0, 100]}
                tick={{ fill: '#64748b', fontSize: 11 }}
                stroke="#cbd5e1"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                }}
                labelFormatter={(value) => `${value} км`}
                formatter={(value: number, name: string, props: any) => {
                  const objectName = props.payload.name
                  return [
                    <div key="tooltip" className="flex flex-col gap-0.5">
                      <span className="font-medium text-slate-700">Риск: {value.toFixed(1)}</span>
                      {objectName && <span className="text-xs text-slate-500">{objectName}</span>}
                    </div>,
                    ''
                  ]
                }}
              />
              <ReferenceLine
                y={70}
                stroke="#fca5a5"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: 'Критический', position: 'right', fill: '#dc2626', fontSize: 11 }}
              />
              <ReferenceLine
                y={40}
                stroke="#fcd34d"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: 'Предупреждение', position: 'right', fill: '#d97706', fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="risk"
                stroke="#0ea5e9"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#riskGradientCalm)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Key insights */}
        {processedData.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3">
              <div className="text-xs font-medium text-slate-500">Протяженность</div>
              <div className="mt-1 text-lg font-semibold text-slate-700">
                {Math.max(...processedData.map(d => d.km), 0).toFixed(1)} км
              </div>
            </div>
            <div className="rounded-md border border-rose-200 bg-rose-50/50 p-3">
              <div className="text-xs font-medium text-rose-600">Критических участков</div>
              <div className="mt-1 text-lg font-semibold text-rose-700">
                {processedData.filter(d => d.risk >= 70).length}
              </div>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
              <div className="text-xs font-medium text-amber-600">Требуют внимания</div>
              <div className="mt-1 text-lg font-semibold text-amber-700">
                {processedData.filter(d => d.risk >= 40 && d.risk < 70).length}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
