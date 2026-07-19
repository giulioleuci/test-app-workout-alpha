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
        onMinChange={(v) => {
          const newMax = ps.setCountRange.max != null && v > ps.setCountRange.max ? v : ps.setCountRange.max;
          onUpdate({ setCountRange: { ...ps.setCountRange, min: v, max: newMax } });
        }}
        onMaxChange={(v) => {
          const newMin = v < ps.setCountRange.min ? v : ps.setCountRange.min;
          onUpdate({ setCountRange: { ...ps.setCountRange, min: newMin, max: v } });
        }}
        step={INPUT_STEPS.count} min={1} placeholderMin="min" placeholderMax="max"
      />

      <div className="space-y-1">
        <Label className="text-caption text-muted-foreground">{t(`enums.counterType.${counterType}`)}</Label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <Stepper
            value={ps.countRange.min}
            onValueChange={(v) => {
              const newMax = ps.countRange.max != null && v > ps.countRange.max ? v : ps.countRange.max;
              onUpdate({ countRange: { ...ps.countRange, min: v, max: newMax } });
            }}
            step={INPUT_STEPS.count} min={0} label={t('common.min')}
          />
          <Stepper
            value={ps.countRange.max ?? ''}
            onValueChange={(v) => {
              if (v === 0 || !v) {
                onUpdate({ countRange: { ...ps.countRange, max: null } });
              } else {
                const newMin = v < ps.countRange.min ? v : ps.countRange.min;
                onUpdate({ countRange: { ...ps.countRange, min: newMin, max: v } });
              }
            }}
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
                const currentMax = ps.restSecondsRange?.max ?? v;
                const newMax = v > currentMax ? v : currentMax;
                onUpdate({ restSecondsRange: { min: v, max: newMax, isFixed: false } });
              } else {
                onUpdate({ restSecondsRange: undefined });
              }
            }}
            step={INPUT_STEPS.count} min={0} placeholder="—" label={t('common.min')}
          />
          <Stepper
            value={ps.restSecondsRange?.max ?? ''}
            onValueChange={(v) => {
              if (v === 0 || !v) {
                onUpdate({ restSecondsRange: undefined });
              } else if (ps.restSecondsRange) {
                const newMin = v < ps.restSecondsRange.min ? v : ps.restSecondsRange.min;
                onUpdate({ restSecondsRange: { ...ps.restSecondsRange, min: newMin, max: v } });
              }
            }}
            step={INPUT_STEPS.count} min={0} placeholder="—" label={t('common.max')}
          />
        </div>
      </div>
    </div>
  );
}
