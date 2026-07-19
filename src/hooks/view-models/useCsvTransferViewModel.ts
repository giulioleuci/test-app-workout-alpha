import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { CsvConflictStrategy } from '@/application/csv/ports';
import type { CsvTransferUseCases } from '@/application/csv/useCases';
import { exerciseCsvTransfer, historyCsvTransfer, workoutCsvTransfer } from '@/composition/csv';
import { useToast } from '@/hooks/useToast';
import { extractErrorMessage } from '@/lib/errors';
import { showErrorToast } from '@/lib/toast-helpers';

interface Options<Row, Conflict, Result> {
  transfer: CsvTransferUseCases<Row, Conflict, Result>;
  emptyDescription: string;
  exportedDescription: string;
  describeResult: (result: Result) => string;
  onImported?: () => void;
}

export function useCsvTransferViewModel<Row, Conflict, Result>({
  transfer,
  emptyDescription,
  exportedDescription,
  describeResult,
  onImported,
}: Options<Row, Conflict, Result>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingRows, setPendingRows] = useState<Row[] | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      await transfer.exportCsv.execute();
      toast({ title: t('csv.exported'), description: exportedDescription });
    } catch (error) {
      showErrorToast(toast, t('csv.exportError'), extractErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  async function selectImportFile() {
    try {
      const { data } = await transfer.files.pick();
      await importText(data);
    } catch (error) {
      if (!transfer.files.isSelectionCancelled(error)) {
        showErrorToast(toast, t('csv.readError'), extractErrorMessage(error));
      }
    }
  }

  async function importText(text: string) {
    try {
      const prepared = await transfer.prepareImport.execute(text);
      if (prepared.kind === 'empty') {
        showErrorToast(toast, t('csv.emptyFile'), emptyDescription);
        return;
      }
      setPendingRows(prepared.rows);
      setConflicts(prepared.conflicts);
      if (prepared.conflicts.length > 0) {
        setConflictOpen(true);
      } else {
        await importWithStrategy(prepared.rows, [], 'ignore');
      }
    } catch (error) {
      showErrorToast(toast, t('csv.readError'), extractErrorMessage(error));
    }
  }

  async function importWithStrategy(rows: Row[], detected: Conflict[], strategy: CsvConflictStrategy) {
    setImporting(true);
    setConflictOpen(false);
    try {
      const result = await transfer.importCsv.execute(rows, strategy, detected);
      toast({ title: t('csv.importComplete'), description: describeResult(result) || t('csv.noDataImported') });
      await queryClient.invalidateQueries();
      onImported?.();
    } catch (error) {
      showErrorToast(toast, t('csv.importError'), extractErrorMessage(error));
    } finally {
      setImporting(false);
      setPendingRows(null);
      setConflicts([]);
    }
  }

  return {
    exporting,
    importing,
    conflictOpen,
    conflictCount: conflicts.length,
    setConflictOpen,
    exportCsv,
    selectImportFile,
    chooseConflictStrategy: (strategy: CsvConflictStrategy) => {
      if (pendingRows) void importWithStrategy(pendingRows, conflicts, strategy);
    },
  };
}

function useCsvResultDescription() {
  const { t } = useTranslation();
  return {
    exercise: (result: { inserted: number; overwritten: number; copied: number; skipped: number; failed: number }) => {
      const parts = [
        result.inserted > 0 && t('csv.inserted', { count: result.inserted }),
        result.overwritten > 0 && t('csv.overwritten', { count: result.overwritten }),
        result.copied > 0 && t('csv.copied', { count: result.copied }),
        result.skipped > 0 && t('csv.skipped', { count: result.skipped }),
        result.failed > 0 && t('csv.failed', { count: result.failed }),
      ];
      return parts.filter(Boolean).join(', ');
    },
    history: (result: { sessionsInserted: number; sessionsOverwritten: number; sessionsCopied: number; sessionsSkipped: number }) => {
      const parts = [
        result.sessionsInserted > 0 && t('csv.inserted', { count: result.sessionsInserted }),
        result.sessionsOverwritten > 0 && t('csv.overwritten', { count: result.sessionsOverwritten }),
        result.sessionsCopied > 0 && t('csv.copied', { count: result.sessionsCopied }),
        result.sessionsSkipped > 0 && t('csv.skipped', { count: result.sessionsSkipped }),
      ];
      return parts.filter(Boolean).join(', ');
    },
    workout: (result: { workoutsInserted: number; workoutsOverwritten: number; workoutsCopied: number; workoutsSkipped: number }) => {
      const parts = [
        result.workoutsInserted > 0 && t('csv.workoutsInserted', { count: result.workoutsInserted }),
        result.workoutsOverwritten > 0 && t('csv.workoutsOverwritten', { count: result.workoutsOverwritten }),
        result.workoutsCopied > 0 && t('csv.workoutsCopied', { count: result.workoutsCopied }),
        result.workoutsSkipped > 0 && t('csv.workoutsSkipped', { count: result.workoutsSkipped }),
      ];
      return parts.filter(Boolean).join(', ');
    },
  };
}

export function useExerciseCsvTransferViewModel(onImported?: () => void) {
  const descriptions = useCsvResultDescription();
  const { t } = useTranslation();
  return useCsvTransferViewModel({
    transfer: exerciseCsvTransfer,
    emptyDescription: t('csv.noExercisesFound'),
    exportedDescription: t('csv.exportedExercisesDesc'),
    describeResult: descriptions.exercise,
    onImported,
  });
}

export function useHistoryCsvTransferViewModel(onImported?: () => void) {
  const descriptions = useCsvResultDescription();
  const { t } = useTranslation();
  return useCsvTransferViewModel({
    transfer: historyCsvTransfer,
    emptyDescription: t('csv.noHistoryFound', 'Nessuna sessione trovata'),
    exportedDescription: t('csv.exportedHistoryDesc', 'Storico esportato con successo'),
    describeResult: descriptions.history,
    onImported,
  });
}

export function useWorkoutCsvTransferViewModel(onImported?: () => void) {
  const descriptions = useCsvResultDescription();
  const { t } = useTranslation();
  return useCsvTransferViewModel({
    transfer: workoutCsvTransfer,
    emptyDescription: t('csv.noWorkoutsFound'),
    exportedDescription: t('csv.exportedWorkoutsDesc'),
    describeResult: descriptions.workout,
    onImported,
  });
}
