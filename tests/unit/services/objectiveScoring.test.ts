import { describe, it, expect } from 'vitest';

import {
  scoreMaxStrength,
  scoreStrength,
  scoreHypertrophy,
  scoreEndurance,
  scoreAllObjectives,
  getScoreFn,
} from '@/services/objectiveScoring';

describe('objectiveScoring', () => {
  describe('scoreMaxStrength', () => {
    it('should return 1 for reps <= 3', () => {
      expect(scoreMaxStrength(1)).toBe(1);
      expect(scoreMaxStrength(3)).toBe(1);
    });

    it('should return 0.5 for reps between 4 and 5', () => {
      expect(scoreMaxStrength(4)).toBe(0.5);
      expect(scoreMaxStrength(5)).toBe(0.5);
    });

    it('should return 0 for reps > 5', () => {
      expect(scoreMaxStrength(6)).toBe(0);
      expect(scoreMaxStrength(10)).toBe(0);
    });
  });

  describe('scoreStrength', () => {
    it('should return 0.5 for reps <= 2', () => {
      expect(scoreStrength(1)).toBe(0.5);
      expect(scoreStrength(2)).toBe(0.5);
    });

    it('should return 1 for reps between 3 and 6', () => {
      expect(scoreStrength(3)).toBe(1);
      expect(scoreStrength(6)).toBe(1);
    });

    it('should return 0.5 for reps between 7 and 8', () => {
      expect(scoreStrength(7)).toBe(0.5);
      expect(scoreStrength(8)).toBe(0.5);
    });

    it('should return 0 for reps > 8', () => {
      expect(scoreStrength(9)).toBe(0);
      expect(scoreStrength(12)).toBe(0);
    });
  });

  describe('scoreHypertrophy', () => {
    it('should return 0 for reps <= 3', () => {
      expect(scoreHypertrophy(1)).toBe(0);
      expect(scoreHypertrophy(3)).toBe(0);
    });

    it('should return 0.5 for reps between 4 and 5', () => {
      expect(scoreHypertrophy(4)).toBe(0.5);
      expect(scoreHypertrophy(5)).toBe(0.5);
    });

    it('should return 1 for reps between 6 and 12', () => {
      expect(scoreHypertrophy(6)).toBe(1);
      expect(scoreHypertrophy(12)).toBe(1);
    });

    it('should return 0.5 for reps > 12', () => {
      expect(scoreHypertrophy(13)).toBe(0.5);
      expect(scoreHypertrophy(20)).toBe(0.5);
    });
  });

  describe('scoreEndurance', () => {
    it('should return 0 for reps <= 8', () => {
      expect(scoreEndurance(1)).toBe(0);
      expect(scoreEndurance(8)).toBe(0);
    });

    it('should return 0.5 for reps between 9 and 11', () => {
      expect(scoreEndurance(9)).toBe(0.5);
      expect(scoreEndurance(11)).toBe(0.5);
    });

    it('should return 1 for reps > 11', () => {
      expect(scoreEndurance(12)).toBe(1);
      expect(scoreEndurance(20)).toBe(1);
    });
  });

  describe('scoreAllObjectives', () => {
    it('should return correct scores for all objectives for a given rep count', () => {
      const reps = 5;
      const scores = scoreAllObjectives(reps);
      expect(scores).toEqual({
        maxStrength: scoreMaxStrength(reps),
        strength: scoreStrength(reps),
        hypertrophy: scoreHypertrophy(reps),
        endurance: scoreEndurance(reps),
      });

      expect(scores.maxStrength).toBe(0.5);
      expect(scores.strength).toBe(1);
      expect(scores.hypertrophy).toBe(0.5);
      expect(scores.endurance).toBe(0);
    });
  });

  describe('getScoreFn', () => {
    it('should return the correct scoring function for each key', () => {
      expect(getScoreFn('maxStrength')).toBe(scoreMaxStrength);
      expect(getScoreFn('strength')).toBe(scoreStrength);
      expect(getScoreFn('hypertrophy')).toBe(scoreHypertrophy);
      expect(getScoreFn('endurance')).toBe(scoreEndurance);
    });

    it('returned functions should work correctly', () => {
      const fn = getScoreFn('maxStrength');
      expect(fn(2)).toBe(1);
      expect(fn(6)).toBe(0);
    });
  });
});
