import { useTranslation } from 'react-i18next';

import type { VolumeEntry } from '@/services/volumeAnalyzer';

import { VolumeBar } from './VolumeBar';

export interface AnalysisResult {
  byMuscle: VolumeEntry[];
  byMuscleGroup: VolumeEntry[];
  byMovementPattern: VolumeEntry[];
  byObjective: VolumeEntry[];
}

interface SessionVolumeAnalysisProps {
  analysis: AnalysisResult;
}

export function SessionVolumeAnalysis({ analysis }: SessionVolumeAnalysisProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <VolumeBar entries={analysis.byMuscle} label={t('analytics.byMuscleLabel')} />
      <VolumeBar entries={analysis.byMuscleGroup} label={t('analytics.byMuscleGroupLabel')} />
      <VolumeBar entries={analysis.byMovementPattern} label={t('analytics.byMovementPatternLabel')} />
      <VolumeBar entries={analysis.byObjective} label={t('analytics.byObjectiveLabel')} />
    </div>
  );
}
