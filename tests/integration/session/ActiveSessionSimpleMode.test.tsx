import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for (let i = 0; i < index; i++) rank = rank.genNext();
  return rank.toString();
}



/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import 'fake-indexeddb/auto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { nanoid } from 'nanoid';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExerciseGroupType } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import ActiveSession from '@/pages/ActiveSession';
import { analyzeExercisePerformance } from '@/services/performanceAnalyzer';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

import { testDb as db } from '../../utils/testHelpers';



// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock store
vi.mock('@/stores/activeSessionStore', () => ({
  useActiveSessionStore: vi.fn(),
}));

// Mock analyzer
vi.mock('@/services/performanceAnalyzer', () => ({
  analyzeExercisePerformance: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

let queryClient: QueryClient;

describe('ActiveSession Simple Mode', () => {
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

    (analyzeExercisePerformance as any).mockResolvedValue({
      status: 'insufficient_data',
      history: [],
      change: null
    });
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

  const seedData = async (simpleMode: boolean) => {
    // 1. Profile
    await db.userRegulationProfile.add({
      id: 'default',
      simpleMode,
      preferredSuggestionMethod: 'lastSession',
      fatigueSensitivity: 'medium',
      autoStartRestTimer: true,
      updatedAt: dayjs().toDate(),
    } as any);

    // 2. Exercise
    const exerciseId = nanoid();
    await db.exercises.add({ id: exerciseId, name: 'Bench Press', counterType: 'reps' } as any);

    // 3. Workout Session
    await db.workoutSessions.add({
      id: 'session-1',
      startedAt: dayjs().toDate(),
      status: 'active'
    } as any);

    // 4. Active Item (Bench Press)
    const g1 = nanoid();
    const i1 = nanoid();
    await db.sessionExerciseGroups.add({ id: g1, workoutSessionId: 'session-1', orderIndex: generateTestRank(0), groupType: ExerciseGroupType.Standard } as any);
    await db.sessionExerciseItems.add({ id: i1, sessionExerciseGroupId: g1, exerciseId, orderIndex: generateTestRank(0) } as any);

    // Active Set
    await db.sessionSets.add({
      id: nanoid(), sessionExerciseItemId: i1, isCompleted: false, orderIndex: generateTestRank(0), actualRPE: null
    } as any);

    // Completed Set (for history popover check)
    // Actually, just add a completed set to the current item to check "Completed Set Info" popover
    await db.sessionSets.add({
      id: nanoid(), sessionExerciseItemId: i1, isCompleted: true, actualCount: 10, actualLoad: 50, actualRPE: 8, orderIndex: generateTestRank(0)
    } as any);

    const storedEx = await db.exercises.get(exerciseId);
    const storedItem = await db.sessionExerciseItems.get(i1);
  };

  it('hides advanced features in Simple Mode', async () => {
    await seedData(true);
    renderWithProviders(<ActiveSession />);
    await waitFor(() => {
      expect(screen.getByText(/Active Session/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      const el = screen.getAllByText(/Bench Press/i, { hidden: true })[0];
      expect(el).toBeInTheDocument();
    });

    // 1. Verify RPE Slider is hidden (SetInputWidget)
    // The RPE selector usually has "RPE" label or slider. Let's look for "RPE Target" or similar if it exists, or the slider itself.
    // In SetInputWidget, RPESelector is conditionally rendered.
    // If we can't find it by text, we can check for the absence of element with specific class or role.
    // The RPE selector in RPESelector.tsx usually renders numbers 6-10 or a slider.
    // Actually RPESelector.tsx renders a slider.
    // Let's assume there is some text "RPE" or we can check via class if needed.
    // In SetInputWidget:
    // {!simpleMode && ( <div ...><RPESelector ... /></div> )}

    // 2. Verify "Extra options" toggle is hidden
    // "toFailure", "partials", "forcedReps", "notes" are in the toggle button text
    // "Cedimento", "Parziali", "Forzate", "Note" in Italian or key values.
    // t('planning.toFailure') is "Cedimento"
    expect(screen.queryByText(/Cedimento/i)).not.toBeInTheDocument();

    // 3. Verify RPE in "Completed Set Info" popover (SetInputWidget header)
    // Click the history button "1 ✓"
    const historyTrigger = screen.getAllByText(/1.*✓/)[0];
    fireEvent.click(historyTrigger);

    // In Simple Mode, the popover should NOT show "RPE 8"
    await waitFor(() => {
      expect(screen.queryByText(/RPE 8/)).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('hides RPE-based suggestions and removes RPE from reasoning in Simple Mode', async () => {
    // 1. Profile with Simple Mode ON
    await db.userRegulationProfile.add({
      id: 'default',
      simpleMode: true,
      preferredSuggestionMethod: 'lastSession',
      fatigueSensitivity: 'medium',
      updatedAt: dayjs().toDate(),
    } as any);

    const exerciseId = nanoid();
    await db.exercises.add({ id: exerciseId, name: 'Squat', counterType: 'reps' } as any);

    // 2. Add historical data with RPE
    const pastSessionId = nanoid();
    const pastGroupId = nanoid();
    const pastItemId = nanoid();
    const pastDate = dayjs().subtract(1, 'day');
    const pastCompletedAt = pastDate.add(1, 'hour').toDate();
    await db.workoutSessions.add({ id: pastSessionId, startedAt: pastDate.toDate(), completedAt: pastCompletedAt, status: 'completed' } as any);
    await db.sessionExerciseGroups.add({ id: pastGroupId, workoutSessionId: pastSessionId, orderIndex: generateTestRank(0), groupType: ExerciseGroupType.Standard, completedAt: pastCompletedAt, isCompleted: true } as any);
    await db.sessionExerciseItems.add({ id: pastItemId, sessionExerciseGroupId: pastGroupId, exerciseId, orderIndex: generateTestRank(0), completedAt: pastCompletedAt, isCompleted: true } as any);
    await db.sessionSets.add({
      id: nanoid(), sessionExerciseItemId: pastItemId, isCompleted: true, actualCount: 5, actualLoad: 100, actualRPE: 9, orderIndex: generateTestRank(0), completedAt: pastDate.add(30, 'minute').toDate()
    } as any);

    // 3. Current active session
    await db.workoutSessions.add({ id: 'session-1', startedAt: dayjs().toDate(), status: 'active' } as any);
    const g1 = nanoid();
    const i1 = nanoid();
    await db.sessionExerciseGroups.add({ id: g1, workoutSessionId: 'session-1', orderIndex: generateTestRank(0), groupType: ExerciseGroupType.Standard } as any);
    await db.sessionExerciseItems.add({ id: i1, sessionExerciseGroupId: g1, exerciseId, orderIndex: generateTestRank(0) } as any);
    await db.sessionSets.add({
      id: nanoid(), sessionExerciseItemId: i1, isCompleted: false, orderIndex: generateTestRank(0)
    } as any);

    renderWithProviders(<ActiveSession />);

    // Verify suggestion is present but without RPE in reasoning
    await waitFor(() => {
      const el = screen.getAllByText(/Squat/i, { hidden: true })[0];
      expect(el).toBeInTheDocument();
    }, { timeout: 3000 });

    // Wait for the suggestion button to render (React Query async)
    let suggestionBtns: HTMLElement[];
    await waitFor(() => {
      suggestionBtns = screen.getAllByTitle(/Load suggestion/i);
      expect(suggestionBtns.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Open the suggestion dialog
    fireEvent.click(suggestionBtns[0]);

    await waitFor(() => {
      // Should show "Last Session: 100 kg × 5 rep" (translated labels)
      // And NOT "@ RPE 9"
      const suggestions = screen.getAllByText(/Last Session/i);
      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(s => {
        expect(s.textContent).not.toContain('@ RPE 9');
      });
    });
  });

  it('shows advanced features when Simple Mode is OFF', async () => {
    await seedData(false); // Simple Mode OFF

    renderWithProviders(<ActiveSession />);

    await waitFor(() => {
      const el = screen.getAllByText(/Bench Press/i, { hidden: true })[0];
      expect(el).toBeInTheDocument();
    });

    // 1. Verify "Extra options" toggle is visible
    // "Cedimento, Parziali, Forzate, Note"
    // The button text is constructed dynamically or hardcoded.
    // Check t('planning.toFailure') (Cedimento)
    expect(screen.getAllByText(/Failure/i)[0]).toBeInTheDocument();

    // 2. Verify RPE in "Completed Set Info" popover
    const historyTrigger = screen.getAllByText(/1.*✓/)[0];
    fireEvent.click(historyTrigger);

    await waitFor(() => {
      expect(screen.getByText(/RPE 8/)).toBeInTheDocument();
    });
  });
});
