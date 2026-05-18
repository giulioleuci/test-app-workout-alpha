import { ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  onDiscard,
}: SessionHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="-ml-2 h-10 w-10 shrink-0" onClick={() => navigate('/')}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="text-h4 truncate font-semibold leading-tight">
          {plannedSession?.name || t('activeSession.title')}
        </h1>
        <div className="text-caption flex items-center gap-1.5 text-muted-foreground">
          <span>{dayjs(workoutSession.startedAt).format('HH:mm')}</span>
          <span className="text-border">·</span>
          <TimerDisplay startedAt={workoutSession.startedAt} />
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDiscard(t('sessions.deleteSession'), t('activeSession.discardConfirm'))}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('sessions.deleteSession')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
