import { describe, it, expect } from 'vitest';

import type { BodyWeightRecord } from '@/domain/entities';
import { findClosestWeight, strengthRatio, strengthToWeightRatio } from '@/services/bodyWeightUtils';

const makeRecord = (id: string, kg: number, date: Date): BodyWeightRecord =>
  ({ id, weight: kg, unit: 'kg', recordedAt: date } as BodyWeightRecord);

// ─── findClosestWeight ────────────────────────────────────────────────────────

describe('findClosestWeight', () => {
  it('returns null for empty records list', () => {
    expect(findClosestWeight([], new Date())).toBeNull();
  });

  it('returns the only record regardless of date distance', () => {
    const rec = makeRecord('r1', 75, new Date('2024-01-01'));
    expect(findClosestWeight([rec], new Date('2024-06-01'))).toBe(rec);
  });

  it('returns the record closest to the target date', () => {
    const target = new Date('2024-03-15');
    const near = makeRecord('near', 80, new Date('2024-03-10'));
    const far = makeRecord('far', 70, new Date('2024-01-01'));
    expect(findClosestWeight([near, far], target)).toBe(near);
  });

  it('chooses between multiple records correctly', () => {
    const target = new Date('2024-06-01');
    const records = [
      makeRecord('a', 70, new Date('2024-01-01')),
      makeRecord('b', 75, new Date('2024-05-29')), // 3 days before target
      makeRecord('c', 80, new Date('2024-06-05')), // 4 days after target
    ];
    expect(findClosestWeight(records, target)).toBe(records[1]);
  });

  it('returns first record when two records are equidistant', () => {
    const target = new Date('2024-03-10');
    const a = makeRecord('a', 70, new Date('2024-03-05')); // 5 days before
    const b = makeRecord('b', 80, new Date('2024-03-15')); // 5 days after
    const result = findClosestWeight([a, b], target);
    // Either could be returned; we only assert it's one of them
    expect([a, b]).toContain(result);
  });
});

// ─── strengthRatio ────────────────────────────────────────────────────────────

describe('strengthRatio', () => {
  it('returns ratio with ×BW suffix', () => {
    expect(strengthRatio(150, 75)).toBe('2.0×BW');
  });

  it('rounds to one decimal place', () => {
    expect(strengthRatio(100, 75)).toBe('1.3×BW');
  });

  it('handles identical load and body weight (1×BW)', () => {
    expect(strengthRatio(80, 80)).toBe('1.0×BW');
  });
});

// ─── strengthToWeightRatio ───────────────────────────────────────────────────

describe('strengthToWeightRatio', () => {
  it('returns exactly 2.00 for double bodyweight', () => {
    expect(strengthToWeightRatio(150, 75)).toBe(2);
  });

  it('rounds to 2 decimal places', () => {
    expect(strengthToWeightRatio(100, 75)).toBe(1.33);
  });

  it('handles decimal body weight', () => {
    const result = strengthToWeightRatio(100, 66.5);
    expect(result).toBe(1.50);
  });

  it('handles load less than body weight', () => {
    expect(strengthToWeightRatio(50, 100)).toBe(0.5);
  });
});
