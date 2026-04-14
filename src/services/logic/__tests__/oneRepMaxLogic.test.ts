import { describe, it, expect } from 'vitest';
import {
  estimateBrzycki, estimateEpley, estimateOConner,
  estimateLombardi, computeWeighted1RM,
} from '../oneRepMaxLogic';

describe('estimateBrzycki', () => {
  it('returns null for reps > 10', () => {
    expect(estimateBrzycki(100, 11)).toBeNull();
  });

  it('returns null for reps < 1', () => {
    expect(estimateBrzycki(100, 0)).toBeNull();
  });

  it('returns load for 1 rep (1RM = load)', () => {
    expect(estimateBrzycki(100, 1)).toBeCloseTo(100, 0);
  });

  it('computes for 5 reps at 80 kg', () => {
    expect(estimateBrzycki(80, 5)).toBeCloseTo(90, 0);
  });
});

describe('estimateEpley', () => {
  it('returns load unchanged at 0 reps', () => {
    expect(estimateEpley(100, 0)).toBeCloseTo(100, 0);
  });

  it('computes for 10 reps at 70 kg', () => {
    expect(estimateEpley(70, 10)).toBeCloseTo(93.31, 0);
  });
});

describe('estimateOConner', () => {
  it('computes for 5 reps at 100 kg', () => {
    expect(estimateOConner(100, 5)).toBeCloseTo(112.5, 0);
  });
});

describe('estimateLombardi', () => {
  it('returns null for reps > 6', () => {
    expect(estimateLombardi(100, 7)).toBeNull();
  });

  it('computes for 3 reps at 100 kg', () => {
    expect(estimateLombardi(100, 3)).toBeCloseTo(111.6, 0);
  });
});

describe('computeWeighted1RM', () => {
  it('result is greater than the input load', () => {
    const { media } = computeWeighted1RM(100, 5);
    expect(media).toBeGreaterThan(100);
  });

  it('errorPercentage is between 0 and 20', () => {
    const { errorPercentage } = computeWeighted1RM(80, 3);
    expect(errorPercentage).toBeGreaterThanOrEqual(0);
    expect(errorPercentage).toBeLessThanOrEqual(20);
  });
});
