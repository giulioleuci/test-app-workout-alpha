import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


 
import 'fake-indexeddb/auto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { nanoid } from 'nanoid';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ExerciseHistoryButton from '@/components/session/ExerciseHistoryButton';
import { ExerciseGroupType } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

import { testDb as db } from '../../utils/testHelpers';

const queryClient = new QueryClient();

describe('ExerciseHistoryButton', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete();
    await db.open();
  });

  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('loads and displays history for an exercise', async () => {
    const exerciseId = nanoid();
    const currentSessionId = nanoid();

    // 1. Setup past session with completed sets
    const pastSessionId = nanoid();
    await db.workoutSessions.add({
      id: pastSessionId,
      startedAt: dayjs('2023-01-01T10:00:00').toDate(),
      status: 'completed'
    } as any);

    const pastGroup = {
      id: nanoid(),
      workoutSessionId: pastSessionId,
      orderIndex: generateTestRank(0),
      groupType: ExerciseGroupType.Standard,
      completedAt: dayjs('2023-01-01T10:00:00').toDate()
    };
    await db.sessionExerciseGroups.add(pastGroup as any);

    const pastItem = {
      id: nanoid(),
      sessionExerciseGroupId: pastGroup.id,
      exerciseId: exerciseId,
      orderIndex: generateTestRank(0),
      completedAt: dayjs('2023-01-01T10:00:00').toDate()
    };
    await db.sessionExerciseItems.add(pastItem as any);

    await db.sessionSets.add({
      id: nanoid(),
      sessionExerciseItemId: pastItem.id,
      isCompleted: true,
      actualCount: 10,
      actualLoad: 100,
      orderIndex: generateTestRank(0)
    } as any);

    // 2. Setup current session (just to satisfy props)
    await db.workoutSessions.add({
      id: currentSessionId,
      startedAt: dayjs().toDate(),
      status: 'active'
    } as any);

    renderWithProvider(
      <ExerciseHistoryButton
        exerciseId={exerciseId}
        currentSessionId={currentSessionId}
        occurrenceIndex={0}
      />
    );

    // Open popover
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Wait for history to load
    await waitFor(() => {
      expect(screen.getByText('10 reps × 100kg')).toBeInTheDocument();
      expect(screen.getByText(/01 Jan 2023/i)).toBeInTheDocument();
    });
  });

  it('correctly sorts items by group order then item order (occurrence logic)', async () => {
    const exerciseId = nanoid();
    const currentSessionId = nanoid();
    const pastSessionId = nanoid();

    await db.workoutSessions.add({
      id: pastSessionId,
      startedAt: dayjs('2023-01-01T10:00:00').toDate(),
      status: 'completed'
    } as any);

    // Group 1 (Order 0) - Should be picked for occurrenceIndex 0
    const group1 = {
      id: nanoid(),
      workoutSessionId: pastSessionId,
      orderIndex: generateTestRank(0),
      groupType: ExerciseGroupType.Standard,
      completedAt: dayjs('2023-01-01T10:00:00').toDate()
    };
    await db.sessionExerciseGroups.add(group1 as any);

    const item1 = {
      id: nanoid(),
      sessionExerciseGroupId: group1.id,
      exerciseId: exerciseId,
      orderIndex: generateTestRank(0),
      completedAt: dayjs('2023-01-01T10:00:00').toDate()
    };
    await db.sessionExerciseItems.add(item1 as any);

    await db.sessionSets.add({
      id: nanoid(),
      sessionExerciseItemId: item1.id,
      isCompleted: true,
      actualCount: 5,
      actualLoad: 50,
      orderIndex: generateTestRank(0)
    } as any);

    // Group 2 (Order 1) - Should be picked for occurrenceIndex 1
    const group2 = {
      id: nanoid(),
      workoutSessionId: pastSessionId,
      orderIndex: generateTestRank(1),
      groupType: ExerciseGroupType.Standard,
      completedAt: dayjs('2023-01-01T10:00:00').toDate()
    };
    await db.sessionExerciseGroups.add(group2 as any);

    const item2 = {
      id: nanoid(),
      sessionExerciseGroupId: group2.id,
      exerciseId: exerciseId,
      orderIndex: generateTestRank(0),
      completedAt: dayjs('2023-01-01T10:00:00').toDate()
    };
    await db.sessionExerciseItems.add(item2 as any);

    await db.sessionSets.add({
      id: nanoid(),
      sessionExerciseItemId: item2.id,
      isCompleted: true,
      actualCount: 8,
      actualLoad: 80,
      orderIndex: generateTestRank(0)
    } as any);

    // Test occurrenceIndex 0 -> Should show 5x50kg
    const { unmount } = renderWithProvider(
      <ExerciseHistoryButton
        exerciseId={exerciseId}
        currentSessionId={currentSessionId}
        occurrenceIndex={0}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('5 reps × 50kg')).toBeInTheDocument();
      expect(screen.queryByText('8 reps × 80kg')).not.toBeInTheDocument();
    });

    unmount();

    // Test occurrenceIndex 1 -> Should show 8x80kg
    renderWithProvider(
      <ExerciseHistoryButton
        exerciseId={exerciseId}
        currentSessionId={currentSessionId}
        occurrenceIndex={1}
      />
    );

    const button2 = screen.getByRole('button');
    fireEvent.click(button2);

    await waitFor(() => {
      expect(screen.getByText('8 reps × 80kg')).toBeInTheDocument();
      expect(screen.queryByText('5 reps × 50kg')).not.toBeInTheDocument();
    });
  });
});
