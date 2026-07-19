export type CsvConflictStrategy = 'copy' | 'ignore' | 'overwrite';

export interface CsvExportFile {
  content: Blob | string;
  filename: string;
}

export interface CsvFileGateway {
  download(file: CsvExportFile): Promise<void>;
  pick(): Promise<{ data: string; name: string }>;
  isSelectionCancelled(error: unknown): boolean;
}

export interface CsvTransferDataPort<Row, Conflict, Result> {
  exportData(): Promise<CsvExportFile>;
  parse(data: string): Row[];
  detectConflicts(rows: Row[]): Promise<Conflict[]>;
  importData(rows: Row[], strategy: CsvConflictStrategy, conflicts: Conflict[]): Promise<Result>;
}

export interface CsvSingleExportPort {
  exportById(id: string): Promise<CsvExportFile>;
}
