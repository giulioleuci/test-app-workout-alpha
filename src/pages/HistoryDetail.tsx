import { useEffect, useMemo, useState } from 'react';

import { ArrowLeft, Trash2, Calendar, Clock, Plus, BarChart2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import VolumeSection from '@/components/analytics/VolumeSection';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DetailPageSkeleton } from '@/components/ui/page-skeleton';
import type { RelevantSetItem } from '@/domain/analytics-types';
import type { VolumeAnalytics } from '@/domain/analytics-types';
import type { SessionSet, SessionExerciseGroup, SessionExerciseItem } from '@/domain/entities';
import { SetType, ToFailureIndicator, ExerciseGroupType } from '@/domain/enums';
import { useSessionMutations } from '@/hooks/mutations/sessionMutations';
import { useEnhancedExerciseCatalog } from '@/hooks/queries/exerciseQueries';
import { useHistoryDetail } from '@/hooks/queries/sessionHistoryQueries';
import { useToast } from '@/hooks/useToast';
import dayjs from '@/lib/dayjs';
import { formatDate, formatTime, durationMinutes } from '@/lib/formatting';
import { getRankBetween, getInitialRank } from '@/lib/lexorank';
import { roundToHalf } from '@/lib/math';
import {
  calculateVolumeMetrics,
  convertVolumeMapToExtended,
} from '@/services/analyticsCalculators';

import AddExerciseGroupDialog from './HistoryDetail/components/AddExerciseGroupDialog';
import HistoryItemRow from './HistoryDetail/components/HistoryItemRow';
import SessionMetaCard from './HistoryDetail/components/SessionMetaCard';


export default function HistoryDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, isLoading } = useHistoryDetail(id);
  const { data: exercises = [] } = useEnhancedExerciseCatalog();
  const mutations = useSessionMutations();

  const [notes, setNotes] = useState('');
  const [overallRPE, setOverallRPE] = useState('');
  const [startedAt, setStartedAt] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('');
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState('');
  const [addGroupOpen, setAddGroupOpen] = useState(false);

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

  const deleteExerciseItem = async (itemId: string, groupId: string) => {
    if (!id) return;
    try { await mutations.deleteExerciseItem({ itemId, groupId }); }
    catch { /* error handled by mutation or toast */ }
  };

  const updateExerciseItem = async (itemId: string, exerciseId: string) => {
    if (!id) return;
    try {
      await mutations.updateExerciseItem({ itemId, updates: { exerciseId, exerciseVersionId: undefined } });
    }
    catch { /* error handled by mutation or toast */ }
  };

  const addExerciseGroup = async (exerciseIds: string[], groupType: ExerciseGroupType) => {
    if (!id || !data) return;
    const lastGroup = data.groups[data.groups.length - 1];
    const groupOrderIndex = lastGroup
      ? getRankBetween(lastGroup.group.orderIndex, null)
      : getInitialRank();

    const group: SessionExerciseGroup = {
      id: nanoid(),
      workoutSessionId: id,
      groupType,
      orderIndex: groupOrderIndex,
      isCompleted: true,
    };

    let prevItemRank = getInitialRank();
    const items: SessionExerciseItem[] = exerciseIds.map((exerciseId, idx) => {
      const rank = idx === 0 ? prevItemRank : getRankBetween(prevItemRank, null);
      prevItemRank = rank;
      return {
        id: nanoid(),
        sessionExerciseGroupId: group.id,
        exerciseId,
        orderIndex: rank,
        isCompleted: true,
        completedAt: data.session.completedAt,
      };
    });

    const sets: SessionSet[] = items.map(item => ({
      id: nanoid(),
      sessionExerciseItemId: item.id,
      setType: SetType.Working,
      orderIndex: getInitialRank(),
      actualLoad: null,
      actualCount: null,
      actualRPE: null,
      actualToFailure: ToFailureIndicator.None,
      expectedRPE: null,
      isCompleted: true,
      isSkipped: false,
      partials: false,
      forcedReps: 0,
    }));

    try { await mutations.addExerciseGroup({ group, items, sets }); }
    catch { /* error handled by mutation or toast */ }
  };

  // Compute volume analytics from session data
  const sessionVolume = useMemo((): VolumeAnalytics | null => {
    if (!data) return null;

    const exerciseMap = new Map<string, import('@/domain/entities').Exercise>();
    const relevantSets: RelevantSetItem[] = [];

    for (const lg of data.groups) {
      for (const { item, exercise, sets } of lg.items) {
        if (exercise) {
          exerciseMap.set(item.exerciseId, exercise);
        }
        for (const set of sets) {
          if (set.isCompleted) {
            relevantSets.push({ set, item, session: data.session });
          }
        }
      }
    }

    if (relevantSets.length === 0) return null;

    const metrics = calculateVolumeMetrics(relevantSets, exerciseMap);
    const volumeByMuscle = convertVolumeMapToExtended(metrics.muscleVol);
    const volumeByMuscleGroup = convertVolumeMapToExtended(metrics.muscleGroupVol);
    const volumeByMovement = convertVolumeMapToExtended(metrics.movementVol);
    const objectiveDistribution = convertVolumeMapToExtended(metrics.objectiveVol);

    const sortedMuscles = [...volumeByMuscle].sort((a, b) => b.weightedSets - a.weightedSets);

    return {
      volumeByMuscle,
      volumeByMuscleGroup,
      volumeByMovement,
      objectiveDistribution,
      totalSets: relevantSets.length,
      avgSetsPerWeek: relevantSets.length,
      mostTrainedMuscle: sortedMuscles[0]?.name ?? null,
      leastTrainedMuscle: sortedMuscles[sortedMuscles.length - 1]?.name ?? null,
    };
  }, [data]);

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
            <AlertDialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
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
                exercises={exercises}
                groupId={lg.group.id}
                onUpdateSet={updateSet}
                onDeleteSet={deleteSet}
                onAddSet={addSet}
                onDeleteItem={deleteExerciseItem}
                onUpdateItem={updateExerciseItem}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Add exercise group button */}
      <Button variant="outline" className="w-full" onClick={() => setAddGroupOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {t('sessions.addExerciseGroup')}
      </Button>

      {/* Add exercise group dialog */}
      <AddExerciseGroupDialog
        open={addGroupOpen}
        onOpenChange={setAddGroupOpen}
        exercises={exercises}
        onConfirm={addExerciseGroup}
      />

      {/* Volume section */}
      {sessionVolume && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pl-1">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">{t('sessions.sessionVolume')}</h2>
          </div>
          <VolumeSection volumeData={sessionVolume} />
        </div>
      )}
    </div>
  );
}
