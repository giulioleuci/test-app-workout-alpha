import { useState, useEffect } from 'react';

import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlannedSet, PlannedExerciseItem } from '@/domain/entities';
import { CounterType, CounterTypeConfig, INPUT_STEPS } from '@/domain/enums';
import { cn } from '@/lib/utils';

import LoadSuggestionDialog from '../LoadSuggestionDialog';

import type { SetInputValue } from '../SetInputWidget';


interface SetInputValuesProps {
  value: SetInputValue;
  onChange: (value: SetInputValue) => void;
  counterType: CounterType;
  disabled?: boolean;
  exerciseId?: string;
  plannedSet?: PlannedSet;
  plannedExerciseItem?: PlannedExerciseItem;
}

export default function SetInputValues({ 
  value, onChange, counterType, disabled,
  exerciseId, plannedSet, plannedExerciseItem 
}: SetInputValuesProps) {
  const { t } = useTranslation();

  // Local state for debounced numeric inputs
  const [localLoad, setLocalLoad] = useState<string>(value.actualLoad?.toString() ?? '');
  const [localCount, setLocalCount] = useState<string>(value.actualCount?.toString() ?? '');

  useEffect(() => {
    setLocalLoad(value.actualLoad?.toString() ?? '');
  }, [value.actualLoad]);

  useEffect(() => {
    setLocalCount(value.actualCount?.toString() ?? '');
  }, [value.actualCount]);

  const counterConfig = CounterTypeConfig[counterType];
  const label = t(`enums.counterType.${counterType}`);

  const loadIncrement = INPUT_STEPS.load;

  const updateValue = (updates: Partial<SetInputValue>) => {
    onChange({ ...value, ...updates });
  };

  const handleLoadBlur = () => {
    const num = parseFloat(localLoad);
    updateValue({ actualLoad: isNaN(num) ? null : num });
  };

  const handleCountBlur = () => {
    const num = parseInt(localCount);
    updateValue({ actualCount: isNaN(num) ? null : num });
  };

  return (
    <div className={cn("grid grid-cols-1 gap-2", disabled && "opacity-50 pointer-events-none")}>
      {/* Load Input */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Label className="text-caption text-muted-foreground">{t('activeSession.loadKg')}</Label>
          {exerciseId && !disabled && (
            <LoadSuggestionDialog
              exerciseId={exerciseId}
              plannedSet={plannedSet}
              plannedExerciseItem={plannedExerciseItem}
              onApply={(load) => updateValue({ actualLoad: load })}
              variant="icon"
            />
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => updateValue({ actualLoad: Math.max(0, (value.actualLoad ?? 0) - loadIncrement) })} aria-label={t('actions.decrease')}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Input
            type="number"
            value={localLoad}
            onChange={(e) => setLocalLoad(e.target.value)}
            onBlur={handleLoadBlur}
            className="h-8 text-center font-semibold"
            step={loadIncrement}
            aria-label={t('activeSession.loadKg')}
          />
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => updateValue({ actualLoad: (value.actualLoad ?? 0) + loadIncrement })} aria-label={t('actions.increase')}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Count Input */}
      <div className="flex flex-col gap-1">
        <Label className="text-caption text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-0.5">
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => updateValue({ actualCount: Math.max(0, (value.actualCount ?? 0) - counterConfig.step) })} aria-label={t('actions.decrease')}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Input
            type="number"
            value={localCount}
            onChange={(e) => setLocalCount(e.target.value)}
            onBlur={handleCountBlur}
            className="h-8 text-center font-semibold"
            step={counterConfig.step}
            aria-label={label}
          />
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => updateValue({ actualCount: (value.actualCount ?? 0) + counterConfig.step })} aria-label={t('actions.increase')}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
