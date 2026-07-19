import { useState, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  BACKUP_CATEGORY_TABLES, type TableName, type BackupSchema, type ConflictReport, type ConflictStrategy,
} from '@/application/backup';
import { backupTransfer } from '@/composition/backup';
import { useToast } from '@/hooks/useToast';
import { extractErrorMessage } from '@/lib/errors';
import { showErrorToast } from '@/lib/toast-helpers';

/** View-model hook owning the backup export/import/conflict flow. */
export function useBackupViewModel() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { toast } = useToast();
  const categories = useMemo(() => [
    { label: t('backup.categories.exercises'), ...BACKUP_CATEGORY_TABLES[0] },
    { label: t('backup.categories.workouts'), ...BACKUP_CATEGORY_TABLES[1] },
    { label: t('backup.categories.sessions'), ...BACKUP_CATEGORY_TABLES[2] },
    { label: t('backup.categories.oneRM'), ...BACKUP_CATEGORY_TABLES[3] },
    { label: t('backup.categories.userProfile'), ...BACKUP_CATEGORY_TABLES[4] },
    { label: t('backup.categories.regulationProfile'), ...BACKUP_CATEGORY_TABLES[5] },
    { label: t('backup.categories.templates'), ...BACKUP_CATEGORY_TABLES[6] },
  ], [t]);

  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);

  const [importedBackup, setImportedBackup] = useState<BackupSchema | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [conflicts, setConflicts] = useState<ConflictReport | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const allSelected = selectedCategories.size === categories.length;

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
      setSelectedCategories(new Set(categories.map((_, i) => i)));
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      if (allSelected || selectedCategories.size === 0) {
        await backupTransfer.exportBackup.execute();
      } else {
        const tables: TableName[] = [];
        selectedCategories.forEach(i => tables.push(...categories[i].tables));
        await backupTransfer.exportBackup.execute(tables);
      }
      toast({ title: t('backup.exported'), description: t('backup.exportedDesc') });
    } catch (e) {
      showErrorToast(toast, t('backup.exportError'), extractErrorMessage(e, t('common.unknown')));
    } finally {
      setExporting(false);
    }
  }

  async function handleFilePick() {
    try {
      const { data, name } = await backupTransfer.files.pick();
      const backup = backupTransfer.parseBackup.execute(data);
      setImportedBackup(backup);
      setImportFileName(name);
      const report = await backupTransfer.detectConflicts.execute(backup);
      setConflicts(report);
    } catch (err) {
      const message = extractErrorMessage(err, t('common.unknown'));
      if (message !== t('backup.errors.noFileSelected')) {
        showErrorToast(toast, t('backup.invalidFile'), message);
      }
      setImportedBackup(null);
    }
  }

  async function handleImport(strategy: ConflictStrategy) {
    if (!importedBackup || !conflicts) return;
    setImporting(true);
    setConflictDialogOpen(false);
    try {
      const result = await backupTransfer.importBackup.execute(importedBackup, strategy, conflicts);
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
    categories,
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
    toggleCategory,
    toggleAll,
    handleExport,
    handleFilePick,
    handleImport,
    startImport,
    clearImport,
    getRecordCounts,
  };
}
