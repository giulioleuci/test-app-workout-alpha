import { render } from '@testing-library/react';
import { describe, it } from 'vitest';

import { MuscleOverlapMatrix } from '@/components/planning/MuscleOverlapMatrix';
import { MuscleOverlapData } from '@/services/volumeAnalyzer';

// Generate large dataset
function generateLargeData(numMuscles: number, numSessions: number): MuscleOverlapData {
  const sessionNames = Array.from({ length: numSessions }, (_, i) => `Session ${i}`);
  const musclePresence = new Map<string, number[]>();

  for (let i = 0; i < numMuscles; i++) {
    const counts = Array.from({ length: numSessions }, () => Math.floor(Math.random() * 5));
    musclePresence.set(`muscle_${i}`, counts);
  }

  return { sessionNames, musclePresence };
}

describe('MuscleOverlapMatrix Performance', () => {
  it('measures render time with large dataset', () => {
    const data = generateLargeData(1000, 20); // 1000 muscles, 20 sessions

    const start = performance.now();
    const { rerender } = render(<MuscleOverlapMatrix data={data} />);
    const initialRenderTime = performance.now() - start;

    console.log(`Initial render time: ${initialRenderTime.toFixed(2)}ms`);

    const startReRender = performance.now();
    // Re-render 10 times
    for (let i = 0; i < 10; i++) {
      rerender(<MuscleOverlapMatrix data={data} />);
    }
    const reRenderTime = performance.now() - startReRender;

    console.log(`Re-render time (10x): ${reRenderTime.toFixed(2)}ms`);
    console.log(`Average re-render time: ${(reRenderTime / 10).toFixed(2)}ms`);
  }, 30000);
});
