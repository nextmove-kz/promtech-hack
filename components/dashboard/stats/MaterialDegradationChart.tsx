'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/app/api/client_pb'
import { useAtom } from 'jotai'
import { filterAtom } from '@/store/filterStore'
import type { ObjectsResponse, DiagnosticsResponse } from '@/app/api/api_types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

export function MaterialDegradationChart() {
  const [filters] = useAtom(filterAtom)
  const selectedPipelineId = filters.advanced.pipeline

  const { data: allObjects = [], isLoading: objectsLoading } = useQuery<ObjectsResponse[]>({
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

  const { data: diagnostics = [], isLoading: diagnosticsLoading } = useQuery<DiagnosticsResponse[]>({
    queryKey: ['diagnostics'],
    queryFn: async () => {
      return await pb.collection('diagnostics').getFullList<DiagnosticsResponse>({
        sort: '-created',
        expand: 'object',
      })
    },
  })

  const isLoading = objectsLoading || diagnosticsLoading

  // Group by material and calculate average defect rate
  const materialData = objects.reduce((acc, obj) => {
    const material = obj.material || 'Unknown'

    if (!acc[material]) {
      acc[material] = {
        material,
        totalObjects: 0,
        objectsWithDefects: 0,
        avgUrgency: 0,
        totalUrgency: 0,
      }
    }

    acc[material].totalObjects++
    acc[material].totalUrgency += obj.urgency_score || 0

    if (obj.has_defects) {
      acc[material].objectsWithDefects++
    }

    return acc
  }, {} as Record<string, any>)

  const chartData = Object.values(materialData)
    .map((data: any) => ({
      material: data.material,
      defectRate: ((data.objectsWithDefects / data.totalObjects) * 100).toFixed(1),
      avgRisk: (data.totalUrgency / data.totalObjects).toFixed(1),
      count: data.totalObjects,
    }))
    .sort((a, b) => parseFloat(b.defectRate) - parseFloat(a.defectRate))

  // Calm color palette - soft blues
  const COLORS = ['#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff']

  return (
    <Card className="border-border/50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-medium text-slate-700">Износ материалов</CardTitle>
        <CardDescription className="text-sm text-slate-500">Доля дефектов по типам материалов</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[240px] items-center justify-center text-slate-400">
            Загрузка...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-slate-400">
            Нет данных
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis
                  dataKey="material"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                  stroke="#cbd5e1"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{ value: 'Доля дефектов (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
                  stroke="#cbd5e1"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'defectRate') return [`${value}%`, 'Доля дефектов']
                    if (name === 'avgRisk') return [value, 'Средний риск']
                    return [value, name]
                  }}
                />
                <Bar dataKey="defectRate" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Summary stats */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
              <span>Материалов: {chartData.length}</span>
              <span>
                Максимум: {chartData[0]?.material} ({chartData[0]?.defectRate}%)
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
