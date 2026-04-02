import { memo, useState } from 'react';

import { MoreVertical, Archive, RotateCcw, Trash2, Power, PowerOff, Clock, BarChart3, Pencil, Play, FileDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import type { PlannedWorkout, PlannedSession } from '@/domain/entities';
import { PlannedWorkoutStatus } from '@/domain/enums';
import { useToast } from '@/hooks/useToast';
import { triggerDownload } from '@/lib/download';
import { exportWorkoutCsv } from '@/services/csvWorkoutService';
import { formatDurationRange, type DurationRange } from '@/services/durationEstimator';

interface WorkoutCardProps {
  workout: PlannedWorkout;
  sessionCount: number;
  duration?: DurationRange;
  plannedSessions: PlannedSession[];
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onRemove: (id: string) => void;
  onStartSession: (sessionId: string, workoutId: string) => void;
  onVolumeAnalysis: (workoutId: string) => void;
}

export const WorkoutCard = memo(function WorkoutCard({
  workout,
  sessionCount,
  duration,
  plannedSessions,
  onActivate,
  onDeactivate,
  onArchive,
  onRestore,
  onRemove,
  onStartSession,
  onVolumeAnalysis
}: WorkoutCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const statusBadgeVariant = (status: PlannedWorkoutStatus) => {
    switch (status) {
      case PlannedWorkoutStatus.Active: return 'default' as const;
      case PlannedWorkoutStatus.Inactive: return 'secondary' as const;
      default: return 'secondary' as const;
    }
  };

  const handleExport = async () => {
    try {
      const { blob, filename } = await exportWorkoutCsv(workout.id);
      triggerDownload(blob, filename);
    } catch {
      toast({ title: t('csv.exportError'), variant: 'destructive' });
    }
  };

  return (
    <div
      className="group"
    >
      <Card className={`transition-colors ${workout.status === PlannedWorkoutStatus.Active ? 'border-2 border-primary/60 bg-primary/5' : 'hover:border-primary/30'}`}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <h3 className="min-w-0 truncate text-sm font-semibold">{workout.name}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {workout.status !== PlannedWorkoutStatus.Active && <DropdownMenuItem onClick={() => onActivate(workout.id)}><Power className="mr-2 h-4 w-4" />{t('actions.activate')}</DropdownMenuItem>}
              {workout.status === PlannedWorkoutStatus.Active && <DropdownMenuItem onClick={() => onDeactivate(workout.id)}><PowerOff className="mr-2 h-4 w-4" />{t('actions.deactivate')}</DropdownMenuItem>}
              {workout.status !== PlannedWorkoutStatus.Archived && <DropdownMenuItem onClick={() => onArchive(workout.id)}><Archive className="mr-2 h-4 w-4" />{t('actions.archive')}</DropdownMenuItem>}
              {workout.status === PlannedWorkoutStatus.Archived && <DropdownMenuItem onClick={() => onRestore(workout.id)}><RotateCcw className="mr-2 h-4 w-4" />{t('actions.restore')}</DropdownMenuItem>}
              <DropdownMenuItem onClick={handleExport}><FileDown className="mr-2 h-4 w-4" />{t('csv.exportCsv')}</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}><Trash2 className="mr-2 h-4 w-4" />{t('actions.delete')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-2.5 pt-0">
          {/* Middle: info + chips */}
          <div className="space-y-1">
            <div className="text-body-sm flex flex-col gap-0.5 text-muted-foreground">
              <span>{t(`enums.objectiveType.${workout.objectiveType}`)} {'·'} {t(`enums.workType.${workout.workType}`)}</span>
              <span>{sessionCount} {t('sessions.title').toLowerCase()}</span>
              {duration && duration.maxSeconds > 0 && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDurationRange(duration)}</span>
              )}
            </div>
            <Badge variant={statusBadgeVariant(workout.status)} className="text-caption sm:text-body-sm">
              {t(`enums.workoutStatus.${workout.status}`)}
            </Badge>
          </div>
          {/* Bottom: actions right-aligned */}
          <div className="flex justify-end gap-1.5">
            {plannedSessions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm" className="text-body-sm h-7 px-2 sm:px-3">
                    <Play className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">{t('dashboard.launchSession')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <DropdownMenuLabel>{t('sessions.selectToActivate')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {plannedSessions.map(s => (
                    <DropdownMenuItem key={s.id} onClick={() => onStartSession(s.id, workout.id)}>
                      {s.name || `${t('sessions.dayNumber')} ${s.dayNumber}`}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="sm" className="text-body-sm h-7 px-2 sm:px-3" title={t('workouts.volumeAnalysis')} onClick={() => onVolumeAnalysis(workout.id)}>
              <BarChart3 className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">{t('workouts.volumeAnalysis')}</span>
            </Button>
            <Button variant="outline" size="sm" className="text-body-sm h-7 px-2 sm:px-3" onClick={() => navigate(`/workouts/${workout.id}`)}>
              <Pencil className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">{t('actions.edit')}</span>
            </Button>
          </div>
        </CardContent>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.areYouSure', 'Are you sure?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('exercises.archiveWarning', 'Information will be kept in history if previously used, otherwise it will be permanently deleted.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => { onRemove(workout.id); setShowDeleteDialog(false); }}>{t('actions.confirm')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
});
