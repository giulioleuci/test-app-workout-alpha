
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { LoadedGroup } from '@/domain/activeSessionTypes';
import { ExerciseGroupType } from '@/domain/enums';
import ExerciseGroupRenderer from '@/pages/ActiveSession/components/ExerciseGroupRenderer';

// Mock child components to verify delegation
vi.mock('@/pages/ActiveSession/components/ClusterGroupRenderer', () => ({
  default: () => <div data-testid="cluster-renderer">Cluster Renderer</div>
}));

vi.mock('@/pages/ActiveSession/components/InterleavedGroupRenderer', () => ({
  default: () => <div data-testid="interleaved-renderer">Interleaved Renderer</div>
}));

vi.mock('@/pages/ActiveSession/components/SequentialGroupRenderer', () => ({
  default: () => <div data-testid="sequential-renderer">Sequential Renderer</div>
}));

// Mock getGroupBehavior
vi.mock('@/domain/groupBehavior', () => ({
  getGroupBehavior: (type: ExerciseGroupType) => {
    if (type === ExerciseGroupType.Cluster) return { setBlockTraversal: 'cluster', exerciseTraversal: 'sequential' };
    if (type === ExerciseGroupType.Superset) return { setBlockTraversal: 'sequential', exerciseTraversal: 'interleaved' };
    return { setBlockTraversal: 'sequential', exerciseTraversal: 'sequential' };
  }
}));

describe('ExerciseGroupRenderer', () => {
  it('renders ClusterGroupRenderer for Cluster groups', () => {
    const lg: LoadedGroup = {
      group: { groupType: ExerciseGroupType.Cluster } as any,
      items: [{}] as any // Dummy items
    };

    render(<ExerciseGroupRenderer lg={lg} gi={0} />);
    expect(screen.getByTestId('cluster-renderer')).toBeInTheDocument();
  });

  it('renders InterleavedGroupRenderer for Interleaved groups with multiple items', () => {
    const lg: LoadedGroup = {
      group: { groupType: ExerciseGroupType.Superset } as any,
      items: [{}, {}] as any // Multiple items
    };

    render(<ExerciseGroupRenderer lg={lg} gi={0} />);
    expect(screen.getByTestId('interleaved-renderer')).toBeInTheDocument();
  });

  it('renders SequentialGroupRenderer for Standard groups', () => {
    const lg: LoadedGroup = {
      group: { groupType: ExerciseGroupType.Standard } as any,
      items: [{}] as any
    };

    render(<ExerciseGroupRenderer lg={lg} gi={0} />);
    expect(screen.getByTestId('sequential-renderer')).toBeInTheDocument();
  });

  it('renders SequentialGroupRenderer for Interleaved groups with SINGLE item (fallback)', () => {
    const lg: LoadedGroup = {
      group: { groupType: ExerciseGroupType.Superset } as any,
      items: [{}] as any // Single item
    };

    render(<ExerciseGroupRenderer lg={lg} gi={0} />);
    expect(screen.getByTestId('sequential-renderer')).toBeInTheDocument();
  });
});
