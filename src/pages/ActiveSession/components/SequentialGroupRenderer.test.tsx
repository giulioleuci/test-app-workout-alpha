
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SequentialGroupRenderer from '@/pages/ActiveSession/components/SequentialGroupRenderer';
import { SessionGroupContext } from '@/pages/ActiveSession/components/SessionGroupContext';
import type { LoadedGroup, LoadedItem } from '@/domain/activeSessionTypes';

// Mock child components
vi.mock('@/components/session/SetInputWidget', () => ({
  default: ({ onComplete }: any) => (
    <div data-testid="set-input-widget">
      Set Input Widget
      <button onClick={onComplete}>Complete Set</button>
    </div>
  )
}));

vi.mock('@/pages/ActiveSession/components/SessionItemHeader', () => ({
  SessionItemHeader: () => <div data-testid="session-item-header">Header</div>
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: any) => <div>{children}</div>,
  CarouselContent: ({ children }: any) => <div>{children}</div>,
  CarouselItem: ({ children }: any) => <div>{children}</div>,
  CarouselDots: () => <div>Dots</div>
}));

describe('SequentialGroupRenderer', () => {
  const mockOnCompleteSet = vi.fn();
  const mockOnSkipSet = vi.fn();
  const mockSetViewedSetParams = vi.fn();

  const defaultContext = {
    current: { gi: 0, ii: 0, si: 0 },
    viewedSetParams: null,
    simpleMode: false,
    simpleMode: false,
    loadSuggestions: [],
    onCompleteSet: mockOnCompleteSet,
    onSkipSet: mockOnSkipSet,
    setViewedSetParams: mockSetViewedSetParams,
    // Add other required context props as no-ops

    onSkipRemainingSets: vi.fn(),
    onUncompleteSet: vi.fn(),
    onUncompleteLastSet: vi.fn(),
    onAddSet: vi.fn(),
  };

  const mockItem: LoadedItem = {
    item: { id: 'i1' } as any,
    sets: [
      { id: 's1', isCompleted: false, sessionExerciseItemId: 'i1' } as any,
      { id: 's2', isCompleted: false, sessionExerciseItemId: 'i1' } as any
    ],
    plannedSets: {},
    exercise: null,
    occurrenceIndex: 0
  };

  const mockGroup: LoadedGroup = {
    group: { id: 'g1' } as any,
    items: [mockItem]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithContext = (contextOverride = {}) => {
    return render(
      <SessionGroupContext.Provider value={{ ...defaultContext, ...contextOverride } as any}>
        <SequentialGroupRenderer lg={mockGroup} gi={0} liItems={[mockItem]} itemIndices={[0]} />
      </SessionGroupContext.Provider>
    );
  };

  it('renders header', () => {
    renderWithContext();
    expect(screen.getByTestId('session-item-header')).toBeInTheDocument();
  });

  it('renders SetInputWidget for current set', () => {
    renderWithContext();
    expect(screen.getAllByTestId('set-input-widget')).toHaveLength(2); // Renders for all sets in carousel
  });

  it('calls onCompleteSet when widget completes', () => {
    renderWithContext();
    const completeButtons = screen.getAllByText('Complete Set');
    fireEvent.click(completeButtons[0]);
    expect(mockOnCompleteSet).toHaveBeenCalled();
  });
});
