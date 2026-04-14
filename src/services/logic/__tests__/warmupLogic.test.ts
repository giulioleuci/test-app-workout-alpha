import { describe, it, expect } from 'vitest';
import { buildWarmupScheme, type WarmupInput } from '../warmupLogic';

describe('buildWarmupScheme', () => {
  it('3 sets for high-stress compound (first for muscle)', () => {
    const input: WarmupInput = { exerciseType: 'compound_upper', isFirst: true, bodyWeightRatio: 1.2 };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(3);
    expect(sets[0].percent).toBe(50);
    expect(sets[1].percent).toBe(70);
    expect(sets[2].percent).toBe(85);
  });

  it('removes first set when not first for muscle', () => {
    const input: WarmupInput = { exerciseType: 'compound_upper', isFirst: false, bodyWeightRatio: 1.2 };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(2);
    expect(sets[0].percent).toBe(70);
  });

  it('2 sets for medium-stress compound (first)', () => {
    const input: WarmupInput = { exerciseType: 'compound_upper', isFirst: true, bodyWeightRatio: 0.6 };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(2);
    expect(sets[0].percent).toBe(60);
    expect(sets[1].percent).toBe(80);
  });

  it('1 set for low-stress compound (first)', () => {
    const input: WarmupInput = { exerciseType: 'compound_upper', isFirst: true, bodyWeightRatio: 0.3 };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(1);
    expect(sets[0].percent).toBe(65);
  });

  it('2 sets for isolation, first for muscle', () => {
    const input: WarmupInput = { exerciseType: 'isolation', isFirst: true, bodyWeightRatio: null };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(2);
    expect(sets[0].percent).toBe(60);
    expect(sets[1].percent).toBe(80);
  });

  it('1 set for isolation, not first', () => {
    const input: WarmupInput = { exerciseType: 'isolation', isFirst: false, bodyWeightRatio: null };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(1);
    expect(sets[0].percent).toBe(60);
  });

  it('falls back to high stress when bodyWeightRatio is null', () => {
    const input: WarmupInput = { exerciseType: 'compound_lower', isFirst: true, bodyWeightRatio: null };
    const sets = buildWarmupScheme(input);
    expect(sets).toHaveLength(3);
  });
});
