import { ArrowLeft, Pencil, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { PlannedWorkout } from '@/domain/entities';
import { formatDurationRange, type DurationRange } from '@/services/durationEstimator';

interface WorkoutHeaderProps {
  workout: PlannedWorkout;
  workoutDuration: DurationRange | null;
  onEdit: () => void;
}

export default function WorkoutHeader({ workout, workoutDuration, onEdit }: WorkoutHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-start gap-3">
      <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => navigate('/workouts')}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-h4 truncate font-bold sm:text-2xl">{workout.name}</h1>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-body-sm flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground sm:text-sm">
          <span>{t(`enums.objectiveType.${workout.objectiveType}`)} · {t(`enums.workType.${workout.workType}`)}</span>
          {workoutDuration && workoutDuration.maxSeconds > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDurationRange(workoutDuration)} {t('sessions.total')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
