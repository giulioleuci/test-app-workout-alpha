import { useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { HistoryEstimate } from '@/domain/analytics-types';
import type { OneRepMaxRecord, BodyWeightRecord } from '@/domain/entities';
import dayjs from '@/lib/dayjs';
import { findClosestWeight } from '@/services/bodyWeightUtils';

interface ChartPoint {
  date: string;
  timestamp: number;
  directXBW?: number;
  indirectXBW?: number;
  estimatedXBW?: number;
}

interface OneRMvsBodyWeightSectionProps {
  exerciseId: string;
  oneRMRecords: OneRepMaxRecord[];
  bodyWeightRecords: BodyWeightRecord[];
  historyEstimates: Record<string, HistoryEstimate>;
}

const CHART_MARGIN = { top: 5, right: 5, left: -10, bottom: 5 };

export default function OneRMvsBodyWeightSection({
  exerciseId, oneRMRecords, bodyWeightRecords, historyEstimates,
}: OneRMvsBodyWeightSectionProps) {
  const { t } = useTranslation();
  const [showEstimated, setShowEstimated] = useState(true);

  const chartData = useMemo(() => {
    if (bodyWeightRecords.length === 0) return null;

    const records = oneRMRecords
      .filter(r => r.exerciseId === exerciseId)
      .sort((a, b) => dayjs(a.recordedAt).diff(dayjs(b.recordedAt)));

    const points: ChartPoint[] = [];

    for (const rec of records) {
      const bw = findClosestWeight(bodyWeightRecords, rec.recordedAt);
      if (!bw) continue;
      const xbw = Math.round((rec.value / bw.weight) * 100) / 100;
      const d = dayjs(rec.recordedAt);
      const point: ChartPoint = {
        date: d.format('DD/MM'),
        timestamp: d.valueOf(),
      };
      if (rec.method === 'direct') point.directXBW = xbw;
      else point.indirectXBW = xbw;
      points.push(point);
    }

    // Add history estimate point if available
    const estimate = historyEstimates[exerciseId];
    if (estimate) {
      const bw = findClosestWeight(bodyWeightRecords, estimate.date);
      if (bw) {
        const xbw = Math.round((estimate.value / bw.weight) * 100) / 100;
        const d = dayjs(estimate.date);
        points.push({
          date: d.format('DD/MM'),
          timestamp: d.valueOf(),
          estimatedXBW: xbw,
        });
      }
    }

    // Sort by date
    points.sort((a, b) => a.timestamp - b.timestamp);
    return points;
  }, [exerciseId, oneRMRecords, bodyWeightRecords, historyEstimates]);

  if (bodyWeightRecords.length === 0) {
    return (
      <Card>
        <CardContent className="p-3">
          <p className="text-body-sm py-4 text-center text-muted-foreground">{t('analytics.noBodyWeight')}</p>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) return null;

  const filteredData = showEstimated ? chartData : chartData.filter(p => !p.estimatedXBW);
  if (filteredData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{t('analytics.oneRMvsBW')}</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Badge variant="default" className="text-caption h-4 bg-success px-1.5 text-success-foreground">{t('analytics.direct')}</Badge>
              <Badge variant="secondary" className="text-caption h-4 bg-primary px-1.5 text-white">{t('analytics.indirect')}</Badge>
              <Badge variant="outline" className="text-caption h-4 border-warning px-1.5 text-warning">{t('analytics.estimated')}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-estimated"
            checked={showEstimated}
            onCheckedChange={setShowEstimated}
            className="scale-75"
          />
          <Label htmlFor="show-estimated" className="text-caption cursor-pointer text-muted-foreground">
            {showEstimated ? t('analytics.hideEstimated') : t('analytics.showEstimated')}
          </Label>
        </div>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        <div className="pointer-events-none">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={filteredData} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${v}${t('analytics.xBW')}`}
              />
              <Line
                type="monotone" dataKey="directXBW" stroke="hsl(var(--success))"
                dot={{ r: 3, fill: "hsl(var(--success))" }} connectNulls={false}
                isAnimationActive={false} name="directXBW"
              />
              <Line
                type="monotone" dataKey="indirectXBW" stroke="hsl(var(--primary))"
                dot={{ r: 3, fill: "hsl(var(--primary))" }} connectNulls={false}
                isAnimationActive={false} name="indirectXBW"
              />
              {showEstimated && (
                <Line
                  type="monotone" dataKey="estimatedXBW" stroke="hsl(var(--warning))"
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: 'transparent', stroke: "hsl(var(--warning))", strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false} name="estimatedXBW"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
