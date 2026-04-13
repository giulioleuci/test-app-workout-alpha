import { nanoid } from 'nanoid';

import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type {
  SessionTemplateContent,
  PlannedSession,
  PlannedExerciseGroup,
  PlannedExerciseItem,
  PlannedSet
} from '@/domain/entities';
import { PlannedSessionStatus } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

/**
 * Deep-clone a planned session (with all groups, items, sets) into a target workout.
 * Returns the new session ID.
 */
export async function cloneSession(
  sourceSessionId: string,
  targetWorkoutId: string,
): Promise<string> {
  const sourceSession = await WorkoutPlanRepository.getHydratedPlannedSession(sourceSessionId);
  if (!sourceSession) throw new Error(`Session ${sourceSessionId} not found`);

  const existingSessionCount = await WorkoutPlanRepository.getSessionCountByWorkout(targetWorkoutId);

  const now = dayjs().toDate();
  const newSessionId = nanoid();

  const newSession: PlannedSession = {
    ...sourceSession.session,
    id: newSessionId,
    plannedWorkoutId: targetWorkoutId,
    name: `${sourceSession.session.name} (copia)`,
    dayNumber: existingSessionCount + 1,
    orderIndex: existingSessionCount,
    status: PlannedSessionStatus.Pending,
    createdAt: now,
    updatedAt: now,
  };

  const newGroups: PlannedExerciseGroup[] = [];
  const newItems: PlannedExerciseItem[] = [];
  const newSets: PlannedSet[] = [];

  for (const groupData of sourceSession.groups) {
    const newGroupId = nanoid();
    newGroups.push({
      ...groupData.group,
      id: newGroupId,
      plannedSessionId: newSessionId,
    });

    for (const itemData of groupData.items) {
      const newItemId = nanoid();
      newItems.push({
        ...itemData.item,
        id: newItemId,
        plannedExerciseGroupId: newGroupId,
      });

      for (const set of itemData.sets) {
        newSets.push({
          ...set,
          id: nanoid(),
          plannedExerciseItemId: newItemId,
        });
      }
    }
  }

  await WorkoutPlanRepository.saveFullSession(newSession, newGroups, newItems, newSets);
  return newSessionId;
}

/**
 * Serialize a planned session into SessionTemplateContent for saving as a template.
 */
export async function serializeSessionToTemplate(sessionId: string): Promise<SessionTemplateContent> {
  const sessionData = await WorkoutPlanRepository.getHydratedPlannedSession(sessionId);
  if (!sessionData) throw new Error(`Session ${sessionId} not found`);

  const content: SessionTemplateContent = {
    focusMuscleGroups: sessionData.session.focusMuscleGroups,
    notes: sessionData.session.notes,
    groups: [],
  };

  // Hydrated session groups are already sorted by orderIndex
  for (const groupData of sessionData.groups) {
    const groupContent: SessionTemplateContent['groups'][number] = {
      groupType: groupData.group.groupType,
      restBetweenRoundsSeconds: groupData.group.restBetweenRoundsSeconds,
      orderIndex: groupData.group.orderIndex,
      notes: groupData.group.notes,
      items: [],
    };

    // Hydrated items are already sorted
    for (const itemData of groupData.items) {
      // Hydrated sets are already sorted
      const setContents = itemData.sets.map(({ id: _id, plannedExerciseItemId: _plannedExerciseItemId, ...rest }) => rest);

      groupContent.items.push({
        exerciseId: itemData.item.exerciseId,
        counterType: itemData.item.counterType,
        modifiers: itemData.item.modifiers,
        orderIndex: itemData.item.orderIndex,
        notes: itemData.item.notes,
        sets: setContents,
      });
    }

    content.groups.push(groupContent);
  }

  return content;
}

/**
 * Import a session template into a workout, creating all entities with new IDs.
 * Returns the new session ID.
 */
export async function importTemplateToWorkout(
  template: { name: string; content: SessionTemplateContent },
  targetWorkoutId: string,
): Promise<string> {
  const existingSessionCount = await WorkoutPlanRepository.getSessionCountByWorkout(targetWorkoutId);

  const now = dayjs().toDate();
  const newSessionId = nanoid();

  const newSession: PlannedSession = {
    id: newSessionId,
    plannedWorkoutId: targetWorkoutId,
    name: template.name,
    dayNumber: existingSessionCount + 1,
    focusMuscleGroups: template.content.focusMuscleGroups,
    status: PlannedSessionStatus.Pending,
    notes: template.content.notes,
    orderIndex: existingSessionCount,
    createdAt: now,
    updatedAt: now,
  };

  const newGroups: PlannedExerciseGroup[] = [];
  const newItems: PlannedExerciseItem[] = [];
  const newSets: PlannedSet[] = [];

  for (const group of template.content.groups) {
    const newGroupId = nanoid();
    newGroups.push({
      id: newGroupId,
      plannedSessionId: newSessionId,
      groupType: group.groupType,
      restBetweenRoundsSeconds: group.restBetweenRoundsSeconds,
      orderIndex: group.orderIndex,
      notes: group.notes,
    });

    for (const item of group.items) {
      const newItemId = nanoid();
      newItems.push({
        id: newItemId,
        plannedExerciseGroupId: newGroupId,
        exerciseId: item.exerciseId,
        counterType: item.counterType,
        modifiers: item.modifiers,
        orderIndex: item.orderIndex,
        notes: item.notes,
      });

      for (const set of item.sets) {
        newSets.push({
          ...set,
          id: nanoid(),
          plannedExerciseItemId: newItemId,
        });
      }
    }
  }

  await WorkoutPlanRepository.saveFullSession(newSession, newGroups, newItems, newSets);
  return newSessionId;
}
