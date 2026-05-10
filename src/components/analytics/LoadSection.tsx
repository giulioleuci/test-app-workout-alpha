import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LoadProgressionAnalytics, BodyWeightAnalytics } from '@/domain/analytics-types';
import { cn } from '@/lib/utils';

import IntensityCalculator from './IntensityCalculator';
import OneRMvsBodyWeightSection from './OneRMvsBodyWeightSection';
import TheoreticalPerformanceMatrix from './TheoreticalPerformanceMatrix';


const CHART_MARGIN = { top: 5, right: 5, left: -10, bottom: 5 };

interface LoadSectionProps {
  loadData: LoadProgressionAnalytics;
  bodyWeightData: BodyWeightAnalytics;
  selectedExercise: string;
  onSelectExercise: (id: string) => void;
}

export default function LoadSection({ loadData, bodyWeightData, selectedExercise, onSelectExercise }: LoadSectionProps) {
  const { t } = useTranslation();
  const { loadProgression, oneRMRecords, historyEstimates } = loadData;
  const { bodyWeightRecords } = bodyWeightData;

  const exerciseIds = Object.keys(loadProgression);
  const loadPoints = selectedExercise === 'all'
    ? exerciseIds.length > 0 ? loadProgression[exerciseIds[0]] ?? [] : []
    : loadProgression[selectedExercise] ?? [];

  let avgLoadChange: string | null = null;
  if (loadPoints.length >= 2) {
    const first = loadPoints[0].avgLoad;
    const last = loadPoints[loadPoints.length - 1].avgLoad;
    if (first > 0) {
      const change = Math.round(((last - first) / first) * 100);
      avgLoadChange = `${change > 0 ? '+' : ''}${change}%`;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {loadPoints.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-caption text-muted-foreground">{t('analytics.trackedExercises')}</p>
                <p className="text-sm font-bold">{exerciseIds.length}</p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground">{t('analytics.maxLoad')}</p>
                <p className="text-sm font-bold">{loadPoints.length > 0 ? Math.max(...loadPoints.map(d => d.maxLoad)) : '—'} {t('units.kg')}</p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground">{t('common.variation')}</p>
                <p className={cn(
                  "text-sm font-bold",
                  avgLoadChange?.startsWith('+') && "text-success",
                  avgLoadChange?.startsWith('-') && "text-destructive"
                )}>
                  {avgLoadChange ?? '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-4 w-4" />
              {t('analytics.loadProgression')}
            </CardTitle>
            {exerciseIds.length > 1 && (
              <Select value={selectedExercise} onValueChange={onSelectExercise}>
                <SelectTrigger className="text-caption h-7 w-36">
                  <SelectValue placeholder={t('common.exercise')} />
                </SelectTrigger>
                <SelectContent>
                  {exerciseIds.map(id => {
                    const pts = loadProgression[id];
                    return (
                      <SelectItem key={id} value={id} className="text-body-sm">
                        {pts?.[0]?.exerciseName ?? id}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          {loadPoints.length > 0 ? (
            <div className="pointer-events-none">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={loadPoints} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Line
                    type="monotone" dataKey="avgLoad" stroke="hsl(var(--primary))"
                    dot={{ r: 2 }} isAnimationActive={false} name={t('analytics.avgLabel')}
                  />
                  <Line
                    type="monotone" dataKey="maxLoad" stroke="hsl(var(--success))" strokeDasharray="4 4"
                    dot={{ r: 2 }} isAnimationActive={false} name={t('analytics.maxLabel')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-body-sm py-8 text-center text-muted-foreground">{t('analytics.selectExercise')}</p>
          )}
        </CardContent>
      </Card>

      {selectedExercise && selectedExercise !== 'all' && (
        <>
          <OneRMvsBodyWeightSection
            exerciseId={selectedExercise}
            oneRMRecords={oneRMRecords}
            bodyWeightRecords={bodyWeightRecords}
            historyEstimates={historyEstimates}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TheoreticalPerformanceMatrix exerciseId={selectedExercise} />
            <IntensityCalculator exerciseId={selectedExercise} />
          </div>
        </>
      )}
    </div>
  );
}
