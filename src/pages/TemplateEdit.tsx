import { useEffect, useState, useMemo } from 'react';

import { Plus } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import type { SessionTemplateContent, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet, Exercise } from '@/domain/entities';
import { useWorkoutMutations } from '@/hooks/mutations/workoutMutations';
import { useTemplateDetail } from '@/hooks/queries/workoutQueries';
import { usePlanEditor } from '@/hooks/usePlanEditor';
import { useToast } from '@/hooks/useToast';

import TemplateEditPropertiesDialog from './TemplateEdit/components/TemplateEditPropertiesDialog';
import TemplateGroupCard from './TemplateEdit/components/TemplateGroupCard';
import TemplateHeader from './TemplateEdit/components/TemplateHeader';

export default function TemplateEdit() {
  const { t } = useTranslation();
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, isLoading } = useTemplateDetail(templateId);
  const mutations = useWorkoutMutations();

  const {
    groups, items, sets,
    setAll,
    addGroup: addGroupCRUD,
    removeGroup, updateGroup, moveGroup,
    addItem: addItemCRUD,
    removeItem, updateItem, moveItem,
    addSet: addSetCRUD,
    updateSet: updatePlannedSet, removeSet: removePlannedSet
  } = usePlanEditor({ plannedSessionId: '__template__' });

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateNotes, setTemplateNotes] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [simpleMode, setSimpleMode] = useState(false);

  // Snapshot for dirty tracking
  const [snapshot, setSnapshot] = useState('');
  const currentState = useMemo(() => JSON.stringify({ templateName, templateDescription, templateNotes, groups, items, sets }), [templateName, templateDescription, templateNotes, groups, items, sets]);
  const isDirty = snapshot !== '' && currentState !== snapshot;

  useEffect(() => {
    if (data) {
      const { template: tpl, exercises: exs, simpleMode: sm } = data;
      setTemplateName(tpl.name);
      setTemplateDescription(tpl.description ?? '');
      setTemplateNotes(tpl.content.notes ?? '');
      setExercises(exs);
      setSimpleMode(sm);

      // Materialize content into in-memory entities
      const materializedGroups: PlannedExerciseGroup[] = [];
      const materializedItems: Record<string, PlannedExerciseItem[]> = {};
      const materializedSets: Record<string, PlannedSet[]> = {};
      const opens: Record<string, boolean> = {};

      for (const g of tpl.content.groups) {
        const groupId = nanoid();
        materializedGroups.push({
          id: groupId,
          plannedSessionId: '__template__',
          groupType: g.groupType,
          restBetweenRoundsSeconds: g.restBetweenRoundsSeconds,
          orderIndex: g.orderIndex,
          notes: g.notes,
        });
        opens[groupId] = true;
        materializedItems[groupId] = [];

        for (const item of g.items) {
          const itemId = nanoid();
          materializedItems[groupId].push({
            id: itemId,
            plannedExerciseGroupId: groupId,
            exerciseId: item.exerciseId,
            counterType: item.counterType,
            modifiers: item.modifiers,
            orderIndex: item.orderIndex,
            notes: item.notes,
          });
          materializedSets[itemId] = item.sets.map(s => ({
            ...s,
            id: nanoid(),
            plannedExerciseItemId: itemId,
          }));
        }
      }

      setAll(materializedGroups, materializedItems, materializedSets);
      setOpenGroups(opens);

      // Set snapshot immediately — this is stable data from DB
      setSnapshot(JSON.stringify({
        templateName: tpl.name,
        templateDescription: tpl.description ?? '',
        templateNotes: tpl.content.notes ?? '',
        groups: materializedGroups,
        items: materializedItems,
        sets: materializedSets,
      }));
    }
  }, [data, setAll]);

  // ===== In-memory CRUD =====
  const addGroup = () => {
    const newGroup = addGroupCRUD();
    setOpenGroups(prev => ({ ...prev, [newGroup.id]: true }));
  };

  const addExerciseItem = (groupId: string, exerciseId: string) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    addItemCRUD(groupId, exercise);
  };

  const addPlannedSet = (itemId: string) => {
    addSetCRUD(itemId);
  };

  // ===== Save =====
  const handleSave = async () => {
    if (!data || !templateId) return;

    const content: SessionTemplateContent = {
      focusMuscleGroups: data.template.content.focusMuscleGroups,
      notes: templateNotes.trim() || undefined,
      groups: groups.map(g => ({
        groupType: g.groupType,
        restBetweenRoundsSeconds: g.restBetweenRoundsSeconds,
        orderIndex: g.orderIndex,
        notes: g.notes,
        items: (items[g.id] || []).map(item => ({
          exerciseId: item.exerciseId,
          counterType: item.counterType,
          modifiers: item.modifiers,
          orderIndex: item.orderIndex,
          notes: item.notes,
          sets: (sets[item.id] || []).map(({ id: _id, plannedExerciseItemId: _plannedExerciseItemId, ...rest }) => rest),
        })),
      })),
    };

    await mutations.updateTemplate({
      id: templateId,
      name: templateName.trim() || data.template.name,
      description: templateDescription.trim() || undefined,
      content,
    });

    toast({ title: t('sessions.templateUpdated') });
    navigate('/workouts');
  };

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">{t('common.loading')}</div>;

  return (
    <div className="space-y-6 pb-20">
      <TemplateHeader
        templateName={templateName}
        onEdit={() => setIsEditDialogOpen(true)}
      />

      <TemplateEditPropertiesDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialName={templateName}
        initialDescription={templateDescription}
        initialNotes={templateNotes}
        onSave={(updates) => {
          setTemplateName(updates.name);
          setTemplateDescription(updates.description);
          setTemplateNotes(updates.notes);
        }}
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
            <TemplateGroupCard
              key={group.id}
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
              onAddSet={addPlannedSet}
              onUpdateSet={updatePlannedSet}
              onRemoveSet={removePlannedSet}
            />
          ))}
        </div>
      )}

      {/* Save bar */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 flex justify-end gap-2 border-t bg-background p-3 md:bottom-0 md:left-56">
        <Button variant="outline" onClick={() => navigate('/workouts')}>
          {t('actions.cancel')}
        </Button>
        <Button onClick={handleSave} disabled={!isDirty && templateName === data.template.name}>
          {t('actions.save')}
        </Button>
      </div>
    </div>
  );
}
