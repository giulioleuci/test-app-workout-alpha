import { Download, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface CsvToolbarProps {
  onExport: () => void;
  onImportClick: () => void;
  isExporting: boolean;
  isImporting: boolean;
  exportLabel: string;
  importLabel: string;
  exportingLabel: string;
  importingLabel: string;
}

export function CsvToolbar({
  onExport, onImportClick, isExporting, isImporting,
  exportLabel, importLabel, exportingLabel, importingLabel,
}: CsvToolbarProps) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={onExport}
        disabled={isExporting}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">{isExporting ? exportingLabel : exportLabel}</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={onImportClick}
        disabled={isImporting}
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">{isImporting ? importingLabel : importLabel}</span>
      </Button>
    </>
  );
}
