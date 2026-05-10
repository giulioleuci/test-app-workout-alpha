import { Check, SkipForward, Plus, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface SetInputActionsProps {
  onComplete: () => void;
  onSkip: () => void;
  onSkipRemaining?: () => void;
  onAddSet?: () => void;
  disabled?: boolean;
  hideActions?: boolean;
  notesValue?: string | null;
  onNotesChange?: (notes: string) => void;
}

export default function SetInputActions({
  onComplete, onSkip, onSkipRemaining, onAddSet, disabled, hideActions, notesValue, onNotesChange
}: SetInputActionsProps) {
  const { t } = useTranslation();

  if (disabled || hideActions) return null;

  return (
    <>
      <Separator />
      <div className="sticky bottom-0 z-10 -mx-3 bg-card px-3 py-1">
        <div className="flex items-center gap-1.5">
          {onNotesChange !== undefined && (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-md border px-2 transition-colors hover:bg-muted/50 sm:px-3",
                    notesValue ? "border-primary/50 text-primary" : "border-border text-muted-foreground"
                  )}
                  title={t('activeSession.notes')}
                >
                  <MessageSquare className={cn("h-4 w-4 shrink-0", notesValue && "fill-primary/20")} />
                  <span className="hidden text-sm sm:inline">{t('activeSession.notes')}</span>
                  {notesValue && <span className="h-1 w-1 rounded-full bg-primary" />}
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('activeSession.notes')}</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <Textarea
                    value={notesValue ?? ''}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder={t('activeSession.notes')}
                    className="text-body min-h-32"
                    aria-label={t('activeSession.notes')}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
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
