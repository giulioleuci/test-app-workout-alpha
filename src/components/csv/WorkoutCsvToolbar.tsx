/**
 * CSV Import/Export toolbar for the Workout List page.
 */
import { useRef, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { useToast } from '@/hooks/useToast';
import { triggerDownload } from '@/lib/download';
import type { CsvConflictStrategy } from '@/services/csvExerciseService';
import type { FlatWorkoutRow, CsvWorkoutConflict } from '@/services/csvWorkoutService';
import {
  exportAllWorkoutsCsv, parseWorkoutCsv,
  detectWorkoutCsvConflicts, importWorkoutsCsv,
} from '@/services/csvWorkoutService';
import { isNative, nativeDownloadFile, nativePickAndReadFile } from '@/services/nativeFileService';

import { CsvConflictDialog } from './CsvConflictDialog';
import { CsvToolbar } from './CsvToolbar';


interface Props {
  onImported?: () => void;
}

export function WorkoutCsvToolbar({ onImported }: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingParsed, setPendingParsed] = useState<FlatWorkoutRow[] | null>(null);
  const [conflicts, setConflicts] = useState<CsvWorkoutConflict[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const { blob, filename } = await exportAllWorkoutsCsv();
      if (isNative()) {
        const text = await blob.text();
        await nativeDownloadFile(text, filename, 'text/csv');
      } else {
        triggerDownload(blob, filename);
      }
      toast({ title: t('csv.exported'), description: t('csv.exportedWorkoutsDesc') });
    } catch (e) {
      toast({ title: t('csv.exportError'), description: String(e), variant: 'destructive' });
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
        const message = err instanceof Error ? err.message : String(err);
        if (message !== t('backup.errors.noFileSelected')) {
          toast({ title: t('csv.readError'), description: message, variant: 'destructive' });
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
      toast({ title: t('csv.readError'), description: String(err), variant: 'destructive' });
    }
  }

  async function processImportText(text: string) {
    const parsed = parseWorkoutCsv(text);
    if (parsed.length === 0) {
      toast({ title: t('csv.emptyFile'), description: t('csv.noWorkoutsFound'), variant: 'destructive' });
      return;
    }
    const detected = await detectWorkoutCsvConflicts(parsed);
    setPendingParsed(parsed);
    setConflicts(detected);
    if (detected.length > 0) {
      setConflictOpen(true);
    } else {
      await doImport(parsed, [], 'ignore');
    }
  }

  async function doImport(
    parsed: FlatWorkoutRow[],
    cfls: CsvWorkoutConflict[],
    strategy: CsvConflictStrategy,
  ) {
    setImporting(true);
    setConflictOpen(false);
    try {
      const result = await importWorkoutsCsv(parsed, strategy, cfls);
      const parts: string[] = [];
      if (result.workoutsInserted > 0) parts.push(t('csv.workoutsInserted', { count: result.workoutsInserted }));
      if (result.workoutsOverwritten > 0) parts.push(t('csv.workoutsOverwritten', { count: result.workoutsOverwritten }));
      if (result.workoutsCopied > 0) parts.push(t('csv.workoutsCopied', { count: result.workoutsCopied }));
      if (result.workoutsSkipped > 0) parts.push(t('csv.workoutsSkipped', { count: result.workoutsSkipped }));
      toast({ title: t('csv.importComplete'), description: parts.join(', ') || t('csv.noDataImported') });
      onImported?.();
    } catch (err) {
      toast({ title: t('csv.importError'), description: String(err), variant: 'destructive' });
    } finally {
      setImporting(false);
      setPendingParsed(null);
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
          if (pendingParsed) void doImport(pendingParsed, conflicts, strategy);
        }}
      />
    </>
  );
}
