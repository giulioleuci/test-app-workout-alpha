import { describe, expect, it, vi } from 'vitest';

import type { CsvFileGateway, CsvSingleExportPort, CsvTransferDataPort } from '@/application/csv/ports';
import { ExportCsvTransfer, ExportSingleCsv, ImportCsvTransfer, PrepareCsvImport } from '@/application/csv/useCases';

describe('CSV transfer application use cases', () => {
  const files: CsvFileGateway = {
    download: vi.fn(),
    pick: vi.fn(),
    isSelectionCancelled: vi.fn(),
  };

  it('downloads exported transfer data through the file port', async () => {
    const data: CsvTransferDataPort<string, string, string> = {
      exportData: vi.fn().mockResolvedValue({ content: 'csv', filename: 'exercises.csv' }),
      parse: vi.fn(),
      detectConflicts: vi.fn(),
      importData: vi.fn(),
    };

    await new ExportCsvTransfer(data, files).execute();

    expect(files.download).toHaveBeenCalledWith({ content: 'csv', filename: 'exercises.csv' });
  });

  it('prepares rows and conflicts without knowing the backing repository', async () => {
    const data: CsvTransferDataPort<string, string, string> = {
      exportData: vi.fn(),
      parse: vi.fn().mockReturnValue(['row']),
      detectConflicts: vi.fn().mockResolvedValue(['existing row']),
      importData: vi.fn(),
    };

    await expect(new PrepareCsvImport(data).execute('csv')).resolves.toEqual({
      kind: 'ready', rows: ['row'], conflicts: ['existing row'],
    });
  });

  it('delegates conflict resolution and individual exports through ports', async () => {
    const data: CsvTransferDataPort<string, string, string> = {
      exportData: vi.fn(),
      parse: vi.fn(),
      detectConflicts: vi.fn(),
      importData: vi.fn().mockResolvedValue('imported'),
    };
    const single: CsvSingleExportPort = {
      exportById: vi.fn().mockResolvedValue({ content: 'csv', filename: 'workout.csv' }),
    };

    await expect(new ImportCsvTransfer(data).execute(['row'], 'overwrite', ['existing'])).resolves.toBe('imported');
    await new ExportSingleCsv(single, files).execute('workout-1');

    expect(data.importData).toHaveBeenCalledWith(['row'], 'overwrite', ['existing']);
    expect(single.exportById).toHaveBeenCalledWith('workout-1');
    expect(files.download).toHaveBeenCalledWith({ content: 'csv', filename: 'workout.csv' });
  });
});
