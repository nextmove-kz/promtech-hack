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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { Payload } from 'recharts/types/component/DefaultTooltipContent';
import { withDerivedUrgencyScore } from '@/lib/utils/urgency';

export function LinearAssetVisualization() {
  const { data: objects = [], isLoading } = useQuery<ObjectsResponse[]>({
    queryKey: ['objects'],
    queryFn: async () => {
      const records = await pb.collection('objects').getFullList<ObjectsResponse>(
        {
          sort: '-created',
        },
      );

      return records.map((record) => withDerivedUrgencyScore(record));
    },
  });

  // Calculate "kilometer" position based on object coordinates
  // This is a simplified linear distance calculation
  const processedData = objects
    .filter((obj) => obj.lat && obj.lon && obj.type === 'pipeline_section')
    .map((obj) => {
      // Simple linear distance (you could use actual geodesic distance)
      const kmPosition =
        Math.sqrt(((obj.lat || 0) - 43) ** 2 + ((obj.lon || 0) - 76) ** 2) *
        111; // Rough km conversion

      return {
        km: Math.round(kmPosition * 10) / 10,
        risk: obj.urgency_score || 0,
        name: obj.name,
        status: obj.health_status,
        id: obj.id,
      };
    })
    .sort((a, b) => a.km - b.km);

  // Add interpolated points for smooth visualization
  const smoothedData: Array<{ km: number; risk: number; name?: string }> = [];

  if (processedData.length > 0) {
    for (let i = 0; i < processedData.length; i++) {
      smoothedData.push(processedData[i]);

      // Add interpolated points between objects
      if (i < processedData.length - 1) {
        const current = processedData[i];
        const next = processedData[i + 1];
        const kmDiff = next.km - current.km;

        if (kmDiff > 10) {
          const steps = Math.floor(kmDiff / 5);
          for (let j = 1; j < steps; j++) {
            const ratio = j / steps;
            smoothedData.push({
              km: current.km + kmDiff * ratio,
              risk: current.risk + (next.risk - current.risk) * ratio,
            });
          }
        }
      }
    }
  }

  // Calculate statistics
  const avgRisk =
    processedData.length > 0
      ? processedData.reduce((sum, d) => sum + d.risk, 0) / processedData.length
      : 0;

  const maxRisk = Math.max(...processedData.map((d) => d.risk), 0);
  const hotspot = processedData.find((d) => d.risk === maxRisk);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-xl">
          ЭКГ Магистрали (Linear Asset Health)
        </CardTitle>
        <CardDescription>
          Визуализация уровня риска по протяженности трубопровода • Средний
          риск: <span className="font-semibold">{avgRisk.toFixed(1)}</span> •
          Пик риска:{' '}
          <span className="font-semibold text-red-500">
            {hotspot?.km.toFixed(1)} км
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Загрузка данных...
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Нет данных для отображения
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={smoothedData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="km"
                label={{
                  value: 'Километраж (км)',
                  position: 'insideBottom',
                  offset: -5,
                }}
                className="text-xs"
              />
              <YAxis
                label={{
                  value: 'Уровень риска',
                  angle: -90,
                  position: 'insideLeft',
                }}
                domain={[0, 100]}
                className="text-xs"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                labelFormatter={(value) => `${value} км`}
                formatter={(
                  value: number,
                  _name: string,
                  item: Payload<number, string>,
                ) => {
                  const objectName = item.payload.name as string | undefined;
                  return [
                    <div key="tooltip" className="flex flex-col gap-1">
                      <span className="font-semibold">
                        Риск: {value.toFixed(1)}
                      </span>
                      {objectName && (
                        <span className="text-xs text-muted-foreground">
                          {objectName}
                        </span>
                      )}
                    </div>,
                    '',
                  ];
                }}
              />
              <ReferenceLine
                y={70}
                stroke="hsl(var(--destructive))"
                strokeDasharray="3 3"
                label={{
                  value: 'Критический порог',
                  position: 'right',
                  fill: 'hsl(var(--destructive))',
                }}
              />
              <ReferenceLine
                y={40}
                stroke="hsl(var(--warning))"
                strokeDasharray="3 3"
                label={{
                  value: 'Порог предупреждения',
                  position: 'right',
                  fill: 'hsl(var(--warning))',
                }}
              />
              <Area
                type="monotone"
                dataKey="risk"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#riskGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Key insights */}
        {processedData.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">
                Протяженность мониторинга
              </div>
              <div className="text-lg font-semibold">
                {Math.max(...processedData.map((d) => d.km), 0).toFixed(1)} км
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">
                Критических участков
              </div>
              <div className="text-lg font-semibold text-red-500">
                {processedData.filter((d) => d.risk >= 70).length}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">
                Требуют внимания
              </div>
              <div className="text-lg font-semibold text-yellow-500">
                {
                  processedData.filter((d) => d.risk >= 40 && d.risk < 70)
                    .length
                }
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
