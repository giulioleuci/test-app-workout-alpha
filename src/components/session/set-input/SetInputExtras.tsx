import { useState } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';
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
  const [showExtra, setShowExtra] = useState(false);

  const updateValue = (updates: Partial<SetInputValue>) => {
    onChange({ ...value, ...updates });
  };

  if (disabled || simpleMode) return null;

  return (
    <>
      <button
        onClick={() => setShowExtra(!showExtra)}
        className="text-caption flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        {showExtra ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {t('planning.toFailure')}, {t('activeSession.partials')}, {t('activeSession.forcedReps')}
      </button>

      {showExtra && (
        <div className="flex flex-col gap-2 pt-1">
          <Select value={value.actualToFailure} onValueChange={(v) => updateValue({ actualToFailure: v as ToFailureIndicator })}>
            <SelectTrigger className="text-body-sm h-7" aria-label={t('planning.toFailure')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ToFailureIndicator).map(tf => (
                <SelectItem key={tf} value={tf}>{t(`enums.toFailure.${tf}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={value.partials} onCheckedChange={(v) => updateValue({ partials: v })} className="scale-75" aria-label={t('activeSession.partials')} />
              <Label className="text-body-sm">{t('activeSession.partials')}</Label>
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-body-sm">{t('activeSession.forcedReps')}:</Label>
              <Input
                type="number"
                value={value.forcedReps}
                onChange={(e) => updateValue({ forcedReps: Number(e.target.value) })}
                className="text-body-sm h-7 w-14"
                min={0}
                aria-label={t('activeSession.forcedReps')}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
