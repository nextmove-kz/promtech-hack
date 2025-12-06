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
import type { ObjectsResponse } from '@/app/api/api_types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Payload } from 'recharts/types/component/DefaultTooltipContent';

type MaterialStats = {
  material: string;
  totalObjects: number;
  objectsWithDefects: number;
  totalUrgency: number;
};

type MaterialChartEntry = {
  material: string;
  defectRate: number;
  avgRisk: number;
  count: number;
};

export function MaterialDegradationChart() {
  const { data: objects = [], isLoading: objectsLoading } = useQuery<
    ObjectsResponse[]
  >({
    queryKey: ['objects'],
    queryFn: async () => {
      return await pb.collection('objects').getFullList<ObjectsResponse>({
        sort: '-created',
      });
    },
  });

  const isLoading = objectsLoading;

  // Group by material and calculate average defect rate
  const materialData = objects.reduce<Record<string, MaterialStats>>(
    (acc, obj) => {
      const material = obj.material || 'Unknown';

      if (!acc[material]) {
        acc[material] = {
          material,
          totalObjects: 0,
          objectsWithDefects: 0,
          totalUrgency: 0,
        };
      }

      acc[material].totalObjects += 1;
      acc[material].totalUrgency += obj.urgency_score || 0;

      if (obj.has_defects) {
        acc[material].objectsWithDefects += 1;
      }

      return acc;
    },
    {},
  );

  const chartData: MaterialChartEntry[] = Object.values(materialData)
    .map((data) => ({
      material: data.material,
      defectRate: Number(
        ((data.objectsWithDefects / data.totalObjects) * 100).toFixed(1),
      ),
      avgRisk: Number((data.totalUrgency / data.totalObjects || 0).toFixed(1)),
      count: data.totalObjects,
    }))
    .sort((a, b) => b.defectRate - a.defectRate);

  // Color palette
  const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Material Degradation</CardTitle>
        <CardDescription>Износ по материалам</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            Загрузка...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            Нет данных
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="material"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  className="text-xs"
                  label={{
                    value: 'Defect Rate (%)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11 },
                  }}
                />
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
                    _item: Payload<number, string>,
                  ) => {
                    if (name === 'defectRate')
                      return [`${value}%`, 'Defect Rate'];
                    if (name === 'avgRisk') return [value, 'Avg Risk'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="defectRate" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.material}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Summary stats */}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Материалов: {chartData.length}</span>
              <span>
                Максимум дефектов: {chartData[0]?.material} (
                {chartData[0]?.defectRate}%)
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
