import { useTranslation } from 'react-i18next';

import { Label } from '@/components/ui/label';
import { RangeStepper } from '@/components/ui/range-stepper';
import { Stepper } from '@/components/ui/stepper';
import { Switch } from '@/components/ui/switch';
import type { PlannedSet } from '@/domain/entities';
import { CounterType, ToFailureIndicator, INPUT_STEPS } from '@/domain/enums';

interface PlannedSetCountsSectionProps {
  ps: PlannedSet;
  counterType: CounterType;
  simpleMode: boolean;
  onUpdate: (updates: Partial<PlannedSet>) => void;
}

export default function PlannedSetCountsSection({
  ps,
  counterType,
  simpleMode,
  onUpdate,
}: PlannedSetCountsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <RangeStepper
        label={t('planning.setCount')}
        minVal={ps.setCountRange.min}
        maxVal={ps.setCountRange.max ?? ''}
        onMinChange={(v) => onUpdate({ setCountRange: { ...ps.setCountRange, min: v } })}
        onMaxChange={(v) => onUpdate({ setCountRange: { ...ps.setCountRange, max: v } })}
        step={INPUT_STEPS.count} min={1} placeholderMin="min" placeholderMax="max"
      />

      <div className="space-y-1">
        <Label className="text-caption text-muted-foreground">{t(`enums.counterType.${counterType}`)}</Label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <Stepper
            value={ps.countRange.min}
            onValueChange={(v) => onUpdate({ countRange: { ...ps.countRange, min: v } })}
            step={INPUT_STEPS.count} min={0} label={t('common.min')}
          />
          <Stepper
            value={ps.countRange.max ?? ''}
            onValueChange={(v) => onUpdate({ countRange: { ...ps.countRange, max: v || null } })}
            step={INPUT_STEPS.count} min={0} placeholder="∞" label={t('common.max')}
          />
        </div>
        {!simpleMode && (
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={ps.countRange.toFailure !== ToFailureIndicator.None}
              onCheckedChange={(checked) => onUpdate({
                countRange: {
                  ...ps.countRange,
                  toFailure: checked ? ToFailureIndicator.TechnicalFailure : ToFailureIndicator.None,
                },
              })}
              className="scale-75"
            />
            <Label className="text-body-sm text-muted-foreground">{t('planning.toFailure')}</Label>
            {ps.countRange.toFailure !== ToFailureIndicator.None && (
              <span className="text-caption ml-auto text-muted-foreground">
                {ps.countRange.max != null
                  ? `${ps.countRange.min}–${ps.countRange.max}+`
                  : `${ps.countRange.min}+`}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1 sm:col-span-2">
        <Label className="text-caption text-muted-foreground">{t('planning.rest')} ({t('time.seconds')})</Label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <Stepper
            value={ps.restSecondsRange?.min ?? ''}
            onValueChange={(v) => {
              if (v > 0) {
                onUpdate({ restSecondsRange: { min: v, max: ps.restSecondsRange?.max ?? v, isFixed: false } });
              } else {
                onUpdate({ restSecondsRange: undefined });
              }
            }}
            step={INPUT_STEPS.count} min={0} placeholder="—" label={t('common.min')}
          />
          <Stepper
            value={ps.restSecondsRange?.max ?? ''}
            onValueChange={(v) => onUpdate({ restSecondsRange: { ...ps.restSecondsRange!, max: v } })}
            step={INPUT_STEPS.count} min={0} placeholder="—" label={t('common.max')}
          />
        </div>
      </div>
    </div>
  );
}
