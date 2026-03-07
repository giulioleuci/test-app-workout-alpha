
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';

import { useActiveSessionViewModel } from '@/hooks/view-models/useActiveSessionViewModel';
import { useActiveSessionStore } from '@/stores/activeSessionStore';
import { useSessionLoader } from '@/hooks/activeSession/useSessionLoader';
import { useSessionHandlers } from '@/hooks/activeSession/useSessionHandlers';
import { SessionNavigator } from '@/services/sessionNavigator';
import { useUserRegulation } from '@/hooks/queries/dashboardQueries';
import { useLoadSuggestions } from '@/hooks/queries/sessionQueries';

// Mocks
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/stores/activeSessionStore', () => ({
  useActiveSessionStore: vi.fn(),
}));

vi.mock('@/hooks/activeSession/useSessionLoader', () => ({
  useSessionLoader: vi.fn(),
}));

vi.mock('@/hooks/activeSession/useSessionHandlers', () => ({
  useSessionHandlers: vi.fn(),
}));

vi.mock('@/services/sessionNavigator', () => ({
  SessionNavigator: {
    findNextTarget: vi.fn(),
  },
}));

vi.mock('@/hooks/queries/dashboardQueries', () => ({
  useUserRegulation: vi.fn(),
}));

vi.mock('@/hooks/queries/sessionQueries', () => ({
  useLoadSuggestions: vi.fn(),
}));

vi.mock('@/services/systemService', () => ({
  systemService: {
    isInitialized: () => true,
    getCurrentUserId: () => 'test-user-id'
  }
}));

describe('useActiveSessionViewModel', () => {
  const mockNavigate = vi.fn();
  const mockStartRestTimer = vi.fn();
  const mockReset = vi.fn();
  const mockLoadData = vi.fn();
  const mockHandlers = {
    handleCompleteSet: vi.fn(),
    handleSkipSet: vi.fn(),
    handleEndSession: vi.fn(),
    alertConfig: { show: false },
    unresolvedSetsState: { open: false },

    setAlertConfig: vi.fn(),
    setUnresolvedSetsState: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useActiveSessionStore).mockReturnValue({
      activeSessionId: 'session-123',
      startRestTimer: mockStartRestTimer,
      reset: mockReset,
    } as any);
    vi.mocked(useSessionLoader).mockReturnValue({
      workoutSession: {} as any,
      plannedSession: {} as any,
      plannedWorkout: {} as any,
      loadedGroups: [],
      simpleMode: false,
      isLoading: false,
      loadData: mockLoadData,
    });
    vi.mocked(useSessionHandlers).mockReturnValue(mockHandlers as any);
    vi.mocked(useUserRegulation).mockReturnValue({ data: {} } as any);
    vi.mocked(useLoadSuggestions).mockReturnValue({ data: [] } as any);
    vi.mocked(SessionNavigator.findNextTarget).mockReturnValue(null); // All done by default
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useActiveSessionViewModel());

    expect(result.current.state.activeSessionId).toBe('session-123');
    expect(result.current.state.allDone).toBe(true);
    expect(result.current.state.viewedSetParams).toBeNull();
    expect(result.current.state.swapSheetState.open).toBe(false);
    expect(result.current.state.quickAddOpen).toBe(false);
  });

  it('manages viewedSetParams', () => {
    const { result } = renderHook(() => useActiveSessionViewModel());

    act(() => {
      result.current.actions.setViewedSetParams({ gi: 0, ii: 0, si: 0 });
    });

    expect(result.current.state.viewedSetParams).toEqual({ gi: 0, ii: 0, si: 0 });

    act(() => {
      result.current.actions.onReturnToActiveSet();
    });

    expect(result.current.state.viewedSetParams).toBeNull();
  });

  it('handles navigation between sets', () => {
    const { result } = renderHook(() => useActiveSessionViewModel());

    // Next
    act(() => {
      result.current.actions.onViewNextSet(0, 0, 0, 2);
    });
    expect(result.current.state.viewedSetParams).toEqual({ gi: 0, ii: 0, si: 1 });

    // Prev
    act(() => {
      result.current.actions.onViewPrevSet(0, 0, 1);
    });
    expect(result.current.state.viewedSetParams).toEqual({ gi: 0, ii: 0, si: 0 });
  });



  it('opens swap sheet', () => {
    const { result } = renderHook(() => useActiveSessionViewModel());

    act(() => {
      result.current.actions.openSwapExerciseDialog('item-1', 'ex-1');
    });

    expect(result.current.state.swapSheetState).toEqual({
      open: true,
      sessionExerciseItemId: 'item-1',
      currentExerciseId: 'ex-1',
    });
  });

  it('delegates endSession to handlers', () => {
    const { result } = renderHook(() => useActiveSessionViewModel());

    act(() => {
      result.current.actions.onEndSession('Title', 'Desc');
    });

    expect(mockHandlers.handleEndSession).toHaveBeenCalledWith(true, 'Title', 'Desc');
  });
});
