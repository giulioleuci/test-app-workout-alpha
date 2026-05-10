import { useTranslation } from 'react-i18next';

import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/ui/stepper';
import type { PlannedSet } from '@/domain/entities';
import { INPUT_STEPS } from '@/domain/enums';

interface PlannedSetRpeSectionProps {
  ps: PlannedSet;
  onUpdate: (updates: Partial<PlannedSet>) => void;
}

export default function PlannedSetRpeSection({
  ps,
  onUpdate,
}: PlannedSetRpeSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-caption text-muted-foreground">{t('planning.rpe')}</Label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <Stepper
            value={ps.rpeRange?.min ?? ''}
            onValueChange={(v) => {
              if (v >= 1) {
                const currentMax = ps.rpeRange?.max ?? v;
                const newMax = v > currentMax ? v : currentMax;
                onUpdate({ rpeRange: { min: v, max: newMax } });
              } else {
                onUpdate({ rpeRange: undefined });
              }
            }}
            step={INPUT_STEPS.rpe} min={1} max={10} placeholder="—" label="Min"
          />
          <Stepper
            value={ps.rpeRange?.max ?? ''}
            onValueChange={(v) => {
              if (v >= 1 && ps.rpeRange) {
                const newMin = v < ps.rpeRange.min ? v : ps.rpeRange.min;
                onUpdate({ rpeRange: { ...ps.rpeRange, min: newMin, max: v } });
              } else if (!v) {
                 onUpdate({ rpeRange: undefined });
              }
            }}
            step={INPUT_STEPS.rpe} min={1} max={10} placeholder="—" label="Max"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-caption text-muted-foreground">{t('planning.fatigueProfile')}</Label>
        <div className="space-y-1.5">
          <Stepper
            value={ps.fatigueProgressionProfile?.expectedRPEIncrementPerSet ?? ''}
            onValueChange={(v) => {
              if (v > 0) {
                onUpdate({
                  fatigueProgressionProfile: {
                    expectedRPEIncrementPerSet: v,
                    tolerance: ps.fatigueProgressionProfile?.tolerance ?? 0.5,
                    description: ps.fatigueProgressionProfile?.description ?? '',
                  },
                });
              } else {
                onUpdate({ fatigueProgressionProfile: undefined });
              }
            }}
            step={INPUT_STEPS.rpe} min={0} max={2} placeholder="0.5" label={t('planning.expectedRPEIncrement')}
          />
          <Stepper
            value={ps.fatigueProgressionProfile?.tolerance ?? ''}
            onValueChange={(v) => onUpdate({
              fatigueProgressionProfile: {
                ...ps.fatigueProgressionProfile!,
                tolerance: v,
              },
            })}
            step={INPUT_STEPS.rpe} min={0} max={2} placeholder="0.5" label={t('planning.tolerance')}
          />
        </div>
      </div>
    </div>
  );
}
