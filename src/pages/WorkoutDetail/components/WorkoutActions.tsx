import { FileDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

interface WorkoutActionsProps {
  onImportTemplate: () => void;
}

export default function WorkoutActions({ onImportTemplate }: WorkoutActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
      <h2 className="text-h4 font-semibold">{t('sessions.title')}</h2>
      <Button size="sm" variant="outline" className="text-body-sm w-fit" onClick={onImportTemplate}>
        <FileDown className="mr-1 h-3.5 w-3.5" />
        {t('sessions.importTemplate')}
      </Button>
    </div>
  );
}
