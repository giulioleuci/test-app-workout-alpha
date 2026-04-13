import { ArrowUp, ArrowDown, Pencil, MoreVertical, Copy, BookmarkPlus, BarChart3, Trash2, Clock, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlannedSession } from '@/domain/entities';
import { formatDurationRange, type DurationRange } from '@/services/durationEstimator';
import { type DeducedMuscles } from '@/services/muscleDeducer';

interface SessionListProps {
  sessions: PlannedSession[];
  workoutId: string;
  muscles: Record<string, DeducedMuscles>;
  durations: Record<string, DurationRange>;
  onMoveSession: (idx: number, direction: -1 | 1) => void;
  onEditSession: (session: PlannedSession) => void;
  onDuplicate: (sessionId: string) => void;
  onSaveAsTemplate: (sessionId: string, name: string) => void;
  onViewVolume: (sessionId: string, name: string) => void;
  onRemoveSession: (sessionId: string) => void;
  onActivateSession: (session: PlannedSession) => void;
}

export default function SessionList({
  sessions,
  workoutId,
  muscles,
  durations,
  onMoveSession,
  onEditSession,
  onDuplicate,
  onSaveAsTemplate,
  onViewVolume,
  onRemoveSession,
  onActivateSession,
}: SessionListProps) {
  const { t } = useTranslation();

  if (sessions.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">{t('sessions.noSessions')}</p>;
  }

  return (
    <div className="space-y-3">
      {sessions.map((s, idx) => {
        const sm = muscles[s.id];
        const sd = durations[s.id];
        return (
          <Card key={s.id}>
            <CardContent className="space-y-2.5 px-3 py-3 sm:px-4">
              {/* Top row: reorder + name + menu */}
              <div className="flex items-start gap-1.5 sm:gap-2">
                <div className="mt-0.5 flex shrink-0 flex-col">
                  <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" disabled={idx === 0} onClick={() => onMoveSession(idx, -1)}>
                    <ArrowUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" disabled={idx === sessions.length - 1} onClick={() => onMoveSession(idx, 1)}>
                    <ArrowDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm font-medium">{s.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onEditSession(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem onClick={() => onEditSession(s)}>
                      <Pencil className="mr-2 h-4 w-4" />{t('actions.edit')} {t('sessions.info').toLowerCase()}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(s.id)}>
                      <Copy className="mr-2 h-4 w-4" />{t('sessions.duplicate')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSaveAsTemplate(s.id, s.name)}>
                      <BookmarkPlus className="mr-2 h-4 w-4" />{t('sessions.saveAsTemplate')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewVolume(s.id, s.name)}>
                      <BarChart3 className="mr-2 h-4 w-4" />{t('workouts.volumeAnalysis')}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => onRemoveSession(s.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />{t('actions.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Middle: info + chips */}
              <div className="space-y-1.5">
                <Badge variant="outline" className="text-caption sm:text-body-sm">
                  {t('sessions.dayNumber')} {s.dayNumber}
                </Badge>
                {sm && (sm.primaryMuscles.length > 0 || sm.muscleGroups.length > 0) && (
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {sm.muscleGroups.map((mg: string) => (
                        <Badge key={mg} variant="default" className="text-caption sm:text-body-sm">
                          {t(`enums.muscleGroup.${mg}`)}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {sm.primaryMuscles.map((m: string) => (
                        <Badge key={m} variant="secondary" className="text-caption sm:text-body-sm">
                          {t(`enums.muscle.${m}`)}
                        </Badge>
                      ))}
                      {sm.secondaryMuscles.map((m: string) => (
                        <Badge key={m} variant="outline" className="text-caption sm:text-body-sm opacity-70">
                          {t(`enums.muscle.${m}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {sd && sd.maxSeconds > 0 && (
                  <div className="text-caption sm:text-body-sm flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{formatDurationRange(sd)}</span>
                  </div>
                )}
              </div>

              {/* Bottom: actions right-aligned */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" className="text-body-sm" asChild>
                  <Link to={`/workouts/${workoutId}/sessions/${s.id}`}>
                    <span className="sm:hidden">{t('sessions.configureExercisesShort')}</span>
                    <span className="hidden sm:inline">{t('sessions.configureExercises')}{' \u2192 '}</span>
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="text-body-sm"
                  onClick={() => onActivateSession(s)}
                >
                  <Zap className="mr-1 h-3.5 w-3.5" />
                  <span className="sm:hidden">{t('sessions.activateShort')}</span>
                  <span className="hidden sm:inline">{t('sessions.activate')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
