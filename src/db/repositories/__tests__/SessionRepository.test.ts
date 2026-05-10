import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import { db } from '@/db/database';
import type { WorkoutSession, SessionExerciseGroup, SessionExerciseItem, SessionSet } from '@/domain/entities';
import { ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';

import { SessionRepository } from '../SessionRepository';


describe('SessionRepository', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });

  const createSession = (): WorkoutSession => ({
    id: nanoid(),
    startedAt: new Date(),
  });

  it('creates and retrieves a session', async () => {
    const session = createSession();
    await SessionRepository.createSession(session);

    const retrieved = await SessionRepository.getSession(session.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(session.id);
  });

  it('cascading delete removes groups, items, and sets', async () => {
    const session = createSession();
    await SessionRepository.createSession(session);

    const group: SessionExerciseGroup = {
      id: nanoid(),
      workoutSessionId: session.id,
      groupType: ExerciseGroupType.Standard,
      orderIndex: generateTestRank(0),
      isCompleted: false,
    };
    await SessionRepository.addGroup(group);

    const item: SessionExerciseItem = {
      id: nanoid(),
      sessionExerciseGroupId: group.id,
      exerciseId: 'ex1',
      orderIndex: generateTestRank(0),
      isCompleted: false,
    };
    await SessionRepository.addItem(item);

    const set: SessionSet = {
      id: nanoid(),
      sessionExerciseItemId: item.id,
      setType: SetType.Working,
      orderIndex: generateTestRank(0),
      actualLoad: 100,
      actualCount: 5,
      actualRPE: 8,
      actualToFailure: ToFailureIndicator.None,
      expectedRPE: 8,
      isCompleted: true,
      isSkipped: false,
      partials: false,
      forcedReps: 0,
    };
    await SessionRepository.addSets([set]);

    // Verify creation
    expect(await SessionRepository.getSession(session.id)).toBeDefined();
    expect((await SessionRepository.getGroupsBySession(session.id)).length).toBe(1);
    expect((await SessionRepository.getItemsByGroup(group.id)).length).toBe(1);
    expect((await SessionRepository.getSetsByItem(item.id)).length).toBe(1);

    // Perform delete
    await SessionRepository.deleteSessionCascade(session.id);

    // Verify deletion
    expect(await SessionRepository.getSession(session.id)).toBeUndefined();
    expect((await SessionRepository.getGroupsBySession(session.id)).length).toBe(0);
    expect((await SessionRepository.getItemsByGroup(group.id)).length).toBe(0);
    expect((await SessionRepository.getSetsByItem(item.id)).length).toBe(0);
  });

  it('finds active session', async () => {
    const s1 = createSession();
    s1.completedAt = new Date();
    await SessionRepository.createSession(s1);

    const s2 = createSession();
    await SessionRepository.createSession(s2);

    const active = await SessionRepository.findActiveSession();
    expect(active?.id).toBe(s2.id);
  });

  it('rejects createSession() when id is empty', async () => {
    const session = { ...createSession(), id: '' };
    await expect(SessionRepository.createSession(session)).rejects.toThrow('Repository validation failed');
  });

  it('rejects updateSet() when forcedReps is negative', async () => {
    await expect(
      SessionRepository.updateSet('any-id', { forcedReps: -1 })
    ).rejects.toThrow('Repository validation failed');
  });
});
