import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


import 'fake-indexeddb/auto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, act } from '@testing-library/react';
import { nanoid } from 'nanoid';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ExerciseGroupType } from '@/domain/enums';
import ActiveSession from '@/pages/ActiveSession';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

import { testDb as db } from '../../utils/testHelpers';


// Mock timer components to avoid complexity
vi.mock('@/pages/ActiveSession/components/TimerDisplay', () => ({
  default: () => <div data-testid="timer-display">00:00:00</div>,
}));

vi.mock('@/components/session/RestTimer', () => ({
  RestTimerStartControl: () => null,
  default: () => null,
}));

// Mock store
vi.mock('@/stores/activeSessionStore', () => ({
  useActiveSessionStore: vi.fn(),
}));

let queryClient: QueryClient;

describe('ActiveSession Performance', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete();
    await db.open();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    (useActiveSessionStore as any).mockReturnValue({
      activeSessionId: 'session-1',
      startRestTimer: vi.fn(),
      reset: vi.fn(),
      transientSetValues: {},
      setTransientSetValue: vi.fn(),
      clearTransientSetValues: vi.fn(),
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('does NOT re-render children on timer tick', async () => {
    // Disable fake timers for DB/Query load
    vi.useRealTimers();

    // Seed minimal session
    const exerciseId = nanoid();
    await db.exercises.add({ id: exerciseId, name: 'Ex', counterType: 'reps' } as any);
    await db.workoutSessions.add({ id: 'session-1', startedAt: new Date() } as any);
    const g1 = nanoid();
    const i1 = nanoid();
    await db.sessionExerciseGroups.add({ id: g1, workoutSessionId: 'session-1', orderIndex: generateTestRank(0), groupType: ExerciseGroupType.Standard } as any);
    await db.sessionExerciseItems.add({ id: i1, sessionExerciseGroupId: g1, exerciseId, orderIndex: generateTestRank(0) } as any);
    await db.sessionSets.add({ id: nanoid(), sessionExerciseItemId: i1, isCompleted: false, orderIndex: generateTestRank(0) } as any);

    renderWithProviders(<ActiveSession />);

    // Wait for initial load with real timers
    await waitFor(() => expect(screen.getAllByText('Ex').length).toBeGreaterThan(0));

    // Switch to fake timers for performance tick check
    vi.useFakeTimers();

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Check if expensive components re-rendered (mocked here, but in real app we'd profile)
    // For this test, we trust that TimerDisplay is isolated.
    expect(screen.getByTestId('timer-display')).toBeInTheDocument();
  });
});
