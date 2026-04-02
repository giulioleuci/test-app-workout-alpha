import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { INPUT_STEPS } from '@/domain/enums';
import { roundToHalf } from '@/lib/math';
import { cn } from '@/lib/utils';

interface RPESelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  expectedRPE?: number | null;
}

const RPE_MIN = 1;
const RPE_MAX = 10;

/** Round RPE to nearest 0.5 multiple */
export function snapRpe(v: number): number {
  return roundToHalf(v);
}

/** Round RPE up to nearest integer (for contexts requiring integer RPE) */
export function ceilRpe(v: number): number {
  return Math.ceil(v);
}

function rpeColor(rpe: number): string {
  if (rpe <= 5) return 'text-primary';
  if (rpe <= 7) return 'text-success';
  if (rpe <= 8) return 'text-warning';
  if (rpe <= 9) return 'text-orange-500'; // Standard orange for high RPE
  return 'text-destructive';
}

export default function RPESelector({ value, onChange, expectedRPE }: RPESelectorProps) {
  const { t } = useTranslation();
  // If no value is set, default to expectedRPE or 7 for the slider position
  const sliderValue = value ?? expectedRPE ?? 7;

  return (
    <div className="space-y-3">
      <div style={{ minHeight: '20px' }} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-body-sm font-medium">{t('planning.rpe')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-bold tabular-nums w-8 text-center",
            value ? rpeColor(value) : "text-muted-foreground"
          )}>
            {value != null ? (Number.isInteger(value) ? value : value.toFixed(1)) : '-'}
          </span>
          {value !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="text-caption h-5 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onChange(null)}
            >
              {t('actions.clear')}
            </Button>
          )}
        </div>
      </div>

      <Slider
        value={[sliderValue]}
        onValueChange={(vals) => onChange(vals[0])}
        min={RPE_MIN}
        max={RPE_MAX}
        step={INPUT_STEPS.rpe}
        className={cn(value === null && "opacity-50")}
      />

      {/* Show description if value selected */}
      {value !== null && t(`rpe.${value}`) && (
        <p className="text-caption text-center text-muted-foreground">
          {t(`rpe.${value}`)}
        </p>
      )}
    </div>
  );
}
