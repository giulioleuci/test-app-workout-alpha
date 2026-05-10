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
import type { PlannedWorkout, PlannedSession, PlannedExerciseGroup, PlannedExerciseItem, PlannedSet } from '@/domain/entities';
import { ObjectiveType, WorkType, PlannedWorkoutStatus, PlannedSessionStatus, ExerciseGroupType, CounterType, SetType, ToFailureIndicator } from '@/domain/enums';

import { WorkoutPlanRepository } from '../WorkoutPlanRepository';


describe('WorkoutPlanRepository', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });

  const createWorkout = (): PlannedWorkout => ({
    id: nanoid(),
    name: 'Test Plan',
    objectiveType: ObjectiveType.Hypertrophy,
    workType: WorkType.Accumulation,
    status: PlannedWorkoutStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('cascading delete removes hierarchy', async () => {
    const workout = createWorkout();
    await WorkoutPlanRepository.addWorkout(workout);

    const session: PlannedSession = {
      id: nanoid(),
      plannedWorkoutId: workout.id,
      name: 'Session A',
      dayNumber: 1,
      focusMuscleGroups: [],
      status: PlannedSessionStatus.Pending,
      orderIndex: generateTestRank(0),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await WorkoutPlanRepository.addSession(session);

    const group: PlannedExerciseGroup = {
      id: nanoid(),
      plannedSessionId: session.id,
      groupType: ExerciseGroupType.Standard,
      orderIndex: generateTestRank(0),
    };
    await WorkoutPlanRepository.addGroup(group);

    const item: PlannedExerciseItem = {
      id: nanoid(),
      plannedExerciseGroupId: group.id,
      exerciseId: 'ex1',
      counterType: CounterType.Reps,
      orderIndex: generateTestRank(0),
    };
    await WorkoutPlanRepository.addItem(item);

    const set: PlannedSet = {
        id: nanoid(),
        plannedExerciseItemId: item.id,
        setCountRange: { min: 3 },
        countRange: { min: 8, max: 12, toFailure: ToFailureIndicator.None },
        setType: SetType.Working,
        orderIndex: generateTestRank(0),
    };
    await WorkoutPlanRepository.addSet(set);

    expect(await WorkoutPlanRepository.getWorkout(workout.id)).toBeDefined();
    expect(await WorkoutPlanRepository.getSession(session.id)).toBeDefined();

    await WorkoutPlanRepository.deleteWorkoutCascade(workout.id);

    expect(await WorkoutPlanRepository.getWorkout(workout.id)).toBeUndefined();
    expect(await WorkoutPlanRepository.getSession(session.id)).toBeUndefined();
    expect(await WorkoutPlanRepository.getGroup(group.id)).toBeUndefined();
    expect(await WorkoutPlanRepository.getItem(item.id)).toBeUndefined();
    expect(await WorkoutPlanRepository.getSet(set.id)).toBeUndefined();
  });

  it('rejects addWorkout() when name is empty', async () => {
    const workout = { ...createWorkout(), name: '' };
    await expect(WorkoutPlanRepository.addWorkout(workout)).rejects.toThrow('Repository validation failed');
  });

  it('rejects addSession() when name is empty', async () => {
    const workout = createWorkout();
    await WorkoutPlanRepository.addWorkout(workout);
    const session: PlannedSession = {
      id: nanoid(), plannedWorkoutId: workout.id, name: '',
      dayNumber: 1, focusMuscleGroups: [], status: PlannedSessionStatus.Pending,
      orderIndex: generateTestRank(0), createdAt: new Date(), updatedAt: new Date(),
    };
    await expect(WorkoutPlanRepository.addSession(session)).rejects.toThrow('Repository validation failed');
  });
});
