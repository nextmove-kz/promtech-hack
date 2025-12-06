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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';

export function AgeDefectsChart() {
  const { data: objects = [], isLoading } = useQuery<ObjectsResponse[]>({
    queryKey: ['objects'],
    queryFn: async () => {
      return await pb.collection('objects').getFullList<ObjectsResponse>({
        sort: '-created',
      });
    },
  });

  // Process data for scatter plot
  const scatterData = objects
    .filter((obj) => obj.year && obj.urgency_score !== undefined)
    .map((obj) => ({
      year: obj.year,
      risk: obj.urgency_score || 0,
      age: new Date().getFullYear() - (obj.year || 2020),
      name: obj.name,
      status: obj.health_status,
    }));

  // Calculate correlation statistics
  const avgAge =
    scatterData.length > 0
      ? scatterData.reduce((sum, d) => sum + d.age, 0) / scatterData.length
      : 0;

  const oldObjects = scatterData.filter((d) => d.age > avgAge);
  const avgRiskOld =
    oldObjects.length > 0
      ? oldObjects.reduce((sum, d) => sum + d.risk, 0) / oldObjects.length
      : 0;

  const youngObjects = scatterData.filter((d) => d.age <= avgAge);
  const avgRiskYoung =
    youngObjects.length > 0
      ? youngObjects.reduce((sum, d) => sum + d.risk, 0) / youngObjects.length
      : 0;

  const correlation =
    avgRiskOld > avgRiskYoung ? 'положительная' : 'отрицательная';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Age vs Defects</CardTitle>
        <CardDescription>Корреляция возраста и дефектов</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            Загрузка...
          </div>
        ) : scatterData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            Нет данных
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  dataKey="age"
                  name="Возраст"
                  unit=" лет"
                  className="text-xs"
                  label={{
                    value: 'Возраст (лет)',
                    position: 'insideBottom',
                    offset: -5,
                    style: { fontSize: 11 },
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="risk"
                  name="Риск"
                  className="text-xs"
                  domain={[0, 100]}
                  label={{
                    value: 'Уровень риска',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11 },
                  }}
                />
                <ZAxis range={[50, 200]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0)
                      return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-popover p-2 shadow-md">
                        <div className="font-semibold">{data.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Возраст: {data.age} лет ({data.year})
                        </div>
                        <div className="text-xs">
                          Риск:{' '}
                          <span className="font-semibold">{data.risk}</span>
                        </div>
                        <div className="text-xs">
                          Статус:{' '}
                          <span
                            className={`font-semibold ${
                              data.status === 'CRITICAL'
                                ? 'text-red-500'
                                : data.status === 'WARNING'
                                  ? 'text-yellow-500'
                                  : 'text-green-500'
                            }`}
                          >
                            {data.status}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  name="Объекты"
                  data={scatterData}
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  shape="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Correlation insights */}
            <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Средний возраст:</span>
                <span className="font-semibold">{avgAge.toFixed(1)} лет</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Риск старых объектов:
                </span>
                <span className="font-semibold text-orange-500">
                  {avgRiskOld.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Риск новых объектов:
                </span>
                <span className="font-semibold text-green-500">
                  {avgRiskYoung.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Корреляция:</span>
                <span className="font-semibold capitalize">{correlation}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
