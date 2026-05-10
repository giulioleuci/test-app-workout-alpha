import { useTranslation } from 'react-i18next';

import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/ui/stepper';
import { Switch } from '@/components/ui/switch';
import type { PlannedSet } from '@/domain/entities';
import { INPUT_STEPS } from '@/domain/enums';

interface PlannedSetLoadSectionProps {
  ps: PlannedSet;
  simpleMode: boolean;
  onUpdate: (updates: Partial<PlannedSet>) => void;
}

export default function PlannedSetLoadSection({
  ps,
  simpleMode,
  onUpdate,
}: PlannedSetLoadSectionProps) {
  const { t } = useTranslation();

  return (
    <div className={`grid grid-cols-1 ${!simpleMode ? 'sm:grid-cols-2' : ''} gap-3`}>
      <div className="space-y-1">
        <Label className="text-caption text-muted-foreground">{t('planning.load')} ({t('units.kg')})</Label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <Stepper
            value={ps.loadRange?.min ?? ''}
            onValueChange={(v) => {
              if (v > 0) {
                const newMax = ps.loadRange?.max != null && v > ps.loadRange.max ? v : ps.loadRange?.max ?? null;
                onUpdate({ loadRange: { min: v, max: newMax, unit: 'kg' } });
              } else {
                onUpdate({ loadRange: undefined });
              }
            }}
            step={INPUT_STEPS.load} min={0} placeholder="—" label={t('common.min')}
          />
          <Stepper
            value={ps.loadRange?.max ?? ''}
            onValueChange={(v) => {
              if (v === 0 || !v) {
                if (ps.loadRange) {
                  onUpdate({ loadRange: { ...ps.loadRange, max: null } });
                }
              } else {
                const newMin = ps.loadRange?.min != null && v < ps.loadRange.min ? v : ps.loadRange?.min ?? 0;
                onUpdate({ loadRange: { min: newMin, max: v, unit: 'kg' } });
              }
            }}
            step={INPUT_STEPS.load} min={0} placeholder="—" label={t('common.max')}
          />
        </div>
      </div>

      {!simpleMode && (
        <div className="space-y-1">
          <Label className="text-caption text-muted-foreground">{t('planning.percentage1RM')}</Label>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <Stepper
              value={ps.percentage1RMRange ? Math.round(ps.percentage1RMRange.min * 100) : ''}
              onValueChange={(v) => {
                if (v >= 40) {
                  const currentMax = ps.percentage1RMRange ? Math.round(ps.percentage1RMRange.max * 100) : v;
                  const newMax = v > currentMax ? v : currentMax;
                  onUpdate({ percentage1RMRange: { min: v / 100, max: newMax / 100, basedOnEstimated1RM: ps.percentage1RMRange?.basedOnEstimated1RM ?? true } });
                } else {
                  onUpdate({ percentage1RMRange: undefined });
                }
              }}
              step={INPUT_STEPS.count} min={40} max={100} placeholder="—" label={t('common.min')}
            />
            <Stepper
              value={ps.percentage1RMRange ? Math.round(ps.percentage1RMRange.max * 100) : ''}
              onValueChange={(v) => {
                if (v >= 40 && ps.percentage1RMRange) {
                  const currentMin = Math.round(ps.percentage1RMRange.min * 100);
                  const newMin = v < currentMin ? v : currentMin;
                  onUpdate({ percentage1RMRange: { ...ps.percentage1RMRange, min: newMin / 100, max: v / 100 } });
                } else if (!v || v < 40) {
                  onUpdate({ percentage1RMRange: undefined });
                }
              }}
              step={INPUT_STEPS.count} min={40} max={100} placeholder="—" label={t('common.max')}
            />
          </div>
          {ps.percentage1RMRange && (
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={ps.percentage1RMRange.basedOnEstimated1RM}
                onCheckedChange={(v) => onUpdate({ percentage1RMRange: { ...ps.percentage1RMRange!, basedOnEstimated1RM: v } })}
                className="scale-75"
              />
              <Label className="text-body-sm text-muted-foreground">{t('planning.basedOnEstimated1RM')}</Label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
