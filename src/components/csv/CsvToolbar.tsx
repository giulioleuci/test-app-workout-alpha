import { RefObject } from 'react';

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
  inputFileRef: RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CsvToolbar({
  onExport, onImportClick, isExporting, isImporting,
  exportLabel, importLabel, exportingLabel, importingLabel,
  inputFileRef, onFileSelect
}: CsvToolbarProps) {
  return (
    <>
      <input ref={inputFileRef} type="file" accept=".csv" className="hidden" onChange={onFileSelect} />

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
