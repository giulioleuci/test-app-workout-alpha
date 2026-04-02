import { ArrowLeft, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';


interface SessionDetailHeaderProps {
  workoutId: string;
  editName: string;
  editDayNumber: number;
  onEdit: () => void;
}

export default function SessionDetailHeader({
  workoutId,
  editName,
  editDayNumber,
  onEdit,
}: SessionDetailHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={() => navigate(`/workouts/${workoutId}`)}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex flex-1 items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">{editName}</h1>
          <p className="text-sm text-muted-foreground">
            {t('sessions.dayNumber')} {editDayNumber}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="ml-1 h-8 w-8" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
