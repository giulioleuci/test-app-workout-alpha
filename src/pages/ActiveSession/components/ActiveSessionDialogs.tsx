import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { UnresolvedSet } from '@/services/sessionMutator';

import QuickAddSheet from '../QuickAddSheet';
import SwapExerciseSheet from '../SwapExerciseSheet';
import UnresolvedSetsDialog from '../UnresolvedSetsDialog';

interface AlertConfig {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
}

interface SwapSheetState {
  open: boolean;
  sessionExerciseItemId: string | null;
  currentExerciseId: string | null;
}

interface UnresolvedSetsState {
  open: boolean;
  sets: UnresolvedSet[];
}

interface ActiveSessionDialogsProps {
  swapSheetState: SwapSheetState;
  setSwapSheetState: React.Dispatch<React.SetStateAction<SwapSheetState>>;
  handleSwapExercise: (id: string, exId: string) => void;
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  handleQuickAddExercise: (exId: string) => void;
  handleQuickAddSuperset: (exIds: string[]) => void;
  unresolvedSetsState: UnresolvedSetsState;
  setUnresolvedSetsState: React.Dispatch<React.SetStateAction<UnresolvedSetsState>>;
  handleSkipAllAndFinish: () => void;
  alertConfig: AlertConfig;
  setAlertConfig: React.Dispatch<React.SetStateAction<AlertConfig>>;
}

export default function ActiveSessionDialogs({
  swapSheetState,
  setSwapSheetState,
  handleSwapExercise,
  quickAddOpen,
  setQuickAddOpen,
  handleQuickAddExercise,
  handleQuickAddSuperset,
  unresolvedSetsState,
  setUnresolvedSetsState,
  handleSkipAllAndFinish,
  alertConfig,
  setAlertConfig,
}: ActiveSessionDialogsProps) {
  const { t } = useTranslation();

  return (
    <>
      <SwapExerciseSheet
        open={swapSheetState.open}
        onOpenChange={(open) => setSwapSheetState((prev) => ({ ...prev, open }))}
        sessionExerciseItemId={swapSheetState.sessionExerciseItemId}
        currentExerciseId={swapSheetState.currentExerciseId}
        onSwap={handleSwapExercise}
      />

      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onAddExercise={handleQuickAddExercise}
        onAddSuperset={handleQuickAddSuperset}
      />

      <UnresolvedSetsDialog
        open={unresolvedSetsState.open}
        onOpenChange={(open) => setUnresolvedSetsState((prev) => ({ ...prev, open }))}
        unresolvedSets={unresolvedSetsState.sets}
        onSkipAllAndFinish={handleSkipAllAndFinish}
        onGoBack={() => setUnresolvedSetsState({ open: false, sets: [] })}
      />

      <AlertDialog open={alertConfig.open} onOpenChange={(open) => setAlertConfig((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertConfig.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={alertConfig.onConfirm}>{t('actions.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
