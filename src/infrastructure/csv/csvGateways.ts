import type { CsvExportFile, CsvFileGateway, CsvSingleExportPort, CsvTransferDataPort } from '@/application/csv/ports';
import { t } from '@/i18n/t';
import { isNative, nativeDownloadFile, nativePickAndReadFile } from '@/infrastructure/file/nativeFileGateway';
import { triggerDownload } from '@/lib/download';
import { formatIsoDate } from '@/lib/formatting';

import {
  detectExerciseCsvConflicts,
  exportExercisesCsv,
  importExercisesCsv,
  parseExerciseCsv,
  type CsvExerciseConflict,
  type CsvExerciseImportResult,
  type CsvExerciseRow,
} from './exerciseCsvDataGateway';
import {
  detectHistoryCsvConflicts,
  exportAllHistoryCsv,
  importHistoryCsv,
  parseHistoryCsv,
  type CsvHistoryConflict,
  type CsvHistoryImportResult,
  type FlatHistoryRow,
} from './historyCsvDataGateway';
import {
  detectWorkoutCsvConflicts,
  exportAllWorkoutsCsv,
  exportWorkoutCsv,
  importWorkoutsCsv,
  parseWorkoutCsv,
  type CsvWorkoutConflict,
  type CsvWorkoutImportResult,
  type FlatWorkoutRow,
} from './workoutCsvDataGateway';

export const csvFileGateway: CsvFileGateway = {
  async download({ content, filename }: CsvExportFile) {
    if (isNative()) {
      await nativeDownloadFile(typeof content === 'string' ? content : await content.text(), filename, 'text/csv');
      return;
    }
    triggerDownload(typeof content === 'string' ? new Blob([content], { type: 'text/csv;charset=utf-8' }) : content, filename);
  },

  pick() {
    return nativePickAndReadFile({ accept: ['.csv'] });
  },

  isSelectionCancelled(error) {
    return error instanceof Error && error.message === t('backup.errors.noFileSelected');
  },
};

export const exerciseCsvDataGateway: CsvTransferDataPort<CsvExerciseRow, CsvExerciseConflict, CsvExerciseImportResult> = {
  async exportData() {
    return { content: await exportExercisesCsv(), filename: `esercizi-${formatIsoDate()}.csv` };
  },
  parse: parseExerciseCsv,
  detectConflicts: detectExerciseCsvConflicts,
  importData: importExercisesCsv,
};

export const historyCsvDataGateway: CsvTransferDataPort<FlatHistoryRow, CsvHistoryConflict, CsvHistoryImportResult> = {
  exportData: exportAllHistoryCsv,
  parse: parseHistoryCsv,
  detectConflicts: detectHistoryCsvConflicts,
  importData: importHistoryCsv,
};

export const workoutCsvDataGateway: CsvTransferDataPort<FlatWorkoutRow, CsvWorkoutConflict, CsvWorkoutImportResult> = {
  exportData: exportAllWorkoutsCsv,
  parse: parseWorkoutCsv,
  detectConflicts: detectWorkoutCsvConflicts,
  importData: importWorkoutsCsv,
};

export const workoutCsvExportGateway: CsvSingleExportPort = {
  async exportById(id) {
    const { blob, filename } = await exportWorkoutCsv(id);
    return { content: blob, filename };
  },
};
