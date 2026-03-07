
import { useEffect, useState, useCallback, useMemo } from 'react';

import { Plus } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import SessionVolumeDialog from '@/components/planning/SessionVolumeDialog';
import UnsavedChangesBar from '@/components/planning/UnsavedChangesBar';
import PendingSessionDialog from '@/components/session/PendingSessionDialog';
import SubstitutionConfirmDialog from '@/components/session/SubstitutionConfirmDialog';
import { Button } from '@/components/ui/button';
import { DetailPageSkeleton } from '@/components/ui/page-skeleton';
import type { PlannedSession, SessionTemplate } from '@/domain/entities';
import { PlannedSessionStatus, ObjectiveType, WorkType } from '@/domain/enums';
import { useWorkoutMutations } from '@/hooks/mutations/workoutMutations';
import { useWorkoutDetail, useSessionTemplates } from '@/hooks/queries/workoutQueries';
import { useDialogManager } from '@/hooks/useDialogManager';
import { useSessionActivation } from '@/hooks/useSessionActivation';
import { useToast } from '@/hooks/useToast';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import dayjs from '@/lib/dayjs';
import { serializeSessionToTemplate, importTemplateToWorkout, cloneSession } from '@/services/sessionCloner';
import { createTemplate } from '@/services/templateService';
import { getWorkoutSessions } from '@/services/workoutService';
import { getRankBetween, getInitialRank } from '@/lib/lexorank';

import EditSessionPropertiesDialog from './WorkoutDetail/components/EditSessionPropertiesDialog';
import EditWorkoutDialog from './WorkoutDetail/components/EditWorkoutDialog';
import ImportTemplateDialog from './WorkoutDetail/components/ImportTemplateDialog';
import SaveAsTemplateDialog from './WorkoutDetail/components/SaveAsTemplateDialog';
import SessionList from './WorkoutDetail/components/SessionList';
import WorkoutActions from './WorkoutDetail/components/WorkoutActions';
import WorkoutHeader from './WorkoutDetail/components/WorkoutHeader';

export default function WorkoutDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data, isLoading } = useWorkoutDetail(id);
  const { data: templatesData } = useSessionTemplates();
  const mutations = useWorkoutMutations();

  const {
    handleStartSession,
    pendingDialogOpen,
    pendingSession,
    onPendingResolved,
    onPendingCancel,
    subDialogOpen,
    subPrompts,
    onSubstitutionComplete,
    onSubstitutionCancel,
  } = useSessionActivation();

  const workout = data?.workout;
  const originalSessions = useMemo(() => data?.sessions ?? [], [data?.sessions]);
  const muscles = data?.muscles ?? {};
  const durations = data?.durations ?? {};
  const workoutDuration = data?.workoutDuration ?? null;
  const templates = templatesData ?? [];

  const [sessions, setSessions] = useState<PlannedSession[]>([]);

  useEffect(() => {
    if (data?.sessions) {
      setSessions(data.sessions);
    }
  }, [data?.sessions]);

  const dialogs = useDialogManager<'template' | 'saveTemplate' | 'volume' | 'editWorkout' | 'editSession'>();

  const [templateName, setTemplateName] = useState('');
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);
  const [volumeSession, setVolumeSession] = useState<{ id: string; name: string } | null>(null);
  const [editingSession, setEditingSession] = useState<PlannedSession | null>(null);

  const openEditSessionDialog = (session: PlannedSession) => {
    setEditingSession(session);
    dialogs.open('editSession');
  };

  const handleUpdateSessionProperties = (updates: { name: string; notes?: string }) => {
    if (!editingSession) return;
    updateSession(editingSession.id, {
      name: updates.name.trim(),
      notes: updates.notes?.trim() ?? undefined,
    });
    dialogs.close('editSession');
    setEditingSession(null);
  };

  const isDirty = useMemo(
    () => JSON.stringify(sessions) !== JSON.stringify(originalSessions),
    [sessions, originalSessions]
  );

  const handleUpdateWorkout = async (updates: { name: string; description?: string; objectiveType: ObjectiveType; workType: WorkType }) => {
    if (!id || !updates.name.trim()) return;
    await mutations.updateWorkout({
      id,
      updates: {
        name: updates.name.trim(),
        description: updates.description?.trim() ?? undefined,
        objectiveType: updates.objectiveType,
        workType: updates.workType,
      }
    });
    dialogs.close('editWorkout');
    toast({ title: t('sessions.saved') });
  };

  // === In-memory CRUD (no DB writes) ===
  const addSession = () => {
    if (!id) return;
    const now = dayjs().toDate();
    const newSession: PlannedSession = {
      id: nanoid(),
      plannedWorkoutId: id,
      name: `Sessione ${sessions.length + 1}`,
      dayNumber: sessions.length + 1,
      focusMuscleGroups: [],
      status: PlannedSessionStatus.Pending,
      orderIndex: sessions.length === 0 ? getInitialRank() : getRankBetween(sessions[sessions.length - 1].orderIndex, null),
      createdAt: now,
      updatedAt: now,
    };
    setSessions(prev => [...prev, newSession]);
  };

  const removeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const updateSession = (sessionId: string, updates: Partial<PlannedSession>) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, ...updates, updatedAt: dayjs().toDate() } : s
    ));
  };

  const moveSession = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sessions.length) return;
    const next = [...sessions];
    const a = next[index];
    const b = next[targetIndex];
    // Swap orderIndex and dayNumber
    next[index] = { ...b, orderIndex: a.orderIndex, dayNumber: a.dayNumber, updatedAt: dayjs().toDate() };
    next[targetIndex] = { ...a, orderIndex: b.orderIndex, dayNumber: b.dayNumber, updatedAt: dayjs().toDate() };
    setSessions(next.sort((x, y) => x.orderIndex.localeCompare(y.orderIndex)));
  };

  // === Save / Discard ===
  const saveAll = useCallback(async () => {
    if (!id) return;
    await mutations.saveWorkoutSessions({
      workoutId: id,
      sessions,
      originalSessions
    });
    toast({ title: t('unsavedChanges.saved') });
  }, [id, sessions, originalSessions, mutations, t, toast]);

  const discardAll = useCallback(() => {
    setSessions(originalSessions);
    toast({ title: t('unsavedChanges.discarded') });
  }, [originalSessions, toast, t]);

  const { isNavigationBlocked, confirmSaveAndLeave, confirmLeaveWithout, cancelNavigation } =
    useUnsavedChanges({ isDirty, onSave: saveAll, onDiscard: discardAll });

  // === External operations (still write to DB directly) ===
  const handleDuplicate = async (sessionId: string) => {
    if (!id) return;
    await cloneSession(sessionId, id);
    // Reload sessions manually for now since we're using a direct service call
    void getWorkoutSessions(id).then(setSessions);
    toast({ title: t('sessions.duplicated') });
  };

  const handleSaveAsTemplate = (sessionId: string, sessionName: string) => {
    setSavingSessionId(sessionId);
    setTemplateName(sessionName);
    dialogs.open('saveTemplate');
  };

  const confirmSaveTemplate = async (name: string) => {
    if (!savingSessionId || !name.trim()) return;
    const content = await serializeSessionToTemplate(savingSessionId);
    await createTemplate(name.trim(), undefined, content);
    dialogs.close('saveTemplate');
    setSavingSessionId(null);
    toast({ title: t('sessions.savedAsTemplate') });
  };

  const handleImportTemplate = async (template: SessionTemplate) => {
    if (!id) return;
    await importTemplateToWorkout({ name: template.name, content: template.content }, id);
    dialogs.close('template');
    void getWorkoutSessions(id).then(setSessions);
    toast({ title: `"${template.name}" ${t('sessions.imported')}` });
  };

  const handleActivateSession = (s: PlannedSession) => {
    if (!id) return;
    void handleStartSession(s.id, id);
  };

  if (isLoading || !workout) return <DetailPageSkeleton />;

  return (
    <div className="space-y-6 pb-20">
      <WorkoutHeader
        workout={workout}
        workoutDuration={workoutDuration}
        onEdit={() => dialogs.open('editWorkout')}
      />

      <WorkoutActions onImportTemplate={() => dialogs.open('template')} />

      <SessionList
        sessions={sessions}
        workoutId={id!}
        muscles={muscles}
        durations={durations}
        onMoveSession={moveSession}
        onEditSession={openEditSessionDialog}
        onDuplicate={handleDuplicate}
        onSaveAsTemplate={handleSaveAsTemplate}
        onViewVolume={(sid, name) => {
          setVolumeSession({ id: sid, name });
          dialogs.open('volume');
        }}
        onRemoveSession={removeSession}
        onActivateSession={handleActivateSession}
      />

      {/* Unsaved changes bar */}
      <UnsavedChangesBar
        isDirty={isDirty}
        onSave={saveAll}
        onDiscard={discardAll}
        isNavigationBlocked={isNavigationBlocked}
        onConfirmSaveAndLeave={confirmSaveAndLeave}
        onConfirmLeaveWithout={confirmLeaveWithout}
        onCancelNavigation={cancelNavigation}
        fabRightOffset="5.5rem"
      />

      <SessionVolumeDialog
        sessionId={volumeSession?.id ?? null}
        sessionName={volumeSession?.name ?? ''}
        open={dialogs.isOpen('volume')}
        onOpenChange={(open) => {
          if (!open) {
            dialogs.close('volume');
            setVolumeSession(null);
          } else {
            dialogs.open('volume');
          }
        }}
      />

      <SaveAsTemplateDialog
        open={dialogs.isOpen('saveTemplate')}
        onOpenChange={(open) => open ? dialogs.open('saveTemplate') : dialogs.close('saveTemplate')}
        initialName={templateName}
        onSave={confirmSaveTemplate}
      />

      <ImportTemplateDialog
        open={dialogs.isOpen('template')}
        onOpenChange={(open) => open ? dialogs.open('template') : dialogs.close('template')}
        templates={templates}
        onImport={handleImportTemplate}
        onDelete={(tid) => mutations.deleteTemplate(tid)}
      />

      <PendingSessionDialog
        open={pendingDialogOpen}
        pendingSession={pendingSession}
        onResolved={onPendingResolved}
        onCancel={onPendingCancel}
      />

      <SubstitutionConfirmDialog
        open={subDialogOpen}
        prompts={subPrompts}
        onComplete={onSubstitutionComplete}
        onCancel={onSubstitutionCancel}
      />

      {workout && (
        <EditWorkoutDialog
          key={workout.id}
          open={dialogs.isOpen('editWorkout')}
          onOpenChange={(open) => open ? dialogs.open('editWorkout') : dialogs.close('editWorkout')}
          workout={workout}
          onSave={handleUpdateWorkout}
        />
      )}

      <EditSessionPropertiesDialog
        open={dialogs.isOpen('editSession')}
        onOpenChange={(open) => open ? dialogs.open('editSession') : dialogs.close('editSession')}
        session={editingSession}
        onSave={handleUpdateSessionProperties}
      />

      {/* FAB */}
      <Button
        size="lg"
        className="fixed z-30 h-14 w-14 rounded-full shadow-lg md:h-12 md:w-auto md:px-5"
        style={{ bottom: 'calc(3.25rem + env(safe-area-inset-bottom) + 0.75rem)', right: '1rem' }}
        onClick={addSession}
      >
        <Plus className="h-5 w-5 md:mr-2" />
        <span className="hidden md:inline">{t('actions.add')}</span>
      </Button>
    </div>
  );
}
