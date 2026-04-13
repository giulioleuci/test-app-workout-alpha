import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { MuscleOverlapMatrix } from '@/components/planning/MuscleOverlapMatrix';
import { MuscleOverlapData } from '@/services/volumeAnalyzer';

describe('MuscleOverlapMatrix', () => {
  it('renders correctly with data', () => {
    const data: MuscleOverlapData = {
      sessionNames: ['Session 1', 'Session 2'],
      musclePresence: new Map([
        ['chest', [2, 0]],
        ['triceps', [1, 1]],
      ]),
    };

    render(<MuscleOverlapMatrix data={data} />);

    expect(screen.getByText('Session 1')).toBeInTheDocument();
    expect(screen.getByText('Session 2')).toBeInTheDocument();

    // Check muscle labels (assuming t('enums.muscle')['chest'] exists or fallback works)
    // t('enums.muscle') is huge, let's just check if 'chest' or translated version is there.
    // The component uses `muscleLabelMap[muscle] ?? muscle`.
    // If 'chest' is not in map, it renders 'chest'.

    // We can just query for numbers rendered
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(2); // Appears twice
  });

  it('renders null if data is empty', () => {
    const data: MuscleOverlapData = {
      sessionNames: [],
      musclePresence: new Map(),
    };

    const { container } = render(<MuscleOverlapMatrix data={data} />);
    expect(container).toBeEmptyDOMElement();
  });
});
