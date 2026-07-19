import { useTranslation } from 'react-i18next';

import type { CsvConflictStrategy } from '@/application/csv/ports';

import { CsvConflictDialog } from './CsvConflictDialog';
import { CsvToolbar } from './CsvToolbar';

type CsvTransferViewModel = {
  exporting: boolean;
  importing: boolean;
  conflictOpen: boolean;
  conflictCount: number;
  setConflictOpen: (open: boolean) => void;
  exportCsv: () => Promise<void>;
  selectImportFile: () => Promise<void>;
  chooseConflictStrategy: (strategy: CsvConflictStrategy) => void;
};

export function CsvTransferToolbar({ vm }: { vm: CsvTransferViewModel }) {
  const { t } = useTranslation();

  return (
    <>
      <CsvToolbar
        onExport={vm.exportCsv}
        onImportClick={vm.selectImportFile}
        isExporting={vm.exporting}
        isImporting={vm.importing}
        exportLabel={t('csv.exportCsv')}
        importLabel={t('csv.importCsv')}
        exportingLabel={t('csv.exporting')}
        importingLabel={t('csv.importing')}
      />
      <CsvConflictDialog
        open={vm.conflictOpen}
        onOpenChange={vm.setConflictOpen}
        conflictCount={vm.conflictCount}
        onChoose={vm.chooseConflictStrategy}
      />
    </>
  );
}
