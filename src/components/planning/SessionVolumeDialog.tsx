import { useMemo } from 'react';

import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PlannedExerciseGroup, PlannedExerciseItem, PlannedSet, Exercise } from '@/domain/entities';
import { CounterType } from '@/domain/enums';
import type { ClusterSetParams } from '@/domain/value-objects';
import { getClusterConfig } from '@/domain/value-objects';
import { useSessionVolume } from '@/hooks/queries/workoutQueries';
import { estimateSessionDurationFromData, formatDurationRange } from '@/services/durationEstimator';
import { analyzeItemsFromData, type ItemWithContext } from '@/services/volumeAnalyzer';

import { SessionVolumeAnalysis } from './SessionVolumeAnalysis';


interface SessionVolumeDialogProps {
  sessionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // DB fetch mode
  sessionId?: string | null;

  // Props mode
  groups?: PlannedExerciseGroup[];
  items?: Record<string, PlannedExerciseItem[]>;
  sets?: Record<string, PlannedSet[]>;
  exercises?: Exercise[];
}

export default function SessionVolumeDialog({
  sessionName, open, onOpenChange,
  sessionId,
  groups, items, sets, exercises
}: SessionVolumeDialogProps) {
  const { t } = useTranslation();

  const { data: dbData, isLoading: loading } = useSessionVolume(open ? sessionId : null);

  const translatedDbAnalysis = useMemo(() => {
    if (!dbData?.analysis) return null;
    const raw = dbData.analysis;
    return {
      // @ts-expect-error Translation keys are strictly typed but dynamic here
      byMuscle: raw.byMuscle.map(e => ({ ...e, label: t(`enums.muscle.${e.key}`) })),
      // @ts-expect-error Translation keys are strictly typed but dynamic here
      byMuscleGroup: raw.byMuscleGroup.map(e => ({ ...e, label: t(`enums.muscleGroup.${e.key}`) })),
      // @ts-expect-error Translation keys are strictly typed but dynamic here
      byMovementPattern: raw.byMovementPattern.map(e => ({ ...e, label: t(`enums.movementPattern.${e.key}`) })),
      // @ts-expect-error Translation keys are strictly typed but dynamic here
      byObjective: raw.byObjective.map(e => ({ ...e, label: t(`enums.trainingObjective.${e.key}`) })),
    };
  }, [dbData, t]);

  // --- Props Mode (Sync) ---
  const propAnalysis = useMemo(() => {
    if (sessionId || !groups || !items || !sets || !exercises) return null;
    const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));
    const allItems: ItemWithContext[] = [];
    for (const group of groups) {
      const groupItems = items[group.id] || [];
      for (const item of groupItems) {
        const exercise = exerciseMap[item.exerciseId];
        if (!exercise) continue;
        const itemSets = sets[item.id] || [];
        allItems.push({ item, exercise, sets: itemSets });
      }
    }
    return analyzeItemsFromData(
      allItems,
      // @ts-expect-error String key type mismatches with translation mapping
      (k) => t(`enums.muscle.${k}`),
      // @ts-expect-error String key type mismatches with translation mapping
      (k) => t(`enums.muscleGroup.${k}`),
      // @ts-expect-error String key type mismatches with translation mapping
      (k) => t(`enums.movementPattern.${k}`),
      // @ts-expect-error String key type mismatches with translation mapping
      (k) => t(`enums.trainingObjective.${k}`),
    );
  }, [sessionId, groups, items, sets, exercises, t]);

  const propDuration = useMemo(() => {
    if (sessionId || !groups || !items || !sets) return null;
    const itemsByGroup: Record<string, { counterType: CounterType; sets: PlannedSet[]; clusterParams?: ClusterSetParams }[]> = {};
    for (const group of groups) {
      const groupItems = items[group.id] || [];
      itemsByGroup[group.id] = groupItems.map(gi => ({
        counterType: gi.counterType,
        sets: sets[gi.id] || [],
        clusterParams: getClusterConfig(gi.modifiers),
      }));
    }
    return estimateSessionDurationFromData(groups, itemsByGroup);
  }, [sessionId, groups, items, sets]);

  const analysis = sessionId ? translatedDbAnalysis : propAnalysis;
  const duration = sessionId ? dbData?.duration : propDuration;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-85vh w-95vw max-w-lg overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          { }
          <DialogTitle className="text-body">{t('common.volume')} — {sessionName}</DialogTitle>
          {duration && duration.maxSeconds > 0 && (
            <Badge variant="outline" className="mt-2 w-fit gap-1">
              <Clock className="h-3 w-3" />
              {formatDurationRange(duration)}
            </Badge>
          )}
        </DialogHeader>

        {loading && <p className="py-8 text-center text-sm text-muted-foreground">{t('common.calculating')}</p>}

        {analysis && !loading && (
          <SessionVolumeAnalysis analysis={analysis} />
        )}
      </DialogContent>
    </Dialog>
  );
}
