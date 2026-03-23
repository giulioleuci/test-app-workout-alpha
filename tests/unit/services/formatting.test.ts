import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


import { describe, it, expect } from 'vitest';

import type { PlannedSet } from '@/domain/entities';
import { ToFailureIndicator, SetType } from '@/domain/enums';
import {
  formatLoadSummary,
  formatRpeSummary,
  formatRestSummary,
  formatPct1RMSummary,
  formatCompactSummary,
  formatSetSummary
} from '@/lib/formatting';

// Helper to create a partial PlannedSet
const createPlannedSet = (overrides: Partial<PlannedSet>): PlannedSet => {
  return {
    id: 'test-id',
    plannedExerciseItemId: 'item-id',
    setCountRange: { min: 3, max: 3 },
    countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
    setType: SetType.Working,
    
    orderIndex: generateTestRank(0),
    ...overrides
  } as PlannedSet;
};

describe('Formatting Utils', () => {
  describe('formatLoadSummary', () => {
    it('returns null when loadRange is missing', () => {
      const ps = createPlannedSet({});
      expect(formatLoadSummary(ps)).toBeNull();
    });

    it('formats single value load', () => {
      const ps = createPlannedSet({
        loadRange: { min: 100, max: 100, unit: 'kg' }
      });
      expect(formatLoadSummary(ps)).toBe('100kg');
    });

    it('formats load range', () => {
      const ps = createPlannedSet({
        loadRange: { min: 100, max: 110, unit: 'kg' }
      });
      expect(formatLoadSummary(ps)).toBe('100–110kg');
    });
  });

  describe('formatRpeSummary', () => {
    it('returns null when rpeRange is missing', () => {
      const ps = createPlannedSet({});
      expect(formatRpeSummary(ps)).toBeNull();
    });

    it('formats single RPE value', () => {
      const ps = createPlannedSet({
        rpeRange: { min: 8, max: 8 }
      });
      expect(formatRpeSummary(ps)).toBe('RPE 8');
    });

    it('formats RPE range', () => {
      const ps = createPlannedSet({
        rpeRange: { min: 7, max: 8 }
      });
      expect(formatRpeSummary(ps)).toBe('RPE 7–8');
    });
  });

  describe('formatRestSummary', () => {
    it('returns null when restSecondsRange is missing', () => {
      const ps = createPlannedSet({});
      expect(formatRestSummary(ps)).toBeNull();
    });

    it('formats single rest value', () => {
      const ps = createPlannedSet({
        restSecondsRange: { min: 60, max: 60, isFixed: true }
      });
      expect(formatRestSummary(ps)).toBe('60s');
    });

    it('formats rest range', () => {
      const ps = createPlannedSet({
        restSecondsRange: { min: 60, max: 90, isFixed: false }
      });
      expect(formatRestSummary(ps)).toBe('60–90s');
    });
  });

  describe('formatPct1RMSummary', () => {
    it('returns null when percentage1RMRange is missing', () => {
      const ps = createPlannedSet({});
      expect(formatPct1RMSummary(ps)).toBeNull();
    });

    it('formats single percentage value', () => {
      const ps = createPlannedSet({
        percentage1RMRange: { min: 0.8, max: 0.8, basedOnEstimated1RM: true }
      });
      expect(formatPct1RMSummary(ps)).toBe('80%1RM');
    });

    it('formats percentage range', () => {
      const ps = createPlannedSet({
        percentage1RMRange: { min: 0.75, max: 0.8, basedOnEstimated1RM: true }
      });
      expect(formatPct1RMSummary(ps)).toBe('75–80%1RM');
    });
  });

  describe('formatCompactSummary', () => {
    it('formats simple sets x reps', () => {
      const ps = createPlannedSet({
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None }
      });
      expect(formatCompactSummary(ps)).toBe('3x10');
    });

    it('formats set range', () => {
      const ps = createPlannedSet({
        setCountRange: { min: 3, max: 4 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None }
      });
      expect(formatCompactSummary(ps)).toBe('3-4x10');
    });

    it('formats rep range', () => {
      const ps = createPlannedSet({
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 8, max: 12, toFailure: ToFailureIndicator.None }
      });
      expect(formatCompactSummary(ps)).toBe('3x8-12');
    });

    it('formats to failure', () => {
      const ps = createPlannedSet({
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.TechnicalFailure }
      });
      expect(formatCompactSummary(ps)).toBe('3x10+');
    });

    it('formats everything combined', () => {
      const ps = createPlannedSet({
        setCountRange: { min: 3, max: 4 },
        countRange: { min: 8, max: 12, toFailure: ToFailureIndicator.AbsoluteFailure }
      });
      expect(formatCompactSummary(ps)).toBe('3-4x8-12+');
    });

    it('formats min only reps if max is missing', () => {
       const ps = createPlannedSet({
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 10, max: null, toFailure: ToFailureIndicator.None }
      });
      expect(formatCompactSummary(ps)).toBe('3x10');
    });
  });

  describe('formatSetSummary', () => {
    it('formats with load', () => {
      const ps = createPlannedSet({
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
        loadRange: { min: 50, max: 50, unit: 'kg' }
      });
      expect(formatSetSummary(ps)).toBe('3x10 @ 50kg');
    });

    it('formats with RPE', () => {
      const ps = createPlannedSet({
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
        rpeRange: { min: 8, max: 8 }
      });
      expect(formatSetSummary(ps)).toBe('3x10 @ RPE 8');
    });

    it('formats with %1RM', () => {
      const ps = createPlannedSet({
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
        percentage1RMRange: { min: 0.75, max: 0.75, basedOnEstimated1RM: true }
      });
      expect(formatSetSummary(ps)).toBe('3x10 @ 75%1RM');
    });

    it('prefers load over RPE', () => {
      const ps = createPlannedSet({
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None },
        loadRange: { min: 50, max: 50, unit: 'kg' },
        rpeRange: { min: 8, max: 8 }
      });
      expect(formatSetSummary(ps)).toBe('3x10 @ 50kg');
    });

    it('defaults to compact summary if no intensity', () => {
      const ps = createPlannedSet({
        setCountRange: { min: 3, max: 3 },
        countRange: { min: 10, max: 10, toFailure: ToFailureIndicator.None }
      });
      expect(formatSetSummary(ps)).toBe('3x10');
    });
  });
});
