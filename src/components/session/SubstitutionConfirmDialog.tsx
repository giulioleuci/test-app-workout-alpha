import { useState, useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { SubstitutionPrompt } from '@/services/sessionActivation';

interface Props {
  open: boolean;
  prompts: SubstitutionPrompt[];
  onComplete: (choices: Map<string, string>) => void;
  onCancel: () => void;
}

export default function SubstitutionConfirmDialog({ open, prompts, onComplete, onCancel }: Props) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices] = useState(() => new Map<string, string>());

  useEffect(() => {
    setCurrentIndex(0);
    choices.clear();
  }, [prompts, choices]);

  const current = prompts[currentIndex];
  if (!current) return null;

  const handleChoice = (exerciseId: string) => {
    choices.set(current.plannedItemId, exerciseId);
    if (currentIndex + 1 < prompts.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(new Map(choices));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('sessionMutator.swapExercise')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('sessionMutator.substitutionSuggestion', {
              suggested: current.suggestedExerciseName,
              original: current.originalExerciseName,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleChoice(current.originalExerciseId)}>
            {t('sessionMutator.keepOriginal')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => handleChoice(current.suggestedExerciseId)}>
            {t('sessionMutator.useSubstitute', { name: current.suggestedExerciseName })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
