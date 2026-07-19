import type { CsvTransferDataPort } from '@/application/csv/ports';
import {
  ExportCsvTransfer,
  ExportSingleCsv,
  ImportCsvTransfer,
  PrepareCsvImport,
  type CsvTransferUseCases,
} from '@/application/csv/useCases';
import {
  csvFileGateway,
  exerciseCsvDataGateway,
  historyCsvDataGateway,
  workoutCsvExportGateway,
  workoutCsvDataGateway,
} from '@/infrastructure/csv/csvGateways';

function composeCsvTransfer<Row, Conflict, Result>(data: CsvTransferDataPort<Row, Conflict, Result>): CsvTransferUseCases<Row, Conflict, Result> {
  return {
    exportCsv: new ExportCsvTransfer(data, csvFileGateway),
    prepareImport: new PrepareCsvImport(data),
    importCsv: new ImportCsvTransfer(data),
    files: csvFileGateway,
  };
}

export const exerciseCsvTransfer = composeCsvTransfer(exerciseCsvDataGateway);
export const historyCsvTransfer = composeCsvTransfer(historyCsvDataGateway);
export const workoutCsvTransfer = composeCsvTransfer(workoutCsvDataGateway);

const exportWorkoutCsv = new ExportSingleCsv(workoutCsvExportGateway, csvFileGateway);

export const workoutCsvCommands = {
  exportWorkoutCsv: (workoutId: string) => exportWorkoutCsv.execute(workoutId),
};
