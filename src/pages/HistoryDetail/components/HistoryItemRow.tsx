import { useMemo, useState } from 'react';

import { Plus, Trash2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ExercisePicker from '@/components/exercises/ExercisePicker';
import PerformanceBadge from '@/components/session/PerformanceBadge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { SessionSet, Exercise, SessionExerciseItem } from '@/domain/entities';
import { usePerformanceTrend } from '@/hooks/queries/sessionQueries';

import SetRow from './SetRow';

interface HistoryItemRowProps {
  item: SessionExerciseItem;
  exercise?: Exercise | null;
  sets: SessionSet[];
  originalExerciseNames: Map<string, string>;
  simpleMode: boolean;
  sessionId: string;
  exercises: Exercise[];
  groupId: string;
  onUpdateSet: (id: string, updates: Partial<SessionSet>) => void;
  onDeleteSet: (id: string) => void;
  onAddSet: (itemId: string, lastOrderIndex?: string) => void;
  onDeleteItem: (itemId: string, groupId: string) => void;
  onUpdateItem: (itemId: string, exerciseId: string) => void;
}

export default function HistoryItemRow({
  item,
  exercise,
  sets,
  originalExerciseNames,
  simpleMode,
  sessionId,
  exercises,
  groupId,
  onUpdateSet,
  onDeleteSet,
  onAddSet,
  onDeleteItem,
  onUpdateItem,
}: HistoryItemRowProps) {
  const { t } = useTranslation();
  const [changeExerciseOpen, setChangeExerciseOpen] = useState(false);

  const { data: trend } = usePerformanceTrend(exercise?.id, sessionId);

  const volume = useMemo(() => {
    return sets
      .filter(s => s.isCompleted && s.actualLoad && s.actualCount)
      .reduce((sum, s) => sum + (s.actualLoad! * s.actualCount!), 0);
  }, [sets]);

  const completedCount = useMemo(() => sets.filter(s => s.isCompleted).length, [sets]);

  const handleSelectNewExercise = (exerciseId: string) => {
    onUpdateItem(item.id, exerciseId);
    setChangeExerciseOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium">{exercise?.name ?? t('common.unknownExercise')}</h4>
          {item.originalExerciseId && (
            <p className="text-xs text-muted-foreground">
              {t('sessionMutator.substitutedFrom')}: {originalExerciseNames.get(item.originalExerciseId) ?? t('common.unknownExercise')}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {trend?.status && trend.status !== 'insufficient_data' && (
            <PerformanceBadge status={trend.status} />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setChangeExerciseOpen(true)}
            title={t('sessions.changeExercise')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" title={t('sessions.deleteExercise')}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:w-full">
              <AlertDialogHeader>
                <AlertDialogTitle>{t('sessions.deleteExercise')}</AlertDialogTitle>
                <AlertDialogDescription>{t('sessions.deleteExerciseConfirm')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDeleteItem(item.id, groupId)}>
                  {t('actions.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {sets.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{t('sessions.noSetsRecorded')}</p>
      ) : (
        <div className="space-y-1.5">
          {sets.map((s, idx) => (
            <SetRow
              key={s.id}
              set={s}
              index={idx}
              exercise={exercise ?? null}
              simpleMode={simpleMode}
              onUpdate={onUpdateSet}
              onDelete={onDeleteSet}
            />
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="text-body-sm w-full" onClick={() => onAddSet(item.id, sets[sets.length - 1]?.orderIndex)}>
        <Plus className="mr-1 h-3 w-3" />
        {t('sessions.addSetBlock')}
      </Button>
      {sets.length > 0 && (
        <div className="text-body-sm flex gap-3 text-muted-foreground">
          <span>{t('common.volume')}: {volume.toLocaleString('it-IT')} {t('units.kg')}</span>
          <span>{t('common.completedSets')}: {completedCount}/{sets.length}</span>
        </div>
      )}

      <Separator />

      {/* Change exercise dialog */}
      <Dialog open={changeExerciseOpen} onOpenChange={setChangeExerciseOpen}>
        <DialogContent className="flex flex-col overflow-y-auto sm:w-full sm:max-w-lg" style={{ maxHeight: '90vh', width: '95vw' }}>
          <DialogHeader>
            <DialogTitle>{t('sessions.changeExercise')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <ExercisePicker
              exercises={exercises}
              value={item.exerciseId}
              onSelect={handleSelectNewExercise}
              placeholder={t('sessions.selectExercise')}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
