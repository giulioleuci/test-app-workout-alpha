import { ArrowLeft, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';


interface TemplateHeaderProps {
  templateName: string;
  onEdit: () => void;
}

export default function TemplateHeader({ templateName, onEdit }: TemplateHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={() => navigate('/workouts')}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex flex-1 items-center gap-2">
        <h1 className="text-h4 font-bold sm:text-2xl">{templateName || t('sessions.editTemplate')}</h1>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
