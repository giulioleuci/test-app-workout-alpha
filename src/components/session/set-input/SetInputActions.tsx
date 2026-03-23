import { Check, SkipForward, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SetInputActionsProps {
  onComplete: () => void;
  onSkip: () => void;
  onSkipRemaining?: () => void;
  onAddSet?: () => void;
  disabled?: boolean;
  hideActions?: boolean;
}

export default function SetInputActions({
  onComplete, onSkip, onSkipRemaining, onAddSet, disabled, hideActions
}: SetInputActionsProps) {
  const { t } = useTranslation();

  if (disabled || hideActions) return null;

  return (
    <>
      <Separator />
      <div className="sticky bottom-0 z-10 -mx-3 bg-card px-3 py-1">
        <div className="flex items-center gap-1.5">
          <Button className="h-9 flex-1 gap-1.5" onClick={onComplete}>
            <Check className="h-4 w-4 shrink-0" />
            <span className="hidden text-sm sm:inline">{t('activeSession.completeSetShort')}</span>
          </Button>
          <Button variant="outline" className="h-9 gap-1.5 px-2 sm:px-3" onClick={onSkip} title={t('activeSession.skipSet')}>
            <SkipForward className="h-4 w-4 shrink-0" />
            <span className="hidden text-sm sm:inline">{t('activeSession.skipSet')}</span>
          </Button>
          {onSkipRemaining && (
            <Button variant="outline" className="h-9 gap-1.5 px-2 sm:px-3" onClick={onSkipRemaining} title={t('activeSession.skipRemaining')}>
              <SkipForward className="h-4 w-4 shrink-0 opacity-60" />
              <SkipForward className="-ml-3 h-4 w-4 shrink-0" />
              <span className="hidden text-sm sm:inline">{t('activeSession.skipRemaining')}</span>
            </Button>
          )}
          {onAddSet && (
            <Button variant="outline" className="h-9 gap-1.5 px-2 sm:px-3" onClick={onAddSet} title={t('activeSession.addAnotherSet')}>
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm sm:inline">{t('activeSession.addAnotherSetShort')}</span>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
