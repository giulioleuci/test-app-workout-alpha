import { nanoid } from 'nanoid';

import type { SessionTemplateContent } from '@/domain/entities';
import { PlannedSessionStatus } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

import type { PlannedSessionAggregate, SessionTemplatePort } from './ports';

export class SessionTemplateUseCases {
  constructor(private readonly sessions: SessionTemplatePort) {}

  async cloneSession(sourceSessionId: string, targetWorkoutId: string): Promise<string> {
    const source = await this.sessions.getTemplateSource(sourceSessionId);
    if (!source) throw new Error(`Session ${sourceSessionId} not found`);

    const count = await this.sessions.getSessionCountByWorkout(targetWorkoutId);
    const now = dayjs().toDate();
    const sessionId = nanoid();
    const aggregate: PlannedSessionAggregate = {
      session: {
        ...source.session,
        id: sessionId,
        plannedWorkoutId: targetWorkoutId,
        name: `${source.session.name} (copia)`,
        dayNumber: count + 1,
        orderIndex: count,
        status: PlannedSessionStatus.Pending,
        createdAt: now,
        updatedAt: now,
      },
      groups: [],
      items: [],
      sets: [],
    };

    for (const groupSource of source.groups) {
      const groupId = nanoid();
      aggregate.groups.push({
        ...groupSource.group,
        id: groupId,
        plannedSessionId: sessionId,
      });

      for (const itemSource of groupSource.items) {
        const itemId = nanoid();
        aggregate.items.push({
          ...itemSource.item,
          id: itemId,
          plannedExerciseGroupId: groupId,
        });
        aggregate.sets.push(...itemSource.sets.map(set => ({
          ...set,
          id: nanoid(),
          plannedExerciseItemId: itemId,
        })));
      }
    }

    await this.sessions.saveSession(aggregate);
    return sessionId;
  }

  async serializeSessionToTemplate(sessionId: string): Promise<SessionTemplateContent> {
    const source = await this.sessions.getTemplateSource(sessionId);
    if (!source) throw new Error(`Session ${sessionId} not found`);

    return {
      focusMuscleGroups: source.session.focusMuscleGroups,
      notes: source.session.notes,
      groups: source.groups.map(groupSource => ({
        groupType: groupSource.group.groupType,
        restBetweenRoundsSeconds: groupSource.group.restBetweenRoundsSeconds,
        orderIndex: groupSource.group.orderIndex,
        notes: groupSource.group.notes,
        items: groupSource.items.map(itemSource => ({
          exerciseId: itemSource.item.exerciseId,
          counterType: itemSource.item.counterType,
          modifiers: itemSource.item.modifiers,
          orderIndex: itemSource.item.orderIndex,
          notes: itemSource.item.notes,
          sets: itemSource.sets.map(({ id: _id, plannedExerciseItemId: _itemId, ...set }) => set),
        })),
      })),
    };
  }

  async importTemplateToWorkout(
    template: { name: string; content: SessionTemplateContent },
    targetWorkoutId: string,
  ): Promise<string> {
    const count = await this.sessions.getSessionCountByWorkout(targetWorkoutId);
    const now = dayjs().toDate();
    const sessionId = nanoid();
    const aggregate: PlannedSessionAggregate = {
      session: {
        id: sessionId,
        plannedWorkoutId: targetWorkoutId,
        name: template.name,
        dayNumber: count + 1,
        focusMuscleGroups: template.content.focusMuscleGroups,
        status: PlannedSessionStatus.Pending,
        notes: template.content.notes,
        orderIndex: count,
        createdAt: now,
        updatedAt: now,
      },
      groups: [],
      items: [],
      sets: [],
    };

    for (const group of template.content.groups) {
      const groupId = nanoid();
      aggregate.groups.push({
        id: groupId,
        plannedSessionId: sessionId,
        groupType: group.groupType,
        restBetweenRoundsSeconds: group.restBetweenRoundsSeconds,
        orderIndex: group.orderIndex,
        notes: group.notes,
      });

      for (const item of group.items) {
        const itemId = nanoid();
        aggregate.items.push({
          id: itemId,
          plannedExerciseGroupId: groupId,
          exerciseId: item.exerciseId,
          counterType: item.counterType,
          modifiers: item.modifiers,
          orderIndex: item.orderIndex,
          notes: item.notes,
        });
        aggregate.sets.push(...item.sets.map(set => ({
          ...set,
          id: nanoid(),
          plannedExerciseItemId: itemId,
        })));
      }
    }

    await this.sessions.saveSession(aggregate);
    return sessionId;
  }
}
