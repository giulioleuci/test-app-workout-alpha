/**
 * CSV Import/Export toolbar for the History List page.
 */
import { useRef, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { useToast } from '@/hooks/useToast';
import { triggerDownload } from '@/lib/download';
import type { CsvConflictStrategy } from '@/services/csvExerciseService';
import type { FlatHistoryRow, CsvHistoryConflict } from '@/services/csvHistoryService';
import {
  exportAllHistoryCsv, parseHistoryCsv,
  detectHistoryCsvConflicts, importHistoryCsv,
} from '@/services/csvHistoryService';
import { isNative, nativeDownloadFile, nativePickAndReadFile } from '@/services/nativeFileService';

import { CsvConflictDialog } from './CsvConflictDialog';
import { CsvToolbar } from './CsvToolbar';

interface Props {
  onImported?: () => void;
}

export function HistoryCsvToolbar({ onImported }: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingParsed, setPendingParsed] = useState<FlatHistoryRow[] | null>(null);
  const [conflicts, setConflicts] = useState<CsvHistoryConflict[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const { blob, filename } = await exportAllHistoryCsv();
      if (isNative()) {
        const text = await blob.text();
        await nativeDownloadFile(text, filename, 'text/csv');
      } else {
        triggerDownload(blob, filename);
      }
      toast({ title: t('csv.exported'), description: t('csv.exportedHistoryDesc', 'Storico esportato con successo') });
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
    const parsed = parseHistoryCsv(text);
    if (parsed.length === 0) {
      toast({ title: t('csv.emptyFile'), description: t('csv.noHistoryFound', 'Nessuna sessione trovata'), variant: 'destructive' });
      return;
    }
    const detected = await detectHistoryCsvConflicts(parsed);
    setPendingParsed(parsed);
    setConflicts(detected);
    if (detected.length > 0) {
      setConflictOpen(true);
    } else {
      await doImport(parsed, [], 'ignore');
    }
  }

  async function doImport(
    parsed: FlatHistoryRow[],
    cfls: CsvHistoryConflict[],
    strategy: CsvConflictStrategy,
  ) {
    setImporting(true);
    setConflictOpen(false);
    try {
      const result = await importHistoryCsv(parsed, strategy, cfls);
      const parts: string[] = [];
      if (result.sessionsInserted > 0) parts.push(t('csv.inserted', { count: result.sessionsInserted }));
      if (result.sessionsOverwritten > 0) parts.push(t('csv.overwritten', { count: result.sessionsOverwritten }));
      if (result.sessionsCopied > 0) parts.push(t('csv.copied', { count: result.sessionsCopied }));
      if (result.sessionsSkipped > 0) parts.push(t('csv.skipped', { count: result.sessionsSkipped }));
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
