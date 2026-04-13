import { useState } from 'react';

import { Save, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';


interface UnsavedChangesBarProps {
  isDirty: boolean;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  isNavigationBlocked: boolean;
  onConfirmSaveAndLeave: () => void;
  onConfirmLeaveWithout: () => void;
  onCancelNavigation: () => void;
  /** Extra right offset so the FABs don't collide with a sibling FAB (in px or rem, e.g. '4.5rem') */
  fabRightOffset?: string;
}

export default function UnsavedChangesBar({
  isDirty, onSave, onDiscard,
  isNavigationBlocked, onConfirmSaveAndLeave, onConfirmLeaveWithout, onCancelNavigation,
  fabRightOffset,
}: UnsavedChangesBarProps) {
  const { t } = useTranslation();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  if (!isDirty && !isNavigationBlocked) return null;

  // FABs sit just above the mobile bottom nav (≈3.5rem) with safe-area padding
  const bottomStyle = {
    bottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 0.75rem)',
  } as React.CSSProperties;

  // Right offset: if a sibling FAB exists on the right we shift left accordingly
  const rightStyle = fabRightOffset
    ? { right: fabRightOffset }
    : { right: '1rem' };

  return (
    <>
      {/* FABs — only visible when dirty */}
      {isDirty && (
        <div
          className="fixed z-50 flex items-center gap-2"
          style={{ ...bottomStyle, ...rightStyle }}
        >
          {/* Discard FAB */}
          <button
            onClick={() => setDiscardDialogOpen(true)}
            className="flex items-center gap-2 rounded-full bg-secondary px-4 py-3 text-secondary-foreground shadow-lg transition-colors hover:bg-secondary/80"
            title={t('unsavedChanges.discardButton')}
          >
            <Undo2 className="h-5 w-5 shrink-0" />
            <span className="hidden text-sm font-medium md:inline">{t('unsavedChanges.discardButton')}</span>
          </button>

          {/* Save FAB */}
          <button
            onClick={() => setSaveDialogOpen(true)}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
            title={t('unsavedChanges.saveButton')}
          >
            <Save className="h-5 w-5 shrink-0" />
            <span className="hidden text-sm font-semibold md:inline">{t('unsavedChanges.saveButton')}</span>
          </button>
        </div>
      )}

      {/* Save confirmation */}
      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('unsavedChanges.saveConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('unsavedChanges.saveConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await onSave(); setSaveDialogOpen(false); }}>
              {t('actions.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard confirmation */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('unsavedChanges.discardConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('unsavedChanges.discardConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onDiscard(); setDiscardDialogOpen(false); }}>
              {t('actions.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Navigation blocked dialog */}
      <AlertDialog open={isNavigationBlocked} onOpenChange={(open) => { if (!open) onCancelNavigation(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('unsavedChanges.navigationTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('unsavedChanges.navigationDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={onCancelNavigation}>{t('unsavedChanges.stay')}</Button>
            <Button variant="destructive" onClick={onConfirmLeaveWithout}>{t('unsavedChanges.leaveWithout')}</Button>
            <Button onClick={onConfirmSaveAndLeave}>{t('unsavedChanges.saveAndLeave')}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
