import { describe, it, expect } from 'vitest';

import type { Exercise } from '@/domain/entities';
import { Muscle, Equipment, MovementPattern } from '@/domain/enums';
import { t } from '@/i18n/t';

// Replicate the logic to benchmark
const filterLogic = (exercises: Exercise[], search: string, filterEquipment: string, filterMuscle: string, filterMovement: string) => {
  const result = exercises.filter((e) => {
    const q = search.toLowerCase();
    const eqArray = Array.isArray(e.equipment) ? e.equipment : [e.equipment];
    const matchSearch = !search ||
      e.name.toLowerCase().includes(q) ||
      eqArray.some((eq) => t(`enums.equipment.${eq}`).toLowerCase().includes(q)) ||
      e.primaryMuscles.some((m) => t(`enums.muscle.${m}`).toLowerCase().includes(q));
    const matchEquip = filterEquipment === 'all' || eqArray.includes(filterEquipment as Equipment);
    const matchMuscle = filterMuscle === 'all' || e.primaryMuscles.includes(filterMuscle as Muscle);
    const matchMove = filterMovement === 'all' || (e.movementPattern as string) === filterMovement;
    return matchSearch && matchEquip && matchMuscle && matchMove;
  });
  result.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  return result;
};

// Optimized logic
const localizedMusclesLower = Object.entries(t('enums.muscle', { returnObjects: true })).reduce((acc, [k, v]) => {
  acc[k as Muscle] = (v).toLowerCase();
  return acc;
}, {} as Record<Muscle, string>);

const localizedEquipmentLower = Object.entries(t('enums.equipment', { returnObjects: true })).reduce((acc, [k, v]) => {
  acc[k as Equipment] = (v).toLowerCase();
  return acc;
}, {} as Record<Equipment, string>);

const optimizedFilterLogic = (exercises: Exercise[], search: string, filterEquipment: string, filterMuscle: string, filterMovement: string) => {
  const q = search.toLowerCase();
  const hasSearch = !!q;
  const isEquipAll = filterEquipment === 'all';
  const isMuscleAll = filterMuscle === 'all';
  const isMoveAll = filterMovement === 'all';

  const result = exercises.filter((e) => {
    // 1. Check simple filters first (fastest checks)
    if (!isMoveAll && (e.movementPattern as string) !== filterMovement) return false;

    // Muscle check
    if (!isMuscleAll && !e.primaryMuscles.includes(filterMuscle as Muscle)) return false;

    const eqArray = Array.isArray(e.equipment) ? e.equipment : [e.equipment];
    if (!isEquipAll && !eqArray.includes(filterEquipment as Equipment)) return false;

    // 2. Search check (most expensive)
    if (hasSearch) {
      // Name check first
      if (e.name.toLowerCase().includes(q)) return true;

      // Equipment name check
      if (eqArray.some((eq) => localizedEquipmentLower[eq]?.includes(q))) return true;

      // Muscle name check
      if (e.primaryMuscles.some((m) => localizedMusclesLower[m]?.includes(q))) return true;

      return false;
    }

    return true;
  });

  result.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  return result;
};

describe('ExercisePicker filtering benchmark', () => {
  // Generate large dataset
  const exercises: Exercise[] = [];
  for (let i = 0; i < 5000; i++) {
    exercises.push({
      id: `ex-${i}`,
      name: `Exercise ${i} - ${i % 2 === 0 ? 'Push' : 'Pull'}`,
      primaryMuscles: [Object.values(Muscle)[i % Object.values(Muscle).length]],
      equipment: [Object.values(Equipment)[i % Object.values(Equipment).length]],
      movementPattern: Object.values(MovementPattern)[i % Object.values(MovementPattern).length],
    } as Exercise);
  }

  it('benchmarks original logic', () => {
    const start = performance.now();
    // Run multiple times to average out
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      filterLogic(exercises, 'push', 'all', 'all', 'all');
      filterLogic(exercises, 'chest', 'all', 'all', 'all');
      filterLogic(exercises, 'barbell', 'all', 'all', 'all');
    }
    const end = performance.now();
    console.log(`Original logic total time (${iterations} iterations): ${(end - start).toFixed(2)}ms`);
    console.log(`Original logic avg time per search set: ${((end - start) / iterations).toFixed(2)}ms`);
  }, 60000);

  it('benchmarks optimized logic', () => {
    const start = performance.now();
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      optimizedFilterLogic(exercises, 'push', 'all', 'all', 'all');
      optimizedFilterLogic(exercises, 'chest', 'all', 'all', 'all');
      optimizedFilterLogic(exercises, 'barbell', 'all', 'all', 'all');
    }
    const end = performance.now();
    console.log(`Optimized logic total time (${iterations} iterations): ${(end - start).toFixed(2)}ms`);
    console.log(`Optimized logic avg time per search set: ${((end - start) / iterations).toFixed(2)}ms`);
  });

  it('verifies both logics produce same results', () => {
    const res1 = filterLogic(exercises, 'push', 'all', 'all', 'all');
    const res2 = optimizedFilterLogic(exercises, 'push', 'all', 'all', 'all');
    expect(res1.length).toBe(res2.length);
    expect(res1.map(e => e.id)).toEqual(res2.map(e => e.id));
  });
});
