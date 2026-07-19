import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SessionVolumeAnalysis, AnalysisResult } from '@/components/planning/SessionVolumeAnalysis';
import { t } from '@/i18n/t';
import '@testing-library/jest-dom';

describe('SessionVolumeAnalysis', () => {
  it('renders volume bars for muscles, muscle groups and movement patterns', () => {
    const mockAnalysis: AnalysisResult = {
      byMuscle: [
        { key: 'Chest', label: 'Chest', volume: { min: 3, max: 3 } }
      ],
      byMuscleGroup: [
        { key: 'Upper Body', label: 'Upper Body', volume: { min: 3, max: 3 } }
      ],
      byMovementPattern: [
        { key: 'Push', label: 'Push', volume: { min: 3, max: 3 } }
      ],
      byObjective: [
        { key: 'hypertrophy', label: 'Ipertrofia', volume: { min: 3, max: 3 } }
      ]
    };

    render(<SessionVolumeAnalysis analysis={mockAnalysis} />);

    expect(screen.getByText(t('analytics.byMuscleLabel'))).toBeInTheDocument();
    expect(screen.getByText(t('analytics.byMuscleGroupLabel'))).toBeInTheDocument();
    expect(screen.getByText(t('analytics.byMovementPatternLabel'))).toBeInTheDocument();

    // Check for entry labels
    expect(screen.getByText('Chest')).toBeInTheDocument();
    expect(screen.getByText('Upper Body')).toBeInTheDocument();
    expect(screen.getByText('Push')).toBeInTheDocument();
  });

  it('renders ranges correctly', () => {
      const mockAnalysis: AnalysisResult = {
      byMuscle: [
        { key: 'Chest', label: 'Chest', volume: { min: 2, max: 4 } }
      ],
      byMuscleGroup: [],
      byMovementPattern: [],
      byObjective: []
    };

    render(<SessionVolumeAnalysis analysis={mockAnalysis} />);

    // Range formatting depends on implementation, usually "min-max" or "min" if equal.
    // The component uses an en-dash: "2–4" (U+2013), not a hyphen.
    expect(screen.getByText(/2\s*[–-]\s*4/)).toBeInTheDocument();
  });

  it('renders empty container when analysis is empty', () => {
     const mockAnalysis: AnalysisResult = {
      byMuscle: [],
      byMuscleGroup: [],
      byMovementPattern: [],
      byObjective: []
    };

    const { container } = render(<SessionVolumeAnalysis analysis={mockAnalysis} />);

    // VolumeBar returns null if entries is empty and no emptyMessage is provided.
    // So the container should be empty div (from space-y-6 wrapper).
    expect(container.firstChild).toHaveClass('space-y-6');
    expect(container.firstChild).toBeEmptyDOMElement();
  });
});
