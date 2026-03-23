import { useEffect, useState } from 'react';

import { ArrowLeft, Trash2, Calendar, Clock } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DetailPageSkeleton } from '@/components/ui/page-skeleton';
import type { SessionSet } from '@/domain/entities';
import { SetType, ToFailureIndicator } from '@/domain/enums';
import { useSessionMutations } from '@/hooks/mutations/sessionMutations';
import { useHistoryDetail } from '@/hooks/queries/sessionQueries';
import { useToast } from '@/hooks/useToast';
import dayjs from '@/lib/dayjs';
import { formatDate, formatTime, durationMinutes } from '@/lib/formatting';

import HistoryItemRow from './HistoryDetail/components/HistoryItemRow';
import SessionMetaCard from './HistoryDetail/components/SessionMetaCard';
import { roundToHalf } from '@/lib/math';
import { getRankBetween, getInitialRank } from '@/lib/lexorank';

export default function HistoryDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, isLoading } = useHistoryDetail(id);
  const mutations = useSessionMutations();

  const [notes, setNotes] = useState('');
  const [overallRPE, setOverallRPE] = useState('');
  const [startedAt, setStartedAt] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('');
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (data) {
      setNotes(data.session.notes ?? '');
      setOverallRPE(data.session.overallRPE?.toString() ?? '');
      const sAt = dayjs(data.session.startedAt);
      setStartedAt(sAt.toDate());
      setStartTime(sAt.format('HH:mm'));
      if (data.session.completedAt) {
        const cAt = dayjs(data.session.completedAt);
        setCompletedAt(cAt.toDate());
        setEndTime(cAt.format('HH:mm'));
      }
    }
  }, [data]);

  const saveSessionMeta = async () => {
    if (!id) return;
    const [sh, sm] = startTime.split(':').map(Number);
    let newStart = dayjs(startedAt);
    if (!isNaN(sh) && !isNaN(sm)) {
      newStart = newStart.hour(sh).minute(sm).second(0).millisecond(0);
    }

    let newEnd: dayjs.Dayjs | undefined = undefined;
    if (completedAt && endTime) {
      const [eh, em] = endTime.split(':').map(Number);
      newEnd = dayjs(completedAt);
      if (!isNaN(eh) && !isNaN(em)) {
        newEnd = newEnd.hour(eh).minute(em).second(0).millisecond(0);
      }
    }

    const startAtDate = newStart.toDate();
    const endAtDate = newEnd?.toDate();

    try {
      await mutations.updateSessionMeta({
        id,
        updates: {
          notes: notes.trim() || undefined,
          overallRPE: overallRPE && !isNaN(parseFloat(overallRPE.replace(',', '.'))) ? roundToHalf(parseFloat(overallRPE.replace(',', '.'))) : undefined,
          startedAt: startAtDate,
          completedAt: endAtDate,
        }
      });
      toast({ title: t('sessions.saved'), description: t('sessions.savedDesc') });
    } catch { toast({ title: t('pendingSession.error'), variant: 'destructive' }); }
  };

  const updateSet = async (setId: string, updates: Partial<SessionSet>) => {
    if (!id) return;
    try { await mutations.updateSessionSet({ id: setId, sessionId: id, updates }); }
    catch { /* error handled by mutation or toast */ }
  };

  const deleteSet = async (setId: string) => {
    if (!id) return;
    try { await mutations.deleteSessionSet({ id: setId, sessionId: id }); }
    catch { /* error handled by mutation or toast */ }
  };

  const addSet = async (sessionExerciseItemId: string, lastOrderIndex?: string) => {
    if (!id) return;
    const newSet: SessionSet = {
      id: nanoid(),
      sessionExerciseItemId,
      setType: SetType.Working,
      orderIndex: lastOrderIndex ? getRankBetween(lastOrderIndex, null) : getInitialRank(),
      actualLoad: null,
      actualCount: null,
      actualRPE: null,
      actualToFailure: ToFailureIndicator.None,
      expectedRPE: null,
      isCompleted: true,
      isSkipped: false,
      partials: false,
      forcedReps: 0,
    };
    try { await mutations.addSessionSet({ sessionId: id, set: newSet }); }
    catch { /* error handled by mutation or toast */ }
  };

  const deleteSession = async () => {
    if (!id) return;
    await mutations.deleteSession(id);
    navigate('/history');
  };

  if (isLoading || !data) return <DetailPageSkeleton />;

  const { session, groups, simpleMode, workoutName, sessionName, originalExerciseNames } = data;

  const dur = durationMinutes(session.startedAt, session.completedAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/history')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-4 w-4" />{t('actions.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('sessions.deleteSession')}</AlertDialogTitle>
                <AlertDialogDescription>{t('common.irreversibleAction')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={deleteSession}>{t('actions.delete')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <h1 className="pl-1 text-2xl font-bold">{sessionName || t('common.freeSession')}</h1>
        <div className="flex flex-col gap-1 pl-1 text-sm text-muted-foreground">
          {workoutName && <span>{workoutName}</span>}
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(session.startedAt, 'dddd D MMMM YYYY')}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatTime(session.startedAt)}{session.completedAt && ` – ${formatTime(session.completedAt)}`}</span>
          {dur !== null && <span className="pl-5">{dur} {t('time.minutes')}</span>}
        </div>
      </div>

      {/* Session meta — read-only with edit button */}
      <SessionMetaCard
        startedAt={startedAt}
        startTime={startTime}
        completedAt={completedAt}
        endTime={endTime}
        overallRPE={overallRPE}
        notes={notes}
        dur={dur}
        simpleMode={simpleMode}
        onStartedAtChange={setStartedAt}
        onStartTimeChange={setStartTime}
        onCompletedAtChange={setCompletedAt}
        onEndTimeChange={setEndTime}
        onOverallRPEChange={setOverallRPE}
        onNotesChange={setNotes}
        onSave={saveSessionMeta}
      />



      {/* Exercise groups and sets */}
      {groups.map((lg) => (
        <Card key={lg.group.id}>
          <CardHeader className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-body-sm">
                {t(`enums.exerciseGroupType.${lg.group.groupType}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4 pt-0">
            {lg.items.map(({ item, exercise, sets }) => (
              <HistoryItemRow
                key={item.id}
                item={item}
                exercise={exercise}
                sets={sets}
                originalExerciseNames={originalExerciseNames}
                simpleMode={simpleMode}
                sessionId={id!}
                onUpdateSet={updateSet}
                onDeleteSet={deleteSet}
                onAddSet={addSet}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
