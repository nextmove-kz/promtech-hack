'use client';

import { useQuery } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Payload } from 'recharts/types/component/DefaultTooltipContent';
import type { DiagnosticsResponse, ObjectsResponse } from '@/app/api/api_types';
import pb from '@/app/api/client_pb';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { filterAtom } from '@/store/filterStore';

type MethodStats = { count: number; withDefects: number };
type MethodChartEntry = {
  name: string;
  value: number;
  total: number;
  percentage: string;
};

export function DefectTypesChart() {
  const [filters] = useAtom(filterAtom);
  const selectedPipelineId = filters.advanced.pipeline;

  // Fetch objects to filter diagnostics by pipeline
  const { data: allObjects = [] } = useQuery<ObjectsResponse[]>({
    queryKey: ['objects'],
    queryFn: async () => {
      return await pb.collection('objects').getFullList<ObjectsResponse>({
        sort: '-created',
        expand: 'pipeline',
      });
    },
  });

  // Get object IDs for the selected pipeline
  const pipelineObjectIds = selectedPipelineId
    ? allObjects
        .filter((obj) => obj.pipeline === selectedPipelineId)
        .map((obj) => obj.id)
    : allObjects.map((obj) => obj.id);

  const { data: allDiagnostics = [], isLoading } = useQuery<
    DiagnosticsResponse[]
  >({
    queryKey: ['diagnostics'],
    queryFn: async () => {
      return await pb
        .collection('diagnostics')
        .getFullList<DiagnosticsResponse>({
          sort: '-created',
        });
    },
  });

  // Filter diagnostics by pipeline objects
  const diagnostics = allDiagnostics.filter((diag) =>
    pipelineObjectIds.includes(diag.object),
  );

  // Group by diagnostic method (as proxy for defect type)
  const methodCounts = diagnostics.reduce<Record<string, MethodStats>>(
    (acc, diag) => {
      const method = diag.method || 'Unknown';
      if (!acc[method]) {
        acc[method] = { count: 0, withDefects: 0 };
      }
      acc[method].count += 1;
      if (diag.defect_found) {
        acc[method].withDefects += 1;
      }
      return acc;
    },
    {},
  );

  const chartData: MethodChartEntry[] = Object.entries(methodCounts)
    .map(([method, data]) => ({
      name: method,
      value: data.withDefects,
      total: data.count,
      percentage: ((data.withDefects / data.count) * 100).toFixed(1),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Calm color palette - soft blues and grays
  const COLORS = [
    '#60a5fa', // blue-400
    '#93c5fd', // blue-300
    '#bfdbfe', // blue-200
    '#cbd5e1', // slate-300
    '#94a3b8', // slate-400
    '#64748b', // slate-500
    '#7dd3fc', // sky-300
    '#a5b4fc', // indigo-300
    '#c4b5fd', // violet-300
    '#d8b4fe', // purple-300
    '#e9d5ff', // purple-200
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-medium text-slate-700">
          Методы диагностики
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Распределение дефектов по методам обнаружения
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[240px] items-center justify-center text-slate-400">
            Загрузка...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-slate-400">
            Нет дефектов
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={75}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  stroke="white"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(
                    value: number,
                    name: string,
                    item: Payload<number, string>,
                  ) => {
                    const { total, percentage } =
                      item.payload as MethodChartEntry;
                    return [
                      <div key="tooltip" className="space-y-0.5">
                        <div className="text-slate-700">
                          Дефектов: <span className="font-medium">{value}</span>
                        </div>
                        <div className="text-slate-600">
                          Всего проверок:{' '}
                          <span className="font-medium">{total}</span>
                        </div>
                        <div className="text-slate-600">
                          Процент:{' '}
                          <span className="font-medium">{percentage}%</span>
                        </div>
                      </div>,
                      name,
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Summary table */}
            <div className="mt-4 space-y-1 border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Метод</span>
                <span>Дефекты / Всего</span>
              </div>
              {chartData.slice(0, 5).map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-mono text-slate-500">
                    {item.value} / {item.total} ({item.percentage}%)
                  </span>
                </div>
              ))}
              {chartData.length > 5 && (
                <div className="text-xs text-slate-400">
                  +{chartData.length - 5} других методов
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
