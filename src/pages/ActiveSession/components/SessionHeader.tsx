import { ArrowLeft, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { WorkoutSession, PlannedWorkout, PlannedSession } from '@/domain/entities';
import dayjs from '@/lib/dayjs';

import TimerDisplay from './TimerDisplay';

interface SessionHeaderProps {
  workoutSession: WorkoutSession;
  plannedSession: PlannedSession | undefined;
  plannedWorkout: PlannedWorkout | undefined;
  onDiscard: (title: string, description: string) => void;
}

export default function SessionHeader({
  workoutSession,
  plannedSession,
  plannedWorkout,
  onDiscard,
}: SessionHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-h4 min-w-0 flex-1 truncate font-bold leading-tight">
          {plannedSession?.name || t('activeSession.title')}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
          onClick={() => onDiscard(t('sessions.deleteSession'), t('activeSession.discardConfirm'))}
          title={t('sessions.deleteSession')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-body-sm flex items-center gap-2 pl-1 text-muted-foreground">
        {plannedWorkout && (
          <>
            <span className="max-w-32 truncate font-medium text-foreground/70">{plannedWorkout.name}</span>
            <span className="text-border">·</span>
          </>
        )}
        <span>{dayjs(workoutSession.startedAt).format('HH:mm')}</span>
        <span className="text-border">·</span>
        <TimerDisplay startedAt={workoutSession.startedAt} />
      </div>
    </div>
  );
}
