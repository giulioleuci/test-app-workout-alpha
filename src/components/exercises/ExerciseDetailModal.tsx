import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { Exercise } from '@/domain/entities';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExerciseDetailModal({ exercise, open, onOpenChange }: ExerciseDetailModalProps) {
  const { t } = useTranslation();

  if (!exercise) return null;

  const equipment = Array.isArray(exercise.equipment)
    ? exercise.equipment
    : [exercise.equipment];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxHeight: '90vh' }} className="max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exercise.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Type & Movement Pattern */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('exercises.infoModal.type')}
              </p>
              <Badge variant="outline">{t(`enums.exerciseType.${exercise.type}`)}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('exercises.infoModal.movementPattern')}
              </p>
              <Badge variant="outline">{t(`enums.movementPattern.${exercise.movementPattern}`)}</Badge>
            </div>
          </div>

          <Separator />

          {/* Primary Muscles */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('exercises.infoModal.primaryMuscles')}
            </p>
            {exercise.primaryMuscles.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {exercise.primaryMuscles.map((m) => (
                  <Badge key={m} variant="secondary">{t(`enums.muscle.${m}`)}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Secondary Muscles */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('exercises.infoModal.secondaryMuscles')}
            </p>
            {exercise.secondaryMuscles.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {exercise.secondaryMuscles.map((m) => (
                  <Badge key={m} variant="secondary" className="opacity-80">{t(`enums.muscle.${m}`)}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('exercises.infoModal.equipment')}
            </p>
            {equipment.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {equipment.map((eq) => (
                  <Badge key={eq} variant="outline">{t(`enums.equipment.${eq}`)}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Description */}
          {exercise.description && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('exercises.infoModal.description')}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{exercise.description}</p>
              </div>
            </>
          )}

          {/* Key Points */}
          {exercise.keyPoints && (
            <>
              {!exercise.description && <Separator />}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('exercises.infoModal.keyPoints')}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{exercise.keyPoints}</p>
              </div>
            </>
          )}

          {/* Fallback when nothing extra */}
          {!exercise.description && !exercise.keyPoints && (
            <>
              <Separator />
              <p className="text-center text-sm text-muted-foreground">{t('exercises.infoModal.noInfo')}</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
