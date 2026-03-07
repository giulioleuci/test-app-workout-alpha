import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


import { describe, it, expect } from 'vitest';

import type { SessionSet } from '@/domain/entities';
import { SetType, ToFailureIndicator } from '@/domain/enums';
import type { FatigueProgressionProfile } from '@/domain/value-objects';
import {
  calculateExpectedRPE,
  analyzeFatigueProgression,
} from '@/services/fatigueAnalyzer';

describe('fatigueAnalyzer', () => {
  const mockProfile: FatigueProgressionProfile = {
    expectedRPEIncrementPerSet: 0.5,
    tolerance: 0.5,
  };

  const createMockSet = (overrides: Partial<SessionSet> = {}): SessionSet => ({
    id: '1',
    sessionExerciseItemId: '1',
    setType: SetType.Working,
    orderIndex: generateTestRank(0),
    actualLoad: 100,
    actualCount: 10,
    actualRPE: 7,
    actualToFailure: ToFailureIndicator.None,
    expectedRPE: 7,
    isCompleted: true,
    isSkipped: false,
    partials: false,
    forcedReps: 0,
    ...overrides,
  } as SessionSet);

  describe('calculateExpectedRPE', () => {
    it('should return baselineRPE for the first set (index 0)', () => {
      expect(calculateExpectedRPE(mockProfile, 7, 0)).toBe(7);
    });

    it('should calculate incremented RPE for subsequent sets', () => {
      expect(calculateExpectedRPE(mockProfile, 7, 1)).toBe(7.5);
      expect(calculateExpectedRPE(mockProfile, 7, 2)).toBe(8);
    });

    it('should handle different increments', () => {
      const aggressiveProfile = { ...mockProfile, expectedRPEIncrementPerSet: 1.0 };
      expect(calculateExpectedRPE(aggressiveProfile, 7, 1)).toBe(8);
    });

    it('should cap the result at RPE 10', () => {
      expect(calculateExpectedRPE(mockProfile, 9.5, 2)).toBe(10);
      expect(calculateExpectedRPE(mockProfile, 10, 1)).toBe(10);
    });

    it('should use default increment of 1 if profile increment is 0 or undefined', () => {
      const emptyProfile = { expectedRPEIncrementPerSet: 0, tolerance: 0.5 } as any;
      expect(calculateExpectedRPE(emptyProfile, 7, 1)).toBe(8);
      expect(calculateExpectedRPE(emptyProfile, 7, 2)).toBe(9);
    });
  });

  describe('analyzeFatigueProgression', () => {
    it('should return notApplicable if profile is missing', () => {
      const result = analyzeFatigueProgression([], 0, undefined, 7);
      expect(result.status).toBe('notApplicable');
    });

    it('should return notApplicable if baselineRPE is missing', () => {
      const result = analyzeFatigueProgression([], 0, mockProfile, undefined);
      expect(result.status).toBe('notApplicable');
    });

    it('should return optimal when actual RPE matches expected for the first set', () => {
      const sets = [createMockSet({ actualRPE: 7 })];
      const result = analyzeFatigueProgression(sets, 0, mockProfile, 7);
      expect(result.status).toBe('optimal');
      expect(result.deviation).toBe(0);
      expect(result.expectedRPE).toBe(7);
    });

    it('should return optimal if within tolerance', () => {
      const sets = [createMockSet({ actualRPE: 7.5 })];
      const result = analyzeFatigueProgression(sets, 0, mockProfile, 7);
      expect(result.status).toBe('optimal');
      expect(result.deviation).toBe(0.5);
    });

    it('should return tooFast if above tolerance', () => {
      const sets = [createMockSet({ actualRPE: 8 })];
      const result = analyzeFatigueProgression(sets, 0, mockProfile, 7);
      expect(result.status).toBe('tooFast');
      expect(result.deviation).toBe(1);
    });

    it('should return tooSlow if below tolerance', () => {
      const sets = [createMockSet({ actualRPE: 6 })];
      const result = analyzeFatigueProgression(sets, 0, mockProfile, 7);
      expect(result.status).toBe('tooSlow');
      expect(result.deviation).toBe(-1);
    });

    it('should calculate rpeClimbPerSet correctly for subsequent sets', () => {
      const sets = [
        createMockSet({ actualRPE: 7, orderIndex: generateTestRank(0) }),
        createMockSet({ actualRPE: 8, orderIndex: generateTestRank(1) }),
      ];
      const result = analyzeFatigueProgression(sets, 1, mockProfile, 7);
      expect(result.rpeClimbPerSet).toBe(1);
      expect(result.expectedRPE).toBe(7.5);
      expect(result.deviation).toBe(0.5);
      expect(result.status).toBe('optimal');
    });

    it('should handle null actualRPE', () => {
      const sets = [createMockSet({ actualRPE: null })];
      const result = analyzeFatigueProgression(sets, 0, mockProfile, 7);
      expect(result.status).toBe('optimal');
      expect(result.actualRPE).toBeNull();
      expect(result.deviation).toBeNull();
    });
  });
});
