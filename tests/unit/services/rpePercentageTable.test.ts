import { describe, it, expect } from 'vitest';

import { getPercentage1RM, calculateWeighted1RM, suggestLoad } from '@/services/rpePercentageTable';

describe('RPE Percentage Table', () => {
  describe('getPercentage1RM', () => {
    it('should return correct percentage for valid reps and RPE (Sample Check)', () => {
      // Test exact matches from the table
      expect(getPercentage1RM(1, 10)).toBe(1.00);
      expect(getPercentage1RM(1, 9)).toBe(0.955);
      expect(getPercentage1RM(5, 8)).toBe(0.811);
      expect(getPercentage1RM(10, 7.5)).toBe(0.686);
      expect(getPercentage1RM(12, 6)).toBe(0.618);
    });

    it('should clamp reps to the range [1, 16]', () => {
      // Reps < 1 -> should correspond to Reps 1
      expect(getPercentage1RM(0, 10)).toBe(getPercentage1RM(1, 10));
      expect(getPercentage1RM(-5, 10)).toBe(getPercentage1RM(1, 10));

      // Reps > 16 -> should correspond to Reps 16
      expect(getPercentage1RM(17, 10)).toBe(getPercentage1RM(16, 10));
      expect(getPercentage1RM(100, 10)).toBe(getPercentage1RM(16, 10));
    });

    it('should round reps to the nearest integer', () => {
      // 1.4 rounds to 1
      expect(getPercentage1RM(1.4, 10)).toBe(getPercentage1RM(1, 10));
      // 1.6 rounds to 2
      expect(getPercentage1RM(1.6, 10)).toBe(getPercentage1RM(2, 10));
    });

    it('should clamp RPE to the range [4, 10]', () => {
      // RPE < 4 -> should correspond to RPE 4
      expect(getPercentage1RM(1, 0)).toBe(getPercentage1RM(1, 4));
      expect(getPercentage1RM(1, -5)).toBe(getPercentage1RM(1, 4));

      // RPE > 10 -> should correspond to RPE 10
      expect(getPercentage1RM(1, 11)).toBe(getPercentage1RM(1, 10));
      expect(getPercentage1RM(1, 15)).toBe(getPercentage1RM(1, 10));
    });

    it('should round RPE to the nearest 0.5 step', () => {
      // 9.2 -> 9.0
      expect(getPercentage1RM(1, 9.2)).toBe(getPercentage1RM(1, 9.0));

      // 9.3 -> 9.5
      expect(getPercentage1RM(1, 9.3)).toBe(getPercentage1RM(1, 9.5));

      // 9.7 -> 9.5
      expect(getPercentage1RM(1, 9.7)).toBe(getPercentage1RM(1, 9.5));

      // 9.8 -> 10.0
      expect(getPercentage1RM(1, 9.8)).toBe(getPercentage1RM(1, 10.0));
    });

    it('should satisfy monotonicity properties', () => {
      // For fixed Reps, higher RPE -> lower or equal %1RM
      // But wait, the table says:
      // Reps 1, RPE 10 -> 1.00
      // Reps 1, RPE 9 -> 0.955
      // So higher RPE -> HIGHER %1RM?
      // Let's check table:
      // Reps 1: 10 -> 1.00, 9 -> 0.955
      // Yes, higher RPE means closer to failure, so load is higher percentage of 1RM?
      // Wait. If I can do 1 rep at RPE 10, that is my 1RM (100%).
      // If I can do 1 rep at RPE 9 (1 rep in reserve), that is ~95.5% of my 1RM.
      // So yes, higher RPE -> higher %1RM.

      // Check RPE monotonicity
      const rpes = [
        4, 4.5, 5, 5.5,
        6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10
      ];
      for (let reps = 1; reps <= 16; reps++) {
        for (let i = 0; i < rpes.length - 1; i++) {
          const lowerRPE = getPercentage1RM(reps, rpes[i]);
          const higherRPE = getPercentage1RM(reps, rpes[i + 1]);
          if (lowerRPE !== null && higherRPE !== null) {
            expect(higherRPE).toBeGreaterThanOrEqual(lowerRPE);
          }
        }
      }

      // Check Reps monotonicity
      // For fixed RPE, higher Reps -> lower %1RM
      // Example: 1 rep @ RPE 10 = 100%
      //          2 reps @ RPE 10 = 95.5%
      //          12 reps @ RPE 10 = 69.6%
      // So higher Reps -> lower %1RM.
      const fixedRPE = 10;
      for (let reps = 1; reps < 16; reps++) {
        const lowerReps = getPercentage1RM(reps, fixedRPE);
        const higherReps = getPercentage1RM(reps + 1, fixedRPE);
        if (lowerReps !== null && higherReps !== null) {
          expect(lowerReps).toBeGreaterThan(higherReps);
        }
      }
    });
  });

  describe('calculateWeighted1RM', () => {
    it('should estimate 1RM correctly', () => {
      // load: 100, reps: 1, rpe: 10 -> R_tot: 1. Range 1.
      const res = calculateWeighted1RM(100, 1, 10);
      expect(res.media).toBeGreaterThanOrEqual(100);
      expect(res.percentage).toBe(100);
    });

    it('should return valid object without RPE, redistributing percentage weight', () => {
      const res = calculateWeighted1RM(100, 5); // R_tot = 5
      expect(res.media).toBeGreaterThan(100);
      expect(res.percentage).toBeUndefined();
    });
  });

  describe('suggestLoad', () => {
    it('should suggest load correctly', () => {
      const res1 = suggestLoad(100, 1, 10);
      expect(res1?.media).toBeDefined();
      expect(res1?.min).toBeDefined();
      expect(res1?.max).toBeDefined();

      const res2 = suggestLoad(100, 5, 8);
      expect(res2?.media).toBeDefined();
    });
  });
});
