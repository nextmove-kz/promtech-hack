'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/app/api/client_pb'
import { useAtom } from 'jotai'
import { filterAtom } from '@/store/filterStore'
import type { ObjectsResponse } from '@/app/api/api_types'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts'

export function AgeDefectsChart() {
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

  // Process data for scatter plot
  const scatterData = objects
    .filter(obj => obj.year && obj.urgency_score !== undefined)
    .map(obj => ({
      year: obj.year,
      risk: obj.urgency_score || 0,
      age: new Date().getFullYear() - (obj.year || 2020),
      name: obj.name,
      status: obj.health_status,
    }))

  // Calculate correlation statistics
  const avgAge = scatterData.length > 0
    ? scatterData.reduce((sum, d) => sum + d.age, 0) / scatterData.length
    : 0

  const oldObjects = scatterData.filter(d => d.age > avgAge)
  const avgRiskOld = oldObjects.length > 0
    ? oldObjects.reduce((sum, d) => sum + d.risk, 0) / oldObjects.length
    : 0

  const youngObjects = scatterData.filter(d => d.age <= avgAge)
  const avgRiskYoung = youngObjects.length > 0
    ? youngObjects.reduce((sum, d) => sum + d.risk, 0) / youngObjects.length
    : 0

  const correlation = avgRiskOld > avgRiskYoung ? 'положительная' : 'отрицательная'

  return (
    <Card className="border-border/50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-medium text-slate-700">Возраст и дефекты</CardTitle>
        <CardDescription className="text-sm text-slate-500">Корреляция между возрастом объектов и уровнем риска</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[240px] items-center justify-center text-slate-400">
            Загрузка...
          </div>
        ) : scatterData.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-slate-400">
            Нет данных
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis
                  type="number"
                  dataKey="age"
                  name="Возраст"
                  unit=" лет"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{ value: 'Возраст (лет)', position: 'insideBottom', offset: -5, style: { fontSize: 11, fill: '#64748b' } }}
                  stroke="#cbd5e1"
                />
                <YAxis
                  type="number"
                  dataKey="risk"
                  name="Риск"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  domain={[0, 100]}
                  label={{ value: 'Уровень риска', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
                  stroke="#cbd5e1"
                />
                <ZAxis range={[40, 120]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                  }}
                  cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const data = payload[0].payload
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                        <div className="font-medium text-slate-700">{data.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Возраст: {data.age} лет ({data.year})
                        </div>
                        <div className="text-xs text-slate-600">
                          Риск: <span className="font-medium">{data.risk}</span>
                        </div>
                        <div className="text-xs text-slate-600">
                          Статус: <span className={`font-medium ${
                            data.status === 'CRITICAL' ? 'text-rose-600' :
                            data.status === 'WARNING' ? 'text-amber-600' :
                            'text-emerald-600'
                          }`}>{data.status}</span>
                        </div>
                      </div>
                    )
                  }}
                />
                <Scatter
                  name="Объекты"
                  data={scatterData}
                  fill="#60a5fa"
                  fillOpacity={0.5}
                  shape="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Correlation insights */}
            <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Средний возраст:</span>
                <span className="font-medium text-slate-700">{avgAge.toFixed(1)} лет</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Риск старых объектов:</span>
                <span className="font-medium text-amber-600">{avgRiskOld.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Риск новых объектов:</span>
                <span className="font-medium text-emerald-600">{avgRiskYoung.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Корреляция:</span>
                <span className="font-medium text-slate-700 capitalize">{correlation}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
