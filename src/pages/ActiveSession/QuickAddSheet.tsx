import { useState, useEffect } from 'react';

import { Dumbbell, Repeat, Zap, Plus, X, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ExercisePicker from '@/components/exercises/ExercisePicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ExerciseGroupType } from '@/domain/enums';
import { useEnhancedExerciseCatalog } from '@/hooks/queries/workoutQueries';

type WizardStep = 'type' | 'exercise' | 'confirm';

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called to add a single exercise. */
  onAddExercise: (exerciseId: string) => void;
  /** Called to add a superset/circuit with multiple exercises. */
  onAddSuperset: (exerciseIds: string[], groupType: ExerciseGroupType) => void;
}

export default function QuickAddSheet({
  open,
  onOpenChange,
  onAddExercise,
  onAddSuperset,
}: QuickAddSheetProps) {
  const { t } = useTranslation();
  
  const { data: exercises = [] } = useEnhancedExerciseCatalog();

  const [step, setStep] = useState<WizardStep>('type');
  const [groupType, setGroupType] = useState<ExerciseGroupType>(ExerciseGroupType.Standard);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);

  // Reset wizard state when sheet opens
  useEffect(() => {
    if (open) {
      setStep('type');
      setGroupType(ExerciseGroupType.Standard);
      setSelectedExerciseIds([]);
    }
  }, [open]);

  const isMulti = groupType === ExerciseGroupType.Superset || groupType === ExerciseGroupType.Circuit;

  const handleTypeSelect = (type: ExerciseGroupType) => {
    setGroupType(type);
    setSelectedExerciseIds([]);
    setStep('exercise');
  };

  const handleExerciseSelect = (exerciseId: string) => {
    if (!isMulti) {
      // Single exercise -- go to confirm step
      setSelectedExerciseIds([exerciseId]);
      setStep('confirm');
    } else {
      // Multi-exercise -- toggle in list
      setSelectedExerciseIds(prev =>
        prev.includes(exerciseId)
          ? prev.filter(id => id !== exerciseId)
          : [...prev, exerciseId]
      );
    }
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExerciseIds(prev => prev.filter(id => id !== exerciseId));
  };

  const handleConfirm = () => {
    if (selectedExerciseIds.length === 0) return;

    if (isMulti) {
      onAddSuperset(selectedExerciseIds, groupType);
    } else {
      onAddExercise(selectedExerciseIds[0]);
    }
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'confirm' && !isMulti) {
      setStep('exercise');
    } else if (step === 'exercise') {
      setStep('type');
    } else if (step === 'confirm') {
      setStep('exercise');
    }
  };

  const selectedExerciseNames = selectedExerciseIds.map(
    id => exercises.find(e => e.id === id)?.name ?? '?'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        style={{ height: '85vh', maxWidth: '95vw' }} 
        className="overflow-y-auto sm:h-auto sm:max-w-xl"
      >
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 text-left">
            {step !== 'type' && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle>{t('sessionMutator.quickAddTitle')}</DialogTitle>
              <DialogDescription>
                {step === 'type' && t('sessionMutator.quickAdd')}
                {step === 'exercise' && t('sessionMutator.selectExercise')}
                {step === 'confirm' && t('sessionMutator.confirmAdd')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Type selection */}
          {step === 'type' && (
            <div className="grid grid-cols-1 gap-3">
              <button
                className="flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                onClick={() => handleTypeSelect(ExerciseGroupType.Standard)}
              >
                <Dumbbell className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-medium">{t('sessionMutator.singleExercise')}</div>
                </div>
              </button>
              <button
                className="flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                onClick={() => handleTypeSelect(ExerciseGroupType.Superset)}
              >
                <Repeat className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-medium">{t('sessionMutator.superset')}</div>
                </div>
              </button>
              <button
                className="flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                onClick={() => handleTypeSelect(ExerciseGroupType.Circuit)}
              >
                <Zap className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-medium">{t('sessionMutator.circuit')}</div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Exercise picker */}
          {step === 'exercise' && (
            <div className="space-y-4">
              {/* For multi-select: show selected exercises so far */}
              {isMulti && selectedExerciseIds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('sessionMutator.selectedExercises')} ({selectedExerciseIds.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExerciseNames.map((name, i) => (
                      <Badge key={selectedExerciseIds[i]} variant="secondary" className="text-body-sm gap-1">
                        {name}
                        <button
                          type="button"
                          className="ml-0.5 hover:text-destructive"
                          onClick={() => handleRemoveExercise(selectedExerciseIds[i])}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <ExercisePicker
                exercises={exercises}
                onSelect={handleExerciseSelect}
                placeholder={t('sessionMutator.selectExercise')}
              />

              {/* Multi-select: proceed to confirm when >= 2 exercises selected */}
              {isMulti && selectedExerciseIds.length >= 2 && (
                <Button className="w-full" onClick={() => setStep('confirm')}>
                  {t('sessionMutator.confirmAdd')} ({selectedExerciseIds.length})
                </Button>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Badge variant="outline">{t(`enums.exerciseGroupType.${groupType}`)}</Badge>
                <ul className="space-y-1.5">
                  {selectedExerciseNames.map((name, i) => (
                    <li key={selectedExerciseIds[i]} className="flex items-center gap-2 text-sm">
                      <span className="text-caption flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                        {i + 1}
                      </span>
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button className="w-full" onClick={handleConfirm}>
                <Plus className="mr-2 h-4 w-4" />
                {t('sessionMutator.confirmAdd')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
