import { describe, it, expect } from 'vitest';

import { compareExercisePerformance as compareItems } from '@/application/exercisePerformance';
import type { SessionSet } from '@/domain/entities';
import { SetType, ToFailureIndicator } from '@/domain/enums';

// ─── helpers ──────────────────────────────────────────────────────────────────

const rank = '0|aaaaaa:';

const makeSet = (overrides: Partial<SessionSet> = {}): SessionSet => ({
  id: 's1',
  sessionExerciseItemId: 'i1',
  setType: SetType.Working,
  orderIndex: rank,
  actualLoad: 100,
  actualCount: 10,
  actualRPE: 7,
  actualToFailure: ToFailureIndicator.None,
  expectedRPE: null,
  isCompleted: true,
  isSkipped: false,
  partials: false,
  forcedReps: 0,
  ...overrides,
});

const effectiveSets = (count: number, overrides: Partial<SessionSet> = {}): SessionSet[] =>
  Array.from({ length: count }, (_, i) => makeSet({ id: `s${i}`, ...overrides }));

// ─── insufficient_data ────────────────────────────────────────────────────────

describe('compareItems — insufficient_data', () => {
  it('returns insufficient_data when current effective sets are empty', () => {
    const prev = effectiveSets(2);
    expect(compareItems([], prev)).toBe('insufficient_data');
  });

  it('returns insufficient_data when previous effective sets are empty', () => {
    const curr = effectiveSets(2);
    expect(compareItems(curr, [])).toBe('insufficient_data');
  });

  it('treats skipped sets as non-effective', () => {
    const curr = [makeSet({ isSkipped: true })];
    const prev = effectiveSets(1);
    expect(compareItems(curr, prev)).toBe('insufficient_data');
  });

  it('treats incomplete sets as non-effective', () => {
    const curr = [makeSet({ isCompleted: false })];
    const prev = effectiveSets(1);
    expect(compareItems(curr, prev)).toBe('insufficient_data');
  });
});

// ─── improving ───────────────────────────────────────────────────────────────

describe('compareItems — improving', () => {
  it('returns improving when more sets performed', () => {
    const prev = effectiveSets(2, { actualLoad: 100, actualCount: 10 });
    const curr = effectiveSets(3, { actualLoad: 100, actualCount: 10 });
    expect(compareItems(curr, prev)).toBe('improving');
  });

  it('returns improving when more reps performed', () => {
    const prev = effectiveSets(3, { actualLoad: 100, actualCount: 8 });
    const curr = effectiveSets(3, { actualLoad: 100, actualCount: 10 });
    expect(compareItems(curr, prev)).toBe('improving');
  });

  it('returns improving when higher total load (sets × load)', () => {
    const prev = effectiveSets(3, { actualLoad: 100, actualCount: 10 });
    const curr = effectiveSets(3, { actualLoad: 110, actualCount: 10 });
    expect(compareItems(curr, prev)).toBe('improving');
  });

  it('returns improving when volume unchanged but RPE decreased', () => {
    const prev = effectiveSets(3, { actualLoad: 100, actualCount: 10, actualRPE: 8 });
    const curr = effectiveSets(3, { actualLoad: 100, actualCount: 10, actualRPE: 7 });
    expect(compareItems(curr, prev)).toBe('improving');
  });
});

// ─── deteriorating ───────────────────────────────────────────────────────────

describe('compareItems — deteriorating', () => {
  it('returns deteriorating when fewer sets performed', () => {
    const prev = effectiveSets(3, { actualLoad: 100, actualCount: 10 });
    const curr = effectiveSets(2, { actualLoad: 100, actualCount: 10 });
    expect(compareItems(curr, prev)).toBe('deteriorating');
  });

  it('returns deteriorating when fewer reps performed', () => {
    const prev = effectiveSets(3, { actualLoad: 100, actualCount: 10 });
    const curr = effectiveSets(3, { actualLoad: 100, actualCount: 8 });
    expect(compareItems(curr, prev)).toBe('deteriorating');
  });

  it('returns deteriorating when volume unchanged but RPE increased', () => {
    const prev = effectiveSets(3, { actualLoad: 100, actualCount: 10, actualRPE: 7 });
    const curr = effectiveSets(3, { actualLoad: 100, actualCount: 10, actualRPE: 8 });
    expect(compareItems(curr, prev)).toBe('deteriorating');
  });
});

// ─── stable ──────────────────────────────────────────────────────────────────

describe('compareItems — stable', () => {
  it('returns stable when everything is identical', () => {
    const sets = effectiveSets(3, { actualLoad: 100, actualCount: 10, actualRPE: 7 });
    const curr = JSON.parse(JSON.stringify(sets)) as SessionSet[];
    expect(compareItems(curr, sets)).toBe('stable');
  });

  it('returns stable for mixed improvements and declines (more sets but less volume)', () => {
    // prev: 3 sets × 10 reps × 100kg = 3000 total volume, 30 total reps
    const prev = effectiveSets(3, { actualLoad: 100, actualCount: 10 });
    // curr: 4 sets × 5 reps × 80kg = 1600 total volume, 20 total reps
    // dS = +1 (up), dC = -10 (down), dL = -1400 (down)
    // Not pure improving (dC<0, dL<0), not pure deteriorating (dS>0) → default stable
    const curr = effectiveSets(4, { actualLoad: 80, actualCount: 5 });
    expect(compareItems(curr, prev)).toBe('stable');
  });
});

// ─── stagnant ────────────────────────────────────────────────────────────────

describe('compareItems — stagnant', () => {
  it('returns stagnant when stable with range constraint and prev status = stable', () => {
    const sets = effectiveSets(3, { actualLoad: 100, actualCount: 10, actualRPE: 7 });
    const curr = JSON.parse(JSON.stringify(sets)) as SessionSet[];
    expect(compareItems(curr, sets, 'stable', true)).toBe('stagnant');
  });

  it('returns stagnant when stable with range constraint and prev status = stagnant', () => {
    const sets = effectiveSets(3, { actualLoad: 100, actualCount: 10, actualRPE: 7 });
    const curr = JSON.parse(JSON.stringify(sets)) as SessionSet[];
    expect(compareItems(curr, sets, 'stagnant', true)).toBe('stagnant');
  });

  it('returns stable (not stagnant) when range constraint is false even if prev was stable', () => {
    const sets = effectiveSets(3, { actualLoad: 100, actualCount: 10, actualRPE: 7 });
    const curr = JSON.parse(JSON.stringify(sets)) as SessionSet[];
    expect(compareItems(curr, sets, 'stable', false)).toBe('stable');
  });

  it('returns stable (not stagnant) when range constraint is true but prev status is improving', () => {
    const sets = effectiveSets(3, { actualLoad: 100, actualCount: 10, actualRPE: 7 });
    const curr = JSON.parse(JSON.stringify(sets)) as SessionSet[];
    expect(compareItems(curr, sets, 'improving', true)).toBe('stable');
  });
});
