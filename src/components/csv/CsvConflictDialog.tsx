/**
 * Reusable CSV conflict resolution dialog.
 * Works for both exercises and workouts.
 */
import { Copy, SkipForward, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { CsvConflictStrategy } from '@/services/csvExerciseService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictCount: number;
  onChoose: (strategy: CsvConflictStrategy) => void;
}

export function CsvConflictDialog({ open, onOpenChange, conflictCount, onChoose }: Props) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('csv.conflictTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {conflictCount === 1
              ? t('csv.conflictDescSingular', { count: conflictCount })
              : t('csv.conflictDesc', { count: conflictCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 px-6 py-3"
            onClick={() => onChoose('copy')}
          >
            <Copy className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-left">
              <p className="font-medium">{t('csv.createCopy')}</p>
              <p className="text-body-sm text-muted-foreground">{t('csv.createCopyDesc')}</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 px-6 py-3"
            onClick={() => onChoose('ignore')}
          >
            <SkipForward className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium">{t('csv.ignoreDuplicates')}</p>
              <p className="text-body-sm text-muted-foreground">{t('csv.ignoreDuplicatesDesc')}</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 px-6 py-3"
            onClick={() => onChoose('overwrite')}
          >
            <RefreshCw className="h-5 w-5 shrink-0 text-destructive" />
            <div className="text-left">
              <p className="font-medium">{t('csv.overwriteExisting')}</p>
              <p className="text-body-sm text-muted-foreground">{t('csv.overwriteExistingDesc')}</p>
            </div>
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
