import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToFailureIndicator } from '@/domain/enums';

import type { SetInputValue } from '../SetInputWidget';

interface SetInputExtrasProps {
  value: SetInputValue;
  onChange: (value: SetInputValue) => void;
  disabled?: boolean;
  simpleMode?: boolean;
}

export default function SetInputExtras({ value, onChange, disabled, simpleMode }: SetInputExtrasProps) {
  const { t } = useTranslation();

  const updateValue = (updates: Partial<SetInputValue>) => {
    onChange({ ...value, ...updates });
  };

  if (disabled || simpleMode) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-caption text-muted-foreground">{t('planning.toFailure')}</Label>
        <Select value={value.actualToFailure} onValueChange={(v) => updateValue({ actualToFailure: v as ToFailureIndicator })}>
          <SelectTrigger className="text-body-sm h-10" aria-label={t('planning.toFailure')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ToFailureIndicator).map(tf => (
              <SelectItem key={tf} value={tf}>{t(`enums.toFailure.${tf}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch checked={value.partials} onCheckedChange={(v) => updateValue({ partials: v })} aria-label={t('activeSession.partials')} />
          <Label className="text-body-sm">{t('activeSession.partials')}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-body-sm">{t('activeSession.forcedReps')}</Label>
          <Input
            type="number"
            value={value.forcedReps}
            onChange={(e) => updateValue({ forcedReps: Number(e.target.value) })}
            className="text-body-sm h-10 w-16"
            min={0}
            aria-label={t('activeSession.forcedReps')}
          />
        </div>
      </div>
    </div>
  );
}
