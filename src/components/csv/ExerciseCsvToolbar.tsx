/**
 * CSV Import/Export toolbar for the Exercise Library page.
 */
import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/hooks/useToast';
import { triggerDownload } from '@/lib/download';
import { extractErrorMessage } from '@/lib/errors';
import { formatIsoDate } from '@/lib/formatting';
import { showErrorToast } from '@/lib/toast-helpers';
import type { CsvConflictStrategy, CsvExerciseRow, CsvExerciseConflict } from '@/services/csvExerciseService';
import {
  exportExercisesCsv, generateCsvBlob, parseExerciseCsv,
  detectExerciseCsvConflicts, importExercisesCsv,
} from '@/services/csvExerciseService';
import { isNative, nativeDownloadFile, nativePickAndReadFile } from '@/services/nativeFileService';

import { CsvConflictDialog } from './CsvConflictDialog';
import { CsvToolbar } from './CsvToolbar';


interface Props {
  onImported?: () => void;
}

export function ExerciseCsvToolbar({ onImported }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingRows, setPendingRows] = useState<CsvExerciseRow[] | null>(null);
  const [conflicts, setConflicts] = useState<CsvExerciseConflict[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const csvContent = await exportExercisesCsv();
      const filename = `esercizi-${formatIsoDate()}.csv`;
      
      if (isNative()) {
        await nativeDownloadFile(csvContent, filename, 'text/csv');
      } else {
        const blob = generateCsvBlob(csvContent);
        triggerDownload(blob, filename);
      }
      toast({ title: t('csv.exported'), description: t('csv.exportedExercisesDesc') });
    } catch (e) {
      showErrorToast(toast, t('csv.exportError'), extractErrorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  async function handleImportClick() {
    if (isNative()) {
      try {
        const { data } = await nativePickAndReadFile({ accept: ['.csv'] });
        await processImportText(data);
      } catch (err) {
        const message = extractErrorMessage(err);
        if (message !== t('backup.errors.noFileSelected')) {
          showErrorToast(toast, t('csv.readError'), message);
        }
      }
    } else {
      fileRef.current?.click();
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const text = await file.text();
      await processImportText(text);
    } catch (err) {
      showErrorToast(toast, t('csv.readError'), extractErrorMessage(err));
    }
  }

  async function processImportText(text: string) {
    const rows = parseExerciseCsv(text);
    if (rows.length === 0) {
      showErrorToast(toast, t('csv.emptyFile'), t('csv.noExercisesFound'));
      return;
    }
    const detected = await detectExerciseCsvConflicts(rows);
    setPendingRows(rows);
    setConflicts(detected);
    if (detected.length > 0) {
      setConflictOpen(true);
    } else {
      await doImport(rows, [], 'ignore');
    }
  }

  async function doImport(
    rows: CsvExerciseRow[],
    cfls: CsvExerciseConflict[],
    strategy: CsvConflictStrategy,
  ) {
    setImporting(true);
    setConflictOpen(false);
    try {
      const result = await importExercisesCsv(rows, strategy, cfls);
      const parts: string[] = [];
      if (result.inserted > 0) parts.push(t('csv.inserted', { count: result.inserted }));
      if (result.overwritten > 0) parts.push(t('csv.overwritten', { count: result.overwritten }));
      if (result.copied > 0) parts.push(t('csv.copied', { count: result.copied }));
      if (result.skipped > 0) parts.push(t('csv.skipped', { count: result.skipped }));
      if (result.failed > 0) parts.push(t('csv.failed', { count: result.failed }));
      toast({ title: t('csv.importComplete'), description: parts.join(', ') || t('csv.noDataImported') });
      await queryClient.invalidateQueries();
      onImported?.();
    } catch (err) {
      showErrorToast(toast, t('csv.importError'), extractErrorMessage(err));
    } finally {
      setImporting(false);
      setPendingRows(null);
      setConflicts([]);
    }
  }

  return (
    <>
      <CsvToolbar
        onExport={handleExport}
        onImportClick={handleImportClick}
        isExporting={exporting}
        isImporting={importing}
        exportLabel={t('csv.exportCsv')}
        importLabel={t('csv.importCsv')}
        exportingLabel={t('csv.exporting')}
        importingLabel={t('csv.importing')}
        inputFileRef={fileRef}
        onFileSelect={handleFileSelect}
      />

      <CsvConflictDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        conflictCount={conflicts.length}
        onChoose={(strategy) => {
          if (pendingRows) void doImport(pendingRows, conflicts, strategy);
        }}
      />
    </>
  );
}
