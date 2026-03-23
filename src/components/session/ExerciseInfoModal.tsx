import { useState } from 'react';

import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Exercise } from '@/domain/entities';


interface Props {
  exercise: Exercise;
}

export function ExerciseInfoButton({ exercise }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        title={t('exercises.infoModal.title')}
      >
        <Info className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ maxHeight: '80vh' }} className="max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{exercise.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Type + Movement Pattern chips */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{t(`enums.exerciseType.${exercise.type}`)}</Badge>
              <Badge variant="outline">{t(`enums.movementPattern.${exercise.movementPattern}`)}</Badge>
            </div>

            {/* Equipment */}
            {exercise.equipment?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('exercises.infoModal.equipment')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.equipment.map(eq => (
                    <Badge key={eq} variant="outline" className="text-xs">{t(`enums.equipment.${eq}`)}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Primary muscles */}
            {exercise.primaryMuscles?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('exercises.infoModal.primaryMuscles')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.primaryMuscles.map(m => (
                    <Badge key={m} className="text-xs">{t(`enums.muscle.${m}`)}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary muscles */}
            {exercise.secondaryMuscles?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('exercises.infoModal.secondaryMuscles')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.secondaryMuscles.map(m => (
                    <Badge key={m} variant="secondary" className="text-xs">{t(`enums.muscle.${m}`)}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {exercise.description && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('exercises.infoModal.description')}
                </p>
                <p className="text-sm leading-relaxed text-foreground">{exercise.description}</p>
              </div>
            )}

            {/* Key Points */}
            {exercise.keyPoints && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('exercises.infoModal.keyPoints')}
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{exercise.keyPoints}</p>
              </div>
            )}

            {/* Fallback when no extra info */}
            {!exercise.description && !exercise.keyPoints && (
              <p className="italic text-muted-foreground">{t('exercises.infoModal.noInfo')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
