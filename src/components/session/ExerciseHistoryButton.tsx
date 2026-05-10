import { useState } from 'react';

import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PerformanceBadge from '@/components/session/PerformanceBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useExerciseHistory } from '@/hooks/queries/sessionQueries';
import dayjs from '@/lib/dayjs';

interface ExerciseHistoryButtonProps {
  exerciseId: string;
  currentSessionId: string;
  plannedExerciseItemId?: string;
  occurrenceIndex?: number;
  simpleMode?: boolean;
  trigger?: React.ReactNode;
}

const SESSIONS_PER_PAGE = 3;

export default function ExerciseHistoryButton({
  exerciseId, currentSessionId, plannedExerciseItemId, occurrenceIndex, simpleMode, trigger
}: ExerciseHistoryButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [filterSameWorkout, setFilterSameWorkout] = useState(false);
  const [page, setPage] = useState(0);

  const { data: sessionGroups = [], isLoading: loading } = useExerciseHistory(
    exerciseId, currentSessionId, plannedExerciseItemId, occurrenceIndex, filterSameWorkout
  );

  const totalPages = Math.ceil(sessionGroups.length / SESSIONS_PER_PAGE);
  const currentGroups = sessionGroups.slice(page * SESSIONS_PER_PAGE, (page + 1) * SESSIONS_PER_PAGE);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <History className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-sm font-semibold">{t('activeSession.exerciseHistory')}</DialogTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="same-workout" className="text-body-sm cursor-pointer">{t('activeSession.onlyCurrentWorkout')}</Label>
              <Switch
                id="same-workout"
                checked={filterSameWorkout}
                onCheckedChange={setFilterSameWorkout}
                className="origin-right scale-75"
              />
            </div>
          </div>
          <DialogDescription className="sr-only">
            {t('activeSession.exerciseHistory') || 'Visualizza la cronologia dei set completati per questo esercizio nelle sessioni passate.'}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div style={{ minHeight: '150px' }} className="space-y-4">
          {loading ? (
            <div className="text-body-sm flex h-32 items-center justify-center text-muted-foreground">{t('common.loading')}</div>
          ) : currentGroups.length === 0 ? (
            <div className="text-body-sm flex h-32 items-center justify-center text-muted-foreground">{t('common.noData')}</div>
          ) : (
            currentGroups.map((sg) => (
              <div key={sg.session.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                    {dayjs(sg.session.startedAt).format('DD MMM YYYY')}
                    {sg.sessionName ? ` · ${sg.sessionName}` : ` · ${dayjs(sg.session.startedAt).format('HH:mm')}`}
                  </div>
                  {sg.performanceStatus && sg.performanceStatus !== 'insufficient_data' && (
                    <PerformanceBadge status={sg.performanceStatus} showLabel={false} />
                  )}
                </div>
                <div className="space-y-1">
                  {sg.sets.map((s, idx) => (
                    <div key={s.id} className="text-body-sm flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-caption w-6 font-mono text-muted-foreground">{t('units.S')}{idx + 1}</span>
                        <span className="font-medium">
                          {s.actualCount} {t('units.reps')} × {s.actualLoad}{t('units.kg')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">

                        {!simpleMode && <Badge variant="outline" className="text-caption h-5 px-1.5">{t('planning.rpe')} {s.actualRPE ?? '-'}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 px-2"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{t('common.prev')}</span>
            </Button>
            <span className="text-body-sm font-medium text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 px-2"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            >
              <span>{t('common.next')}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
