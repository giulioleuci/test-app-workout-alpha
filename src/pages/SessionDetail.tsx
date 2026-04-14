import { useEffect, useState, useCallback, useMemo } from 'react';

import isEqual from 'fast-deep-equal';
import { Plus, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import SessionVolumeDialog from '@/components/planning/SessionVolumeDialog';
import UnsavedChangesBar from '@/components/planning/UnsavedChangesBar';
import { Button } from '@/components/ui/button';
import { DetailPageSkeleton } from '@/components/ui/page-skeleton';
import type { Exercise } from '@/domain/entities';
import { useSessionMutations } from '@/hooks/mutations/sessionMutations';
import { usePlannedSessionDetail } from '@/hooks/queries/workoutQueries';
import { usePlanEditor } from '@/hooks/usePlanEditor';
import { useToast } from '@/hooks/useToast';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

import ExerciseGroupCard from './SessionDetail/components/ExerciseGroupCard';
import SessionDetailHeader from './SessionDetail/components/SessionDetailHeader';
import SessionDetailPropertiesDialog from './SessionDetail/components/SessionDetailPropertiesDialog';

export default function SessionDetail() {
  const { t } = useTranslation();
  const { id: workoutId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const { toast } = useToast();

  const { data, isLoading } = usePlannedSessionDetail(sessionId);
  const mutations = useSessionMutations();

  const {
    groups, items, sets,
    setAll,
    addGroup: addGroupCRUD,
    removeGroup, updateGroup, moveGroup,
    addItem: addItemCRUD,
    removeItem, updateItem, moveItem, updateItemClusterParams,
    addSet: addSetCRUD,
    updateSet: updatePlannedSet, removeSet: removePlannedSet
  } = usePlanEditor({ plannedSessionId: sessionId });

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [simpleMode, setSimpleMode] = useState(false);

  // Session property editing
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDayNumber, setEditDayNumber] = useState(1);
  const [editNotes, setEditNotes] = useState('');

  // Snapshots for dirty tracking
  const originalSessionProps = useMemo(() => data ? {
    name: data.session.name,
    dayNumber: data.session.dayNumber,
    notes: data.session.notes || '',
  } : null, [data]);

  const originalGroups = useMemo(() => data?.groups || [], [data?.groups]);
  const originalItems = useMemo(() => data?.items || {}, [data?.items]);
  const originalSets = useMemo(() => data?.sets || {}, [data?.sets]);

  useEffect(() => {
    if (data) {
      setAll(data.groups, data.items, data.sets);
      setExercises(data.exercises);
      setSimpleMode(data.simpleMode);
      setEditName(data.session.name);
      setEditDayNumber(data.session.dayNumber);
      setEditNotes(data.session.notes || '');
    }
  }, [data, setAll]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [volumeOpen, setVolumeOpen] = useState(false);

  const currentSessionProps = useMemo(() => ({
    name: editName,
    dayNumber: editDayNumber,
    notes: editNotes,
  }), [editName, editDayNumber, editNotes]);

  const isDirty = useMemo(() =>
    !isEqual(currentSessionProps, originalSessionProps) ||
    !isEqual(groups, originalGroups) ||
    !isEqual(items, originalItems) ||
    !isEqual(sets, originalSets),
    [currentSessionProps, originalSessionProps, groups, items, sets, originalGroups, originalItems, originalSets]
  );

  // Wrappers to match previous API/behavior
  const addGroup = () => {
    const newGroup = addGroupCRUD();
    setOpenGroups(prev => ({ ...prev, [newGroup.id]: true }));
  };

  const addExerciseItem = (groupId: string, exerciseId: string) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    addItemCRUD(groupId, exercise);
  };

  const addPlannedSet = (itemId: string, groupId?: string) => {
    addSetCRUD(itemId, groupId);
  };

  // ===== Save / Discard =====
  const saveAll = useCallback(async () => {
    if (!sessionId) return;

    const allCurrentItems = Object.values(items).flat();
    const allCurrentSets = Object.values(sets).flat();
    const allOriginalItems = Object.values(originalItems).flat();
    const allOriginalSets = Object.values(originalSets).flat();

    const currentGroupIds = new Set(groups.map(g => g.id));
    const currentItemIds = new Set(allCurrentItems.map(i => i.id));
    const currentSetIds = new Set(allCurrentSets.map(s => s.id));

    const removedGroupIds = originalGroups.filter(g => !currentGroupIds.has(g.id)).map(g => g.id);
    const removedItemIds = allOriginalItems.filter(i => !currentItemIds.has(i.id)).map(i => i.id);
    const removedSetIds = allOriginalSets.filter(s => !currentSetIds.has(s.id)).map(s => s.id);

    await mutations.saveSession({
      sessionId,
      name: editName,
      dayNumber: editDayNumber,
      notes: editNotes,
      groups,
      items: allCurrentItems,
      sets: allCurrentSets,
      removedGroupIds,
      removedItemIds,
      removedSetIds
    });

    toast({ title: t('unsavedChanges.saved') });
  }, [sessionId, editName, editDayNumber, editNotes, groups, items, sets, originalGroups, originalItems, originalSets, mutations, toast, t]);

  const discardAll = useCallback(() => {
    if (originalSessionProps) {
      setEditName(originalSessionProps.name);
      setEditDayNumber(originalSessionProps.dayNumber);
      setEditNotes(originalSessionProps.notes);
    }
    setAll(originalGroups, originalItems, originalSets);
    toast({ title: t('unsavedChanges.discarded') });
  }, [originalSessionProps, originalGroups, originalItems, originalSets, setAll, toast, t]);

  const { isNavigationBlocked, confirmSaveAndLeave, confirmLeaveWithout, cancelNavigation } =
    useUnsavedChanges({ isDirty, onSave: saveAll, onDiscard: discardAll });

  if (isLoading) return <DetailPageSkeleton />;

  return (
    <div className="space-y-6 pb-20">
      <SessionDetailHeader
        workoutId={workoutId!}
        editName={editName}
        editDayNumber={editDayNumber}
        onEdit={() => setIsEditDialogOpen(true)}
      />

      <SessionDetailPropertiesDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialName={editName}
        initialDayNumber={editDayNumber}
        initialNotes={editNotes}
        onSave={(updates) => {
          setEditName(updates.name);
          setEditDayNumber(updates.dayNumber);
          setEditNotes(updates.notes);
        }}
      />

      <SessionVolumeDialog
        sessionName={data?.session.name ?? ''}
        groups={groups}
        items={items}
        sets={sets}
        exercises={exercises}
        open={volumeOpen}
        onOpenChange={setVolumeOpen}
      />

      {/* Groups */}
      <div className="flex items-center justify-between">
        <h2 className="text-h4 font-semibold">{t('planning.exerciseGroup')}</h2>
        <Button size="sm" onClick={addGroup}>
          <Plus className="mr-1 h-4 w-4" />
          {t('sessions.addGroup')}
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t('sessions.noGroups')}</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group, groupIdx) => (
            <div
              key={group.id}
            >
              <ExerciseGroupCard
                group={group}
                groupIndex={groupIdx}
                groupCount={groups.length}
                items={items[group.id] || []}
                sets={sets}
                exercises={exercises}
                isOpen={openGroups[group.id] ?? true}
                simpleMode={simpleMode}
                onToggle={() => setOpenGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                onUpdateGroup={updateGroup}
                onRemoveGroup={removeGroup}
                onMoveGroup={moveGroup}
                onAddItem={addExerciseItem}
                onRemoveItem={removeItem}
                onUpdateItem={updateItem}
                onMoveItem={moveItem}
                onAddSet={(itemId) => addPlannedSet(itemId, group.id)}
                onUpdateSet={updatePlannedSet}
                onRemoveSet={removePlannedSet}
                onUpdateItemClusterParams={updateItemClusterParams}
              />
            </div>
          ))}
        </div>
      )}

      {/* FAB — Volume Analysis */}
      <Button
        className="fixed z-40 h-12 w-12 rounded-full shadow-lg"
        style={{ bottom: 'calc(3.25rem + env(safe-area-inset-bottom) + 0.75rem)', right: '1rem' }}
        size="icon"
        onClick={() => setVolumeOpen(true)}
        title={t('analytics.volumeAnalysisTitle')}
      >
        <BarChart3 className="h-5 w-5" />
      </Button>

      {/* Unsaved changes bar */}
      <UnsavedChangesBar
        isDirty={isDirty}
        onSave={saveAll}
        onDiscard={discardAll}
        isNavigationBlocked={isNavigationBlocked}
        onConfirmSaveAndLeave={confirmSaveAndLeave}
        onConfirmLeaveWithout={confirmLeaveWithout}
        onCancelNavigation={cancelNavigation}
        fabRightOffset="4.75rem"
      />
    </div>
  );
}
