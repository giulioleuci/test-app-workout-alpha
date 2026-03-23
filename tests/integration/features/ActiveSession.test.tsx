import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../utils/test-utils';
import { createMockSession, createMockExerciseGroup, createMockExerciseItem, createMockSessionSet, createMockExercise } from '../../fixtures/domain-factories';
import { useActiveSessionStore } from '@/stores/activeSessionStore';
import { sessionLoaderService } from '@/services/sessionLoaderService';
import ActiveSessionPage from '@/pages/ActiveSession';
import { nanoid } from 'nanoid';
import { LoadedGroup, LoadedItem } from '@/domain/activeSessionTypes';
import { ExerciseGroupType, SetType, Equipment } from '@/domain/enums';
import * as sessionQueries from '@/hooks/queries/sessionQueries';

// Mock services
vi.mock('@/services/sessionLoaderService', () => ({
  sessionLoaderService: {
    loadActiveSessionData: vi.fn(),
  },
}));

vi.mock('@/services/systemService', () => ({
    systemService: {
        isInitialized: () => true,
        getCurrentUserId: () => 'test-user-id'
    }
}));

// Partially mock sessionQueries
vi.mock('@/hooks/queries/sessionQueries', async (importOriginal) => {
    const actual = await importOriginal<typeof sessionQueries>();
    return {
        ...actual,
        useActiveSessionData: vi.fn(),
        useLoadSuggestions: vi.fn().mockReturnValue({ data: [] }),
        useExerciseHistory: vi.fn().mockReturnValue({ data: [], isLoading: false }),
    };
});

describe('ActiveSession Integration', () => {
  beforeEach(() => {
    useActiveSessionStore.getState().reset();
    vi.clearAllMocks();
  });

  it('Renders active session and displays exercise name', async () => {
    const sessionId = nanoid();
    const exerciseId = nanoid();

    // Ensure equipment is an array as expected by ExerciseInfoModal
    const mockExercise = createMockExercise({
        id: exerciseId,
        name: 'Bench Press',
        equipment: [Equipment.Barbell] as any
    });

    const mockSet = createMockSessionSet({
      reps: 10, load: 100, rpe: 8,
      setType: SetType.Working,
      plannedSetId: undefined,
      id: nanoid(),
      completedAt: undefined
    });

    const mockItem: LoadedItem = {
        item: createMockExerciseItem({ id: nanoid(), exerciseId: exerciseId, sets: [mockSet] }),
        exercise: { ...mockExercise, equipment: [Equipment.Barbell] as any },
        sets: [mockSet],
        plannedSets: {},
        occurrenceIndex: 0
    };

    const mockGroup: LoadedGroup = {
        group: {
            id: nanoid(),
            items: [mockItem.item],
            groupType: ExerciseGroupType.Standard,
            orderIndex: generateTestRank(0),
            plannedExerciseGroupId: undefined,
            sessionExerciseGroupId: nanoid()
        },
        items: [mockItem],
        plannedGroup: undefined
    };

    const mockLoadedSessionData = {
        workoutSession: createMockSession({ id: sessionId, groups: [mockGroup.group] }),
        loadedGroups: [mockGroup],
        plannedWorkout: null,
        plannedSession: null,
        simpleMode: false
    };

    (sessionQueries.useActiveSessionData as any).mockReturnValue({
        data: mockLoadedSessionData,
        isLoading: false,
        refetch: vi.fn()
    });

    useActiveSessionStore.getState().setActiveSession(sessionId);

    renderWithProviders(<ActiveSessionPage />, { route: '/session/active' });

    // Wait for the exercise name to appear. Use a regex to be more flexible with surrounding text or casing.
    await waitFor(() => {
        const elements = screen.getAllByText(/Bench Press/i);
        expect(elements[0]).toBeInTheDocument();
    }, { timeout: 8000 });
  }, 10000); // Set test-level timeout
});
