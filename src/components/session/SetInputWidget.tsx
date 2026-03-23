import { useState } from 'react';

import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { SetInputValue } from '@/domain/activeSessionTypes';
import type { SessionSet, PlannedSet, PlannedExerciseItem } from '@/domain/entities';
import { CounterType } from '@/domain/enums';
import { formatPlannedSetSummary, getPlannedSetSummaryParts } from '@/lib/formatters/sessionFormatters';
import { formatRestSummary } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import type { LoadSuggestion } from '@/services/loadSuggestionEngine';

import LoadSuggestionDialog from './LoadSuggestionDialog';
import RPESelector from './RPESelector';
import SetInputActions from './set-input/SetInputActions';
import SetInputExtras from './set-input/SetInputExtras';
import SetInputHeader, { CompletedSetInfo } from './set-input/SetInputHeader';
import SetInputValues from './set-input/SetInputValues';
import { roundToHalf } from '@/lib/math';

export type { SetInputValue };

interface SetInputWidgetProps {
  value: SetInputValue;
  onChange: (value: SetInputValue) => void;
  sessionSet: SessionSet;
  plannedSet?: PlannedSet;
  plannedExerciseItem?: PlannedExerciseItem;
  exerciseId?: string;
  setNumber: number;
  totalSets: number;
  counterType: CounterType;
  expectedRPE?: number | null;
  completedSets?: CompletedSetInfo[];
  onComplete: () => void;
  onSkip: () => void;
  onSkipRemaining?: () => void;
  onAddSet?: () => void;
  onUncompleteSet?: (setId: string) => void;
  disabled?: boolean;
  simpleMode?: boolean;
  hideActions?: boolean;
}

export default function SetInputWidget({
  value, onChange,
  sessionSet: _sessionSet, plannedSet, plannedExerciseItem, exerciseId, setNumber, totalSets,
  counterType, expectedRPE, completedSets,
  onComplete, onSkip, onSkipRemaining, onAddSet, onUncompleteSet, disabled, simpleMode, hideActions,
}: SetInputWidgetProps) {
  const { t } = useTranslation();
  const [isCompleting, setIsCompleting] = useState(false);

  const updateValue = (updates: Partial<SetInputValue>) => {
    onChange({ ...value, ...updates });
  };

  const handleComplete = () => {
    setIsCompleting(true);
    setTimeout(() => {
      onComplete();
    }, 200);
  };

  const plannedSummary = plannedSet
    ? formatPlannedSetSummary(plannedSet, counterType, !!simpleMode, t, plannedExerciseItem)
    : null;

  const plannedSummaryParts = plannedSet
    ? getPlannedSetSummaryParts(plannedSet, counterType, !!simpleMode, t, plannedExerciseItem, { includeSetCount: false })
    : [];

  const plannedRestSummary = plannedSet ? formatRestSummary(plannedSet) : null;

  const resolvedExerciseId = exerciseId || plannedExerciseItem?.exerciseId;

  return (
    <div
      className={cn("rounded-xl overflow-hidden bg-transparent", isCompleting && "bg-success/10")}
    >
      <Card className={cn("border-border/50 transition-colors", isCompleting && "border-success/50")}>
        <CardContent className="flex flex-col gap-3 p-3">
          <SetInputHeader
            setNumber={setNumber}
            totalSets={totalSets}
            completedSets={completedSets}
            plannedSummary={plannedSummary}
            plannedSummaryParts={plannedSummaryParts}
            plannedNotes={plannedSet?.notes}
            plannedRestSummary={plannedRestSummary}
            isCompleting={isCompleting}
            onUncompleteSet={onUncompleteSet}
            simpleMode={simpleMode}
          />

          <SetInputValues
            value={value}
            onChange={onChange}
            counterType={counterType}
            disabled={disabled}
            exerciseId={resolvedExerciseId}
            plannedSet={plannedSet}
            plannedExerciseItem={plannedExerciseItem}
          />

          {/* RPE slider */}
          {!simpleMode && (
            <div className={disabled ? 'pointer-events-none opacity-50' : ''}>
              <RPESelector value={value.actualRPE} onChange={(rpe) => updateValue({ actualRPE: rpe !== null ? roundToHalf(rpe) : null })} expectedRPE={expectedRPE} />
            </div>
          )}

          <SetInputExtras
            value={value}
            onChange={onChange}
            disabled={disabled}
            simpleMode={simpleMode}
          />

          {/* Notes */}
          {!disabled && (
            <div className="flex justify-start">
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className={cn(
                      "text-caption flex items-center gap-1.5 transition-colors hover:text-foreground",
                      value.notes ? "text-primary font-medium" : "text-muted-foreground"
                    )}
                  >
                    <MessageSquare className={cn("h-3.5 w-3.5", value.notes && "fill-primary/20")} />
                    <span>{t('activeSession.notes')}</span>
                    {value.notes && <span className="h-1 w-1 rounded-full bg-primary" />}
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('activeSession.notes')}</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <Textarea
                      value={value.notes ?? ''}
                      onChange={(e) => updateValue({ notes: e.target.value })}
                      placeholder={t('activeSession.notes')}
                      className="text-body min-h-32"
                      aria-label={t('activeSession.notes')}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          <SetInputActions
            onComplete={handleComplete}
            onSkip={onSkip}
            onSkipRemaining={onSkipRemaining}
            onAddSet={onAddSet}
            disabled={disabled}
            hideActions={hideActions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
