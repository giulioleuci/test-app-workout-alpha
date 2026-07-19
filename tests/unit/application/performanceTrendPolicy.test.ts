import { describe, expect, it } from 'vitest';

import { classifyPerformance } from '@/application/performance/trendPolicy';

describe('classifyPerformance', () => {
  const base = { totalSets: 3, totalReps: 30, totalLoad: 3000 };
  it('classifies no history as insufficient data', () => expect(classifyPerformance(base, []).status).toBe('insufficient_data'));
  it('classifies one-direction changes', () => {
    expect(classifyPerformance({ ...base, totalLoad: 3300 }, [base]).status).toBe('improving');
    expect(classifyPerformance({ ...base, totalLoad: 2700 }, [base]).status).toBe('deteriorating');
  });
  it('distinguishes stable and stagnant equal sessions', () => {
    expect(classifyPerformance(base, [base]).status).toBe('stable');
    expect(classifyPerformance(base, [base, base]).status).toBe('stagnant');
  });
});
