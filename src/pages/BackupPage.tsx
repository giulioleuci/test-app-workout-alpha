import { useMemo } from 'react';

import { Download, Upload, FileJson, AlertTriangle, Copy, SkipForward, RefreshCw, HardDrive } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useBackupViewModel } from '@/hooks/useBackup';
import type { TableName } from '@/application/backup';

export default function BackupPage() {
  const { t } = useTranslation();

  const TABLE_LABELS: Record<TableName, string> = useMemo(() =>
    t('backup.tableLabels', { returnObjects: true }),
    [t]
  );

  const {
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
  } = useBackupViewModel();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {t('settings.dataPersistenceTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-body-sm text-muted-foreground">{t('settings.dataPersistenceDesc')}</p>
          <div className="rounded-md bg-secondary/50 p-3">
            <p className="text-body-sm text-muted-foreground">{t('settings.dataPersistenceDetail')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('backup.exportData')}
          </CardTitle>
          <CardDescription>{t('backup.exportDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-center gap-2 border-b pb-2">
            <Checkbox id="select-all" checked={allSelected} onCheckedChange={toggleAll} />
            <Label htmlFor="select-all" className="cursor-pointer font-semibold">{t('common.selectAll')}</Label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((cat, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox id={`cat-${i}`} checked={selectedCategories.has(i)} onCheckedChange={() => toggleCategory(i)} />
                <Label htmlFor={`cat-${i}`} className="cursor-pointer">{cat.label}</Label>
              </div>
            ))}
          </div>

          <Button onClick={handleExport} disabled={exporting} className="w-full px-8 sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            {exporting ? t('backup.exporting') : t('backup.downloadBackup')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('backup.importData')}
          </CardTitle>
          <CardDescription>{t('backup.importDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {!importedBackup ? (
            <Button 
              variant="outline" 
              onClick={handleFilePick}
              className="flex h-24 w-full flex-col gap-1 border-dashed"
            >
              <FileJson className="h-6 w-6 text-muted-foreground" />
              <span>{t('backup.selectFile')}</span>
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileJson className="h-5 w-5 shrink-0 text-primary" />
                  <span className="truncate text-sm font-medium">{importFileName}</span>
                  <Badge variant="secondary">{totalImportRecords} {t('common.records')}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={clearImport}>✕</Button>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">{t('common.content')}</p>
                <div className="grid gap-1 text-sm">
                  {getRecordCounts(importedBackup).map(({ table, count }) => (
                    <div key={table} className="flex justify-between rounded bg-muted/30 px-2 py-1">
                      <span className="text-muted-foreground">{TABLE_LABELS[table]}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {conflicts && conflicts.totalConflicts > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-destructive">
                      {conflicts.totalConflicts} {t('backup.conflictsDetected')}
                    </p>
                    {Object.entries(conflicts.byTable).map(([table, info]) => (
                      <p key={table} className="text-muted-foreground">
                        {TABLE_LABELS[table as TableName]}: {info?.count} {t('backup.duplicates')}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={startImport} disabled={importing} className="w-full px-8 sm:w-auto">
                <Upload className="mr-2 h-4 w-4" />
                {importing ? t('backup.importing') : t('backup.importBtn')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <AlertDialogContent className="overflow-y-auto sm:w-full" style={{ maxHeight: '90vh', width: '95vw' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('backup.conflictTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {conflicts?.totalConflicts || 0} {t('backup.conflictDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <Button variant="outline" className="h-auto w-full justify-start gap-3 px-6 py-3" onClick={() => handleImport('copy')}>
              <Copy className="h-5 w-5 shrink-0 text-primary" />
              <div className="text-left">
                <p className="font-medium">{t('backup.strategyCopy')}</p>
                <p className="text-body-sm text-muted-foreground">{t('backup.strategyCopyDesc')}</p>
              </div>
            </Button>

            <Button variant="outline" className="h-auto w-full justify-start gap-3 px-6 py-3" onClick={() => handleImport('ignore')}>
              <SkipForward className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">{t('backup.strategyIgnore')}</p>
                <p className="text-body-sm text-muted-foreground">{t('backup.strategyIgnoreDesc')}</p>
              </div>
            </Button>

            <Button variant="outline" className="h-auto w-full justify-start gap-3 px-6 py-3" onClick={() => handleImport('overwrite')}>
              <RefreshCw className="h-5 w-5 shrink-0 text-destructive" />
              <div className="text-left">
                <p className="font-medium">{t('backup.strategyOverwrite')}</p>
                <p className="text-body-sm text-muted-foreground">{t('backup.strategyOverwriteDesc')}</p>
              </div>
            </Button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
