import { useState, useRef, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/hooks/useToast';
import { triggerDownload } from '@/lib/download';
import { extractErrorMessage } from '@/lib/errors';
import { showErrorToast } from '@/lib/toast-helpers';
import {
  EXPORT_CATEGORIES, type TableName, type BackupSchema, type ConflictReport, type ConflictStrategy,
  exportTables, exportAll, prepareBackupDownload, parseBackupFile, detectConflicts, importData,
} from '@/services/backupService';
import { isNative, nativeDownloadBackup, nativePickAndReadFile } from '@/services/nativeFileService';

/** View-model hook owning the backup export/import/conflict flow. */
export function useBackup() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);

  const [importedBackup, setImportedBackup] = useState<BackupSchema | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [conflicts, setConflicts] = useState<ConflictReport | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const allSelected = selectedCategories.size === EXPORT_CATEGORIES.length;

  function toggleCategory(index: number) {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(EXPORT_CATEGORIES.map((_, i) => i)));
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      let backup: BackupSchema;
      if (allSelected || selectedCategories.size === 0) {
        backup = await exportAll();
      } else {
        const tables: TableName[] = [];
        selectedCategories.forEach(i => tables.push(...EXPORT_CATEGORIES[i].tables));
        backup = await exportTables(tables);
      }
      if (isNative()) {
        await nativeDownloadBackup(backup);
      } else {
        const { blob, filename } = prepareBackupDownload(backup);
        triggerDownload(blob, filename);
      }
      toast({ title: t('backup.exported'), description: t('backup.exportedDesc') });
    } catch (e) {
      showErrorToast(toast, t('backup.exportError'), extractErrorMessage(e, t('common.unknown')));
    } finally {
      setExporting(false);
    }
  }

  async function handleNativeImport() {
    try {
      const { data, name } = await nativePickAndReadFile({ accept: ['.json'] });
      const backup = JSON.parse(data) as BackupSchema;
      setImportedBackup(backup);
      setImportFileName(name);
      const report = await detectConflicts(backup);
      setConflicts(report);
    } catch (err) {
      const message = extractErrorMessage(err, t('common.unknown'));
      if (message !== t('backup.errors.noFileSelected')) {
        showErrorToast(toast, t('backup.invalidFile'), message);
      }
      setImportedBackup(null);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const backup = await parseBackupFile(file);
      setImportedBackup(backup);
      setImportFileName(file.name);
      const report = await detectConflicts(backup);
      setConflicts(report);
    } catch (err) {
      showErrorToast(toast, t('backup.invalidFile'), extractErrorMessage(err, t('common.unknown')));
      setImportedBackup(null);
    }
    e.target.value = '';
  }

  async function handleImport(strategy: ConflictStrategy) {
    if (!importedBackup || !conflicts) return;
    setImporting(true);
    setConflictDialogOpen(false);
    try {
      const result = await importData(importedBackup, strategy, conflicts);
      const parts: string[] = [];
      if (result.inserted > 0) parts.push(`${result.inserted} ${t('backup.inserted')}`);
      if (result.copied > 0) parts.push(`${result.copied} ${t('backup.copied')}`);
      if (result.overwritten > 0) parts.push(`${result.overwritten} ${t('backup.overwritten')}`);
      if (result.skipped > 0) parts.push(`${result.skipped} ${t('backup.skipped')}`);
      if (result.failed > 0) parts.push(`${result.failed} ${t('backup.failed')}`);
      toast({ title: t('backup.importComplete'), description: parts.join(', ') || t('backup.noDataImported') });
      setImportedBackup(null);
      setConflicts(null);
      setImportFileName('');
      await queryClient.invalidateQueries();
    } catch (e) {
      showErrorToast(toast, t('backup.importError'), extractErrorMessage(e, t('common.unknown')));
    } finally {
      setImporting(false);
    }
  }

  function startImport() {
    if (!conflicts) return;
    if (conflicts.totalConflicts > 0) {
      setConflictDialogOpen(true);
    } else {
      void handleImport('ignore');
    }
  }

  function clearImport() {
    setImportedBackup(null);
    setConflicts(null);
    setImportFileName('');
  }

  const getRecordCounts = (backup: BackupSchema): { table: TableName; count: number }[] =>
    (Object.entries(backup.data) as [TableName, unknown[]][])
      .filter(([, records]) => Array.isArray(records) && records.length > 0)
      .map(([table, records]) => ({ table, count: records.length }));

  const totalImportRecords = useMemo(
    () => importedBackup
      ? Object.values(importedBackup.data).reduce((sum, arr) => sum + (arr?.length ?? 0), 0)
      : 0,
    [importedBackup],
  );

  return {
    categories: EXPORT_CATEGORIES,
    fileInputRef,
    selectedCategories,
    exporting,
    importedBackup,
    importFileName,
    conflicts,
    conflictDialogOpen,
    setConflictDialogOpen,
    importing,
    allSelected,
    totalImportRecords,
    isNative,
    toggleCategory,
    toggleAll,
    handleExport,
    handleNativeImport,
    handleFileSelect,
    handleImport,
    startImport,
    clearImport,
    getRecordCounts,
  };
}
