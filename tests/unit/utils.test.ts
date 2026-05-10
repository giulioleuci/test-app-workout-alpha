
import { describe, it, expect } from 'vitest';

import { sortByLocaleName } from '@/lib/utils';

describe('sortByLocaleName', () => {
  const items = [
    { name: 'Squat' },
    { name: 'Bench Press' },
    { name: 'Deadlift' },
  ];

  it('should sort items in ascending order', () => {
    const sorted = [...items].sort((a, b) => sortByLocaleName(a, b, 'it', 'asc'));
    expect(sorted[0].name).toBe('Bench Press');
    expect(sorted[1].name).toBe('Deadlift');
    expect(sorted[2].name).toBe('Squat');
  });

  it('should sort items in descending order', () => {
    const sorted = [...items].sort((a, b) => sortByLocaleName(a, b, 'it', 'desc'));
    expect(sorted[0].name).toBe('Squat');
    expect(sorted[1].name).toBe('Deadlift');
    expect(sorted[2].name).toBe('Bench Press');
  });

  it('should handle exercise objects', () => {
    const exercises = [
        { exercise: { name: 'Squat' } },
        { exercise: { name: 'Bench Press' } }
    ];
    // @ts-ignore
    const sorted = [...exercises].sort((a, b) => sortByLocaleName(a, b, 'it', 'asc'));
    expect(sorted[0].exercise.name).toBe('Bench Press');
    expect(sorted[1].exercise.name).toBe('Squat');
  });
});
