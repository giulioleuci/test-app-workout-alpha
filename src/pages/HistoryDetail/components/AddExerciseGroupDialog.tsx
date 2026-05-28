import { useState, useEffect } from 'react';

import { ArrowLeft, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ExercisePicker from '@/components/exercises/ExercisePicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Exercise } from '@/domain/entities';
import { ExerciseGroupType } from '@/domain/enums';

type Step = 'type' | 'exercise' | 'confirm';

const MULTI_GROUP_TYPES = new Set([ExerciseGroupType.Superset, ExerciseGroupType.Circuit]);

const GROUP_TYPE_ORDER: ExerciseGroupType[] = [
  ExerciseGroupType.Standard,
  ExerciseGroupType.Superset,
  ExerciseGroupType.Circuit,
  ExerciseGroupType.Warmup,
  ExerciseGroupType.Amrap,
  ExerciseGroupType.Emom,
  ExerciseGroupType.Cluster,
];

interface AddExerciseGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  onConfirm: (exerciseIds: string[], groupType: ExerciseGroupType) => void;
}

export default function AddExerciseGroupDialog({
  open,
  onOpenChange,
  exercises,
  onConfirm,
}: AddExerciseGroupDialogProps) {
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>('type');
  const [groupType, setGroupType] = useState<ExerciseGroupType>(ExerciseGroupType.Standard);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setStep('type');
      setGroupType(ExerciseGroupType.Standard);
      setSelectedIds([]);
    }
  }, [open]);

  const isMulti = MULTI_GROUP_TYPES.has(groupType);

  const handleTypeSelect = (type: ExerciseGroupType) => {
    setGroupType(type);
    setSelectedIds([]);
    setStep('exercise');
  };

  const handleExerciseSelect = (exerciseId: string) => {
    if (!isMulti) {
      setSelectedIds([exerciseId]);
      setStep('confirm');
    } else {
      setSelectedIds(prev =>
        prev.includes(exerciseId)
          ? prev.filter(id => id !== exerciseId)
          : [...prev, exerciseId]
      );
    }
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) return;
    onConfirm(selectedIds, groupType);
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'confirm') setStep('exercise');
    else if (step === 'exercise') setStep('type');
  };

  const selectedNames = selectedIds.map(id => exercises.find(e => e.id === id)?.name ?? '?');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ height: '85vh', maxWidth: '95vw' }}
        className="flex flex-col overflow-hidden sm:h-auto sm:max-w-xl"
      >
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2 text-left">
            {step !== 'type' && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle>{t('sessions.addExerciseGroup')}</DialogTitle>
              <DialogDescription>
                {step === 'type' && t('sessionMutator.quickAdd')}
                {step === 'exercise' && t('sessionMutator.selectExercise')}
                {step === 'confirm' && t('sessionMutator.confirmAdd')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {step === 'type' && (
            <div className="grid grid-cols-1 gap-2">
              {GROUP_TYPE_ORDER.map(type => (
                <button
                  key={type}
                  className="flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => handleTypeSelect(type)}
                >
                  <span className="font-medium">{t(`enums.exerciseGroupType.${type}`)}</span>
                  {MULTI_GROUP_TYPES.has(type) && (
                    <span className="ml-auto text-xs text-muted-foreground">{t('sessionMutator.selectedExercises').split(' ')[0]}…</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 'exercise' && (
            <div className="space-y-3">
              {isMulti && selectedIds.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-body-sm font-medium text-muted-foreground">
                    {t('sessionMutator.selectedExercises')} ({selectedIds.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNames.map((name, i) => (
                      <Badge key={selectedIds[i]} variant="secondary" className="text-body-sm gap-1">
                        {name}
                        <button
                          type="button"
                          className="ml-0.5 hover:text-destructive"
                          onClick={() => setSelectedIds(prev => prev.filter(id => id !== selectedIds[i]))}
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
              {isMulti && selectedIds.length >= 2 && (
                <Button className="w-full" onClick={() => setStep('confirm')}>
                  {t('sessionMutator.confirmAdd')} ({selectedIds.length})
                </Button>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Badge variant="outline">{t(`enums.exerciseGroupType.${groupType}`)}</Badge>
                <ul className="space-y-1.5">
                  {selectedNames.map((name, i) => (
                    <li key={selectedIds[i]} className="flex items-center gap-2 text-sm">
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
