import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RPEAnalytics } from '@/domain/analytics-types';


const CHART_MARGIN = { top: 5, right: 5, left: -10, bottom: 5 };

interface RPESectionProps {
  rpeData: RPEAnalytics;
}

export default function RPESection({ rpeData }: RPESectionProps) {
  const { t } = useTranslation();
  const { rpeAccuracy, avgDeviation, withinHalfPercent } = rpeData;

  const buckets = [
    { label: '< -1', min: -Infinity, max: -1, count: 0 },
    { label: '-1 a -0.5', min: -1, max: -0.5, count: 0 },
    { label: '±0.5', min: -0.5, max: 0.5, count: 0 },
    { label: '0.5 a 1', min: 0.5, max: 1, count: 0 },
    { label: '> 1', min: 1, max: Infinity, count: 0 },
  ];
  for (const p of rpeAccuracy) {
    const b = buckets.find(b => p.deviation >= b.min && p.deviation < b.max);
    if (b) b.count++;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-caption text-muted-foreground">{t('analytics.avgDeviation')}</p>
              <p className="text-sm font-bold">{avgDeviation.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-caption text-muted-foreground">{t('analytics.withinHalf')}</p>
              <p className="text-sm font-bold">{withinHalfPercent}%</p>
            </div>
            <div>
              <p className="text-caption text-muted-foreground">{t('analytics.rpeData')}</p>
              <p className="text-sm font-bold">{rpeAccuracy.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Activity className="h-4 w-4" />
            {t('analytics.rpeAccuracy')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          {rpeAccuracy.length > 0 ? (
            <>
              <div className="pointer-events-none">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={rpeAccuracy} margin={CHART_MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis domain={[5, 11]} tick={{ fontSize: 10 }} />
                    <Line
                      type="monotone" dataKey="expectedRPE" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4"
                      dot={false} isAnimationActive={false} name={t('analytics.expectedLabel')}
                    />
                    <Line
                      type="monotone" dataKey="actualRPE" stroke="hsl(var(--primary))"
                      dot={{ r: 2 }} isAnimationActive={false} name={t('analytics.actualLabel')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-caption mt-2 flex justify-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="h-0.5 w-4" style={{ backgroundColor: "hsl(var(--muted-foreground))", borderTop: `2px dashed hsl(var(--muted-foreground))` }} />
                  <span>{t('analytics.expectedLabel')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-0.5 w-4 bg-primary" />
                  <span>{t('analytics.actualLabel')}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-body-sm py-8 text-center text-muted-foreground">{t('analytics.noRPEData')}</p>
          )}
        </CardContent>
      </Card>

      {rpeAccuracy.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('analytics.rpeDeviationDistribution')}</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="pointer-events-none">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={buckets} margin={CHART_MARGIN}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Bar dataKey="count" isAnimationActive={false}>
                    {buckets.map((b, i) => (
                      <Cell key={i} fill={
                        b.label === '±0.5' ? "hsl(var(--success))" :
                        b.label.includes('-') ? "hsl(var(--warning))" : "hsl(var(--primary))"
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
