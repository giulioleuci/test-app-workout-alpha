import { describe, expect, it, vi } from 'vitest';

import {
  SessionTemplateUseCases,
  type PlannedSessionAggregate,
  type PlannedSessionTemplateSource,
  type SessionTemplatePort,
} from '@/application/sessionTemplates';
import type { PlannedSet } from '@/domain/entities';
import {
  CounterType,
  ExerciseGroupType,
  PlannedSessionStatus,
  SetType,
} from '@/domain/enums';

const source: PlannedSessionTemplateSource = {
  session: {
    id: 'source-session', plannedWorkoutId: 'source-workout', name: 'Upper A', dayNumber: 2,
    focusMuscleGroups: [], status: PlannedSessionStatus.Active, orderIndex: 'b',
    createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-02'),
  },
  groups: [{
    group: { id: 'source-group', plannedSessionId: 'source-session', groupType: ExerciseGroupType.Standard, orderIndex: 'a' },
    items: [{
      item: {
        id: 'source-item', plannedExerciseGroupId: 'source-group', exerciseId: 'bench',
        counterType: CounterType.Reps, orderIndex: 'a',
      },
      sets: [{
        id: 'source-set', plannedExerciseItemId: 'source-item', setCountRange: { min: 3 },
        countRange: { min: 8, max: 8, toFailure: false }, setType: SetType.Working, orderIndex: 'a',
      } as PlannedSet],
    }],
  }],
};

function createPort(): { port: SessionTemplatePort; saved: PlannedSessionAggregate[] } {
  const saved: PlannedSessionAggregate[] = [];
  return {
    saved,
    port: {
      getTemplateSource: vi.fn((id: string) => Promise.resolve(id === source.session.id ? source : null)),
      getSessionCountByWorkout: vi.fn(() => Promise.resolve(3)),
      saveSession: vi.fn((aggregate: PlannedSessionAggregate) => {
        saved.push(aggregate);
        return Promise.resolve(aggregate.session.id);
      }),
    },
  };
}

describe('SessionTemplateUseCases', () => {
  it('clones the full aggregate through a port with fresh IDs and target-workout metadata', async () => {
    const { port, saved } = createPort();
    const useCases = new SessionTemplateUseCases(port);

    const sessionId = await useCases.cloneSession(source.session.id, 'target-workout');

    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual(expect.objectContaining({
      session: expect.objectContaining({
        id: sessionId, plannedWorkoutId: 'target-workout', name: 'Upper A (copia)',
        dayNumber: 4, orderIndex: 3, status: PlannedSessionStatus.Pending,
      }),
    }));
    expect(saved[0].groups[0]).toEqual(expect.objectContaining({ plannedSessionId: sessionId }));
    expect(saved[0].items[0]).toEqual(expect.objectContaining({
      plannedExerciseGroupId: saved[0].groups[0].id,
    }));
    expect(saved[0].sets[0]).toEqual(expect.objectContaining({
      plannedExerciseItemId: saved[0].items[0].id,
    }));
    expect(saved[0].sets[0].id).not.toBe(source.groups[0].items[0].sets[0].id);
  });

  it('serializes a session and imports its template as a new aggregate through the port', async () => {
    const { port, saved } = createPort();
    const useCases = new SessionTemplateUseCases(port);

    const template = await useCases.serializeSessionToTemplate(source.session.id);
    const sessionId = await useCases.importTemplateToWorkout({ name: 'Saved Upper', content: template }, 'target-workout');

    expect(template.groups[0].items[0].sets[0]).not.toHaveProperty('id');
    expect(saved[0].session).toEqual(expect.objectContaining({
      id: sessionId, plannedWorkoutId: 'target-workout', name: 'Saved Upper', dayNumber: 4,
    }));
    expect(saved[0].sets[0]).toEqual(expect.objectContaining({
      plannedExerciseItemId: saved[0].items[0].id, setType: SetType.Working,
    }));
  });
});
