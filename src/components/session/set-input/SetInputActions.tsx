import { useState } from 'react';

import { Check, ChevronDown, MessageSquare, MoreHorizontal, Plus, SkipForward, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { nativeDeviceService } from '@/services/nativeDeviceService';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

interface SetInputActionsProps {
  onComplete: () => void;
  onSkip: () => void;
  onSkipRemaining?: () => void;
  onAddSet?: () => void;
  disabled?: boolean;
  hideActions?: boolean;
  notesValue?: string | null;
  onNotesChange?: (notes: string) => void;
  extrasSlot?: React.ReactNode;
}

export default function SetInputActions({
  onComplete, onSkip, onSkipRemaining, onAddSet, disabled, hideActions, notesValue, onNotesChange,
  extrasSlot,
}: SetInputActionsProps) {
  const { t } = useTranslation();
  const { startRestTimer } = useActiveSessionStore();
  const [moreOpen, setMoreOpen] = useState(false);

  if (disabled || hideActions) return null;

  const hasSkipMenu = onSkipRemaining !== undefined;
  const hasMoreMenu = onAddSet !== undefined || extrasSlot !== undefined;

  const handleStartRest = (seconds: number) => {
    startRestTimer(seconds);
    void nativeDeviceService.scheduleRestNotification(seconds);
    setMoreOpen(false);
  };

  return (
    <>
      <Separator />
      <div className="sticky bottom-0 z-10 -mx-3 flex flex-col gap-2 bg-card px-3 pb-1 pt-2">
        <Button className="h-11 w-full gap-1.5 text-base font-semibold" onClick={onComplete}>
          <Check className="h-5 w-5 shrink-0" />
          {t('activeSession.completeSetShort')}
        </Button>
        <div className="flex items-center gap-1.5">
          {onNotesChange !== undefined && (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-md border px-3 transition-colors hover:bg-muted/50",
                    notesValue ? "border-primary/50 text-primary" : "border-border text-muted-foreground"
                  )}
                  title={t('activeSession.notes')}
                  aria-label={t('activeSession.notes')}
                >
                  <MessageSquare className={cn("h-4 w-4 shrink-0", notesValue && "fill-primary/20")} />
                  {notesValue && <span className="h-1 w-1 rounded-full bg-primary" />}
                </button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto sm:max-w-md">
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

          {hasSkipMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 flex-1 gap-1.5 px-3">
                  <SkipForward className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{t('activeSession.skipSet')}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSkip}>
                  <SkipForward className="mr-2 h-4 w-4" />
                  {t('activeSession.skipSet')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSkipRemaining}>
                  <SkipForward className="mr-2 h-4 w-4 opacity-60" />
                  {t('activeSession.skipRemaining')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" className="h-9 flex-1 gap-1.5 px-3" onClick={onSkip}>
              <SkipForward className="h-4 w-4 shrink-0" />
              <span className="text-sm">{t('activeSession.skipSet')}</span>
            </Button>
          )}

          {hasMoreMenu && (
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label={t('common.more', { defaultValue: 'More' })}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl pb-8">
                <SheetHeader>
                  <SheetTitle>{t('common.more', { defaultValue: 'More' })}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="h-10 gap-2" onClick={() => handleStartRest(60)}>
                      <Timer className="h-4 w-4" /> 60s
                    </Button>
                    <Button variant="outline" className="h-10 gap-2" onClick={() => handleStartRest(90)}>
                      <Timer className="h-4 w-4" /> 90s
                    </Button>
                    <Button variant="outline" className="h-10 gap-2" onClick={() => handleStartRest(120)}>
                      <Timer className="h-4 w-4" /> 120s
                    </Button>
                    <Button variant="outline" className="h-10 gap-2" onClick={() => handleStartRest(180)}>
                      <Timer className="h-4 w-4" /> 180s
                    </Button>
                  </div>
                  {onAddSet && (
                    <Button variant="outline" className="h-10 gap-2" onClick={() => { onAddSet(); setMoreOpen(false); }}>
                      <Plus className="h-4 w-4" /> {t('activeSession.addAnotherSet')}
                    </Button>
                  )}
                  {extrasSlot && <div className="border-t pt-3">{extrasSlot}</div>}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </>
  );
}
