import { useState, useMemo } from 'react';

import { Dumbbell, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ExtendedVolumeEntry, VolumeAnalytics } from '@/domain/analytics-types';

type VolumeMetric = 'weightedSets' | 'setsTimesReps' | 'volumeTonnage';

function VolumeBarChart({ entries, metric, category, metricUnits }: {
  entries: ExtendedVolumeEntry[];
  metric: VolumeMetric;
  category: string;
  metricUnits: Record<VolumeMetric, string>;
}) {
  const { t } = useTranslation();

  const enumLabels: Record<string, Record<string, string>> = useMemo(() => ({
    muscle: t('enums.muscle', { returnObjects: true }),
    muscleGroup: t('enums.muscleGroup', { returnObjects: true }),
    movementPattern: t('enums.movementPattern', { returnObjects: true }),
    trainingObjective: t('enums.trainingObjective', { returnObjects: true }),
  }), [t]);

  const sorted = useMemo(() => [...entries]
    .map(e => ({ ...e, value: e[metric] }))
    .filter(e => e.value > 0)
    .sort((a, b) => b.value - a.value), [entries, metric]);

  if (sorted.length === 0) return <p className="text-body-sm py-2 text-muted-foreground">{t('analytics.noDataShort')}</p>;

  const maxVal = Math.max(...sorted.map(e => e.value));
  const labelMap = enumLabels[category] ?? {};
  const unit = metricUnits[metric];

  return (
    <div className="flex flex-col gap-2">
      {sorted.map(entry => (
        <div key={entry.name} className="flex flex-col gap-0.5">
          <div className="text-body-sm flex items-center justify-between">
            <span className="mr-2 truncate font-medium">{labelMap[entry.name] ?? entry.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {entry.value.toLocaleString('it-IT')}{unit ? ` ${unit}` : ''}
            </span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${maxVal > 0 ? (entry.value / maxVal) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface VolumeSectionProps {
  volumeData: VolumeAnalytics;
}

export default function VolumeSection({ volumeData }: VolumeSectionProps) {
  const { t } = useTranslation();
  const {
    volumeByMuscle,
    volumeByMuscleGroup,
    volumeByMovement,
    objectiveDistribution,
    avgSetsPerWeek,
    mostTrainedMuscle,
    leastTrainedMuscle
  } = volumeData;

  const [metric, setMetric] = useState<VolumeMetric>('weightedSets');

  const metricLabels = useMemo<Record<VolumeMetric, string>>(() => ({
    weightedSets: t('analytics.metricSets'),
    setsTimesReps: t('analytics.metricSetsTimesReps'),
    volumeTonnage: t('analytics.metricTonnage'),
  }), [t]);

  const metricUnits = useMemo<Record<VolumeMetric, string>>(() => ({
    weightedSets: t('common.sets'),
    setsTimesReps: '',
    volumeTonnage: t('units.kg'),
  }), [t]);

  const muscleLabelMap = t('enums.muscle', { returnObjects: true });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-caption text-muted-foreground">{t('analytics.setsPerWeek')}</p>
              <p className="text-sm font-bold">{avgSetsPerWeek}</p>
            </div>
            <div>
              <p className="text-caption text-muted-foreground">{t('analytics.mostTrained')}</p>
              <p className="truncate text-sm font-bold">{mostTrainedMuscle ? ((muscleLabelMap as Record<string, string>)[mostTrainedMuscle] ?? mostTrainedMuscle) : '—'}</p>
            </div>
            <div>
              <p className="text-caption text-muted-foreground">{t('analytics.leastTrained')}</p>
              <p className="truncate text-sm font-bold">{leastTrainedMuscle ? ((muscleLabelMap as Record<string, string>)[leastTrainedMuscle] ?? leastTrainedMuscle) : '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <ToggleGroup type="single" value={metric} onValueChange={(v) => v && setMetric(v as VolumeMetric)} size="sm">
          {(Object.keys(metricLabels) as VolumeMetric[]).map(k => (
            <ToggleGroupItem key={k} value={k} className="text-body-sm whitespace-normal h-auto py-1 px-2.5">
              {metricLabels[k]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Dumbbell className="h-4 w-4" />
            {t('analytics.byMuscleGroup')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <VolumeBarChart entries={volumeByMuscleGroup} metric={metric} category="muscleGroup" metricUnits={metricUnits} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Dumbbell className="h-4 w-4" />
            {t('analytics.byMuscle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <VolumeBarChart entries={volumeByMuscle} metric={metric} category="muscle" metricUnits={metricUnits} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Dumbbell className="h-4 w-4" />
            {t('analytics.byMovement')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <VolumeBarChart entries={volumeByMovement} metric={metric} category="movementPattern" metricUnits={metricUnits} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Target className="h-4 w-4" />
            {t('analytics.objectiveDistribution')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <VolumeBarChart entries={objectiveDistribution} metric={metric} category="trainingObjective" metricUnits={metricUnits} />
        </CardContent>
      </Card>
    </div>
  );
}
