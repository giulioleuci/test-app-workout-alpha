
import { useEffect, useState } from 'react';

import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { estimateSessionDuration, estimateWorkoutDuration, formatDurationRange, type DurationRange } from '@/services/durationEstimator';
import { analyzeWorkoutVolume, type WorkoutVolumeAnalysis, type VolumeEntry } from '@/services/volumeAnalyzer';

import { MuscleOverlapMatrix } from './MuscleOverlapMatrix';
import { VolumeBar } from './VolumeBar';

interface VolumeAnalysisDialogProps {
  workoutId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DurationBadge({ duration }: { duration: DurationRange | null }) {
  if (!duration || duration.maxSeconds === 0) return null;
  return (
    <div className="text-body-sm flex items-center gap-1.5 text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      <span>{formatDurationRange(duration)}</span>
    </div>
  );
}

function AnalysisSection({ analysis, duration }: { analysis: { byMuscle: VolumeEntry[]; byMuscleGroup: VolumeEntry[]; byMovementPattern: VolumeEntry[]; byObjective: VolumeEntry[] }; duration?: DurationRange | null }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {duration && <DurationBadge duration={duration} />}
      <VolumeBar entries={analysis.byMuscle} label={t('analytics.byMuscleLabel')} emptyMessage={t('analytics.noDataShort')} />
      <VolumeBar entries={analysis.byMuscleGroup} label={t('analytics.byMuscleGroupLabel')} emptyMessage={t('analytics.noDataShort')} />
      <VolumeBar entries={analysis.byMovementPattern} label={t('analytics.byMovementPatternLabel')} emptyMessage={t('analytics.noDataShort')} />
      <VolumeBar entries={analysis.byObjective} label={t('analytics.byObjectiveLabel')} emptyMessage={t('analytics.noDataShort')} />
    </div>
  );
}

export default function VolumeAnalysisDialog({ workoutId, open, onOpenChange }: VolumeAnalysisDialogProps) {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<WorkoutVolumeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState<DurationRange | null>(null);
  const [sessionDurations, setSessionDurations] = useState<Record<string, DurationRange>>({});

  useEffect(() => {
    if (!workoutId || !open) return;
    setLoading(true);
    void Promise.all([
      analyzeWorkoutVolume(
        workoutId,
        (k) => {
          // @ts-expect-error dynamic i18n key
          return t(`enums.muscle.${k}`);
        },
        (k) => {
          // @ts-expect-error dynamic i18n key
          return t(`enums.muscleGroup.${k}`);
        },
        (k) => {
          // @ts-expect-error dynamic i18n key
          return t(`enums.movementPattern.${k}`);
        },
        (k) => {
          // @ts-expect-error dynamic i18n key
          return t(`enums.trainingObjective.${k}`);
        },
      ),
      estimateWorkoutDuration(workoutId),
    ]).then(async ([r, wd]) => {
      setAnalysis(r);
      setWorkoutDuration(wd);
      const durEntries = await Promise.all(
        r.sessions.map(async s => [s.sessionId, await estimateSessionDuration(s.sessionId)] as const)
      );
      setSessionDurations(Object.fromEntries(durEntries));
      setLoading(false);
    });
  }, [workoutId, open, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-85vh w-95vw max-w-lg overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-body">{t('analytics.volumeAnalysisTitle')}{' — '}{analysis?.workoutName}</DialogTitle>
        </DialogHeader>

        {loading && <p className="py-8 text-center text-sm text-muted-foreground">{t('common.calculating')}</p>}

        {analysis && !loading && (
          <Tabs defaultValue="total">
            <TabsList className="flex h-auto w-full flex-wrap gap-1">
              <TabsTrigger value="total" className="text-body-sm min-w-[120px] flex-1 whitespace-normal break-words h-auto py-2">{t('analytics.fullPlan')}</TabsTrigger>
              {analysis.sessions.map(s => (
                <TabsTrigger key={s.sessionId} value={s.sessionId} className="text-body-sm min-w-[120px] flex-1 whitespace-normal break-words h-auto py-2">
                  {s.sessionName}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="total" className="mt-4 space-y-6">
              <AnalysisSection analysis={analysis.total} duration={workoutDuration} />
              <MuscleOverlapMatrix data={analysis.muscleOverlap} />
            </TabsContent>

            {analysis.sessions.map(s => (
              <TabsContent key={s.sessionId} value={s.sessionId} className="mt-4">
                <AnalysisSection analysis={s} duration={sessionDurations[s.sessionId]} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
