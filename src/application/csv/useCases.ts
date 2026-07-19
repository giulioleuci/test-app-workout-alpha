import type {
  CsvConflictStrategy,
  CsvFileGateway,
  CsvSingleExportPort,
  CsvTransferDataPort,
} from './ports';

export class ExportCsvTransfer<Row, Conflict, Result> {
  constructor(
    private readonly data: CsvTransferDataPort<Row, Conflict, Result>,
    private readonly files: CsvFileGateway,
  ) {}

  async execute(): Promise<void> {
    await this.files.download(await this.data.exportData());
  }
}

export class ExportSingleCsv {
  constructor(
    private readonly data: CsvSingleExportPort,
    private readonly files: CsvFileGateway,
  ) {}

  async execute(id: string): Promise<void> {
    await this.files.download(await this.data.exportById(id));
  }
}

export type PreparedCsvImport<Row, Conflict> =
  | { kind: 'empty' }
  | { kind: 'ready'; rows: Row[]; conflicts: Conflict[] };

export class PrepareCsvImport<Row, Conflict, Result> {
  constructor(private readonly data: CsvTransferDataPort<Row, Conflict, Result>) {}

  async execute(text: string): Promise<PreparedCsvImport<Row, Conflict>> {
    const rows = this.data.parse(text);
    if (rows.length === 0) return { kind: 'empty' };
    return { kind: 'ready', rows, conflicts: await this.data.detectConflicts(rows) };
  }
}

export class ImportCsvTransfer<Row, Conflict, Result> {
  constructor(private readonly data: CsvTransferDataPort<Row, Conflict, Result>) {}

  execute(rows: Row[], strategy: CsvConflictStrategy, conflicts: Conflict[]): Promise<Result> {
    return this.data.importData(rows, strategy, conflicts);
  }
}

export interface CsvTransferUseCases<Row, Conflict, Result> {
  exportCsv: ExportCsvTransfer<Row, Conflict, Result>;
  prepareImport: PrepareCsvImport<Row, Conflict, Result>;
  importCsv: ImportCsvTransfer<Row, Conflict, Result>;
  files: CsvFileGateway;
}
