'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import pb from '@/app/api/client_pb';
import type { DiagnosticsResponse } from '@/app/api/api_types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Payload } from 'recharts/types/component/DefaultTooltipContent';

type MethodStats = { count: number; withDefects: number };
type MethodChartEntry = {
  name: string;
  value: number;
  total: number;
  percentage: string;
};

export function DefectTypesChart() {
  const { data: diagnostics = [], isLoading } = useQuery<DiagnosticsResponse[]>(
    {
      queryKey: ['diagnostics'],
      queryFn: async () => {
        return await pb
          .collection('diagnostics')
          .getFullList<DiagnosticsResponse>({
            sort: '-created',
          });
      },
    },
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

  // Color palette for different methods
  const COLORS = [
    '#ef4444', // red
    '#f59e0b', // orange
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#d946ef', // fuchsia
    '#ec4899', // pink
    '#f97316', // orange-600
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Defect Types</CardTitle>
        <CardDescription>Структура дефектов по методам</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            Загрузка...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            Нет дефектов
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
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
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                  formatter={(
                    value: number,
                    name: string,
                    item: Payload<number, string>,
                  ) => {
                    const { total, percentage } =
                      item.payload as MethodChartEntry;
                    return [
                      <div key="tooltip" className="space-y-1">
                        <div>
                          Дефектов:{' '}
                          <span className="font-semibold">{value}</span>
                        </div>
                        <div>
                          Всего проверок:{' '}
                          <span className="font-semibold">{total}</span>
                        </div>
                        <div>
                          Процент:{' '}
                          <span className="font-semibold">{percentage}%</span>
                        </div>
                      </div>,
                      name,
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Summary table */}
            <div className="mt-3 space-y-1 border-t border-border pt-3">
              <div className="flex items-center justify-between text-xs font-semibold">
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
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">
                    {item.value} / {item.total} ({item.percentage}%)
                  </span>
                </div>
              ))}
              {chartData.length > 5 && (
                <div className="text-xs text-muted-foreground">
                  +{chartData.length - 5} больше методов
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
