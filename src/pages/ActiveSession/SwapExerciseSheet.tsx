import { useTranslation } from 'react-i18next';

import ExercisePicker from '@/components/exercises/ExercisePicker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useEnhancedExerciseCatalog } from '@/hooks/queries/exerciseQueries';

interface SwapExerciseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The SessionExerciseItem ID whose exercise should be swapped. */
  sessionExerciseItemId: string | null;
  /** Current exercise ID (pre-selected in picker). */
  currentExerciseId: string | null;
  /** Called when the user picks a replacement exercise. */
  onSwap: (sessionExerciseItemId: string, newExerciseId: string) => void;
}

export default function SwapExerciseSheet({
  open,
  onOpenChange,
  sessionExerciseItemId,
  currentExerciseId,
  onSwap,
}: SwapExerciseSheetProps) {
  const { t } = useTranslation();
  const { data: exercises = [] } = useEnhancedExerciseCatalog();

  const handleSelect = (exerciseId: string) => {
    if (!sessionExerciseItemId || exerciseId === currentExerciseId) return;
    onSwap(sessionExerciseItemId, exerciseId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        style={{ height: '85vh', maxWidth: '95vw' }} 
        className="overflow-y-auto sm:h-auto sm:max-w-xl"
      >
        <DialogHeader className="mb-4">
          <DialogTitle>{t('sessionMutator.swapExercise')}</DialogTitle>
          <DialogDescription>{t('sessionMutator.swapExerciseDesc')}</DialogDescription>
        </DialogHeader>

        <ExercisePicker
          exercises={exercises}
          value={currentExerciseId ?? undefined}
          onSelect={handleSelect}
          placeholder={t('sessionMutator.selectExercise')}
        />
      </DialogContent>
    </Dialog>
  );
}
