import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import type { Exercise } from '@/domain/entities';
import { ExerciseGroupType, CounterType, ExerciseType, MovementPattern } from '@/domain/enums';
import { usePlanEditor } from '@/hooks/usePlanEditor';

const mockExercise: Exercise = {
  id: 'ex1',
  name: 'Push Up',
  type: ExerciseType.Compound,
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],
  movementPattern: MovementPattern.HorizontalPush,
  counterType: CounterType.Reps,
  defaultLoadUnit: 'kg',
  variantIds: [],
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('usePlanEditor', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePlanEditor());
    expect(result.current.groups).toEqual([]);
    expect(result.current.items).toEqual({});
    expect(result.current.sets).toEqual({});
  });

  it('should add a group', () => {
    const { result } = renderHook(() => usePlanEditor());

    act(() => {
      result.current.addGroup();
    });

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].groupType).toBe(ExerciseGroupType.Standard);
    expect(result.current.items[result.current.groups[0].id]).toEqual([]);
  });

  it('should remove a group', () => {
    const { result } = renderHook(() => usePlanEditor());

    let groupId = '';
    act(() => {
      const group = result.current.addGroup();
      groupId = group.id;
    });

    expect(result.current.groups).toHaveLength(1);

    act(() => {
      result.current.removeGroup(groupId);
    });

    expect(result.current.groups).toHaveLength(0);
    expect(result.current.items[groupId]).toBeUndefined();
  });

  it('should add an item to a group', () => {
    const { result } = renderHook(() => usePlanEditor());

    let groupId = '';
    act(() => {
      const group = result.current.addGroup();
      groupId = group.id;
    });

    act(() => {
      result.current.addItem(groupId, mockExercise);
    });

    const items = result.current.items[groupId];
    expect(items).toHaveLength(1);
    expect(items[0].exerciseId).toBe(mockExercise.id);
    expect(result.current.sets[items[0].id]).toEqual([]);
  });

  it('should remove an item', () => {
    const { result } = renderHook(() => usePlanEditor());

    let groupId = '';
    act(() => {
      const group = result.current.addGroup();
      groupId = group.id;
    });

    act(() => {
      result.current.addItem(groupId, mockExercise);
    });

    const itemId = result.current.items[groupId][0].id;

    act(() => {
      result.current.removeItem(itemId);
    });

    expect(result.current.items[groupId]).toHaveLength(0);
    expect(result.current.sets[itemId]).toBeUndefined();
  });

  it('should add a set to an item', () => {
    const { result } = renderHook(() => usePlanEditor());

    let groupId = '';
    act(() => {
      const group = result.current.addGroup();
      groupId = group.id;
    });

    act(() => {
      result.current.addItem(groupId, mockExercise);
    });

    const itemId = result.current.items[groupId][0].id;

    act(() => {
      result.current.addSet(itemId, groupId);
    });

    expect(result.current.sets[itemId]).toHaveLength(1);
    expect(result.current.sets[itemId][0].plannedExerciseItemId).toBe(itemId);
  });

  it('should update a set', () => {
    const { result } = renderHook(() => usePlanEditor());

    let groupId = '';
    act(() => {
      const group = result.current.addGroup();
      groupId = group.id;
    });

    act(() => {
      result.current.addItem(groupId, mockExercise);
    });

    const itemId = result.current.items[groupId][0].id;

    act(() => {
      result.current.addSet(itemId, groupId);
    });

    const setId = result.current.sets[itemId][0].id;

    act(() => {
      result.current.updateSet(setId, { notes: 'Updated note' });
    });

    expect(result.current.sets[itemId][0].notes).toBe('Updated note');
  });

  it('should move a group', () => {
    const { result } = renderHook(() => usePlanEditor());

    act(() => {
      result.current.addGroup(); // Index 0
      result.current.addGroup(); // Index 1
    });

    const group0Id = result.current.groups[0].id;
    const group1Id = result.current.groups[1].id;
    const originalOrder0 = result.current.groups[0].orderIndex;
    const originalOrder1 = result.current.groups[1].orderIndex;

    act(() => {
      result.current.moveGroup(0, 1); // Move 0 down
    });

    expect(result.current.groups[0].id).toBe(group1Id);
    expect(result.current.groups[1].id).toBe(group0Id);
    expect(result.current.groups[0].orderIndex).toBe(originalOrder0); // The object at index 0 (which was the old object 1) now has the old orderIndex 0
    expect(result.current.groups[1].orderIndex).toBe(originalOrder1); // The object at index 1 (which was the old object 0) now has the old orderIndex 1
  });
});
