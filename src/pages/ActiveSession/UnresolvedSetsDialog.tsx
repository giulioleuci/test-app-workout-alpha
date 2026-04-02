import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { UnresolvedSet } from '@/services/sessionMutator';

interface UnresolvedSetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unresolvedSets: UnresolvedSet[];
  onSkipAllAndFinish: () => void;
  onGoBack: () => void;
}

export default function UnresolvedSetsDialog({
  open,
  onOpenChange,
  unresolvedSets,
  onSkipAllAndFinish,
  onGoBack,
}: UnresolvedSetsDialogProps) {
  const { t } = useTranslation();

  // Group unresolved sets by exercise name
  const grouped = unresolvedSets.reduce<Record<string, UnresolvedSet[]>>((acc, us) => {
    if (!acc[us.exerciseName]) acc[us.exerciseName] = [];
    acc[us.exerciseName].push(us);
    return acc;
  }, {});

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('sessionMutator.unresolvedSets')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('sessionMutator.unresolvedSetsDesc', { count: unresolvedSets.length })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div style={{ maxHeight: '40vh' }} className="space-y-3 overflow-y-auto py-2">
          {Object.entries(grouped).map(([name, sets]) => (
            <div key={name} className="space-y-1">
              <p className="text-sm font-medium">{name}</p>
              <div className="flex flex-wrap gap-1">
                {sets.map(us => (
                  <span
                    key={us.set.id}
                    className="text-caption inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono"
                  >
                    {t('activeSession.setNumber')} {us.setIndex + 1}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button variant="destructive" className="w-full" onClick={onSkipAllAndFinish}>
            {t('sessionMutator.skipAllAndFinish')}
          </Button>
          <Button variant="outline" className="w-full" onClick={onGoBack}>
            {t('sessionMutator.goBack')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
