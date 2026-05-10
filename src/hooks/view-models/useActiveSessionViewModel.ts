import { useEffect, useState, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import type { DisplayUnit } from '@/domain/activeSessionTypes';
import { ExerciseGroupType } from '@/domain/enums';
import { useActiveSessionHealth } from '@/hooks/activeSession/useActiveSessionHealth';
import { useSessionHandlers } from '@/hooks/activeSession/useSessionHandlers';
import { useSessionLoader } from '@/hooks/activeSession/useSessionLoader';
import { isGroupCompleted, isItemCompleted, rendersAsGroupUnit } from '@/hooks/activeSession/utils';
import { useUserRegulation } from '@/hooks/queries/dashboardQueries';
import { nativeDeviceService } from '@/services/nativeDeviceService';
import { SessionNavigator } from '@/services/sessionNavigator';
import { adviseOnSetCount } from '@/services/setCountAdvisor';
import { useActiveSessionStore } from '@/stores/activeSessionStore';


export function useActiveSessionViewModel() {
  const navigate = useNavigate();
  const {
    activeSessionId, startRestTimer, reset,
  } = useActiveSessionStore();

  // Keep screen awake during session
  useEffect(() => {
    if (activeSessionId) {
      void nativeDeviceService.keepAwake(true);
    }
    return () => {
      void nativeDeviceService.keepAwake(false);
    };
  }, [activeSessionId]);

  const {
    workoutSession, plannedSession, plannedWorkout, loadedGroups, simpleMode, isLoading, loadData
  } = useSessionLoader(activeSessionId);

  const { data: userRegulation } = useUserRegulation();

  const sessionHealth = useActiveSessionHealth(loadedGroups);

  const [viewedSetParams, setViewedSetParams] = useState<{ gi: number, ii: number, si: number } | null>(null);

  const [swapSheetState, setSwapSheetState] = useState<{
    open: boolean;
    sessionExerciseItemId: string | null;
    currentExerciseId: string | null;
  }>({ open: false, sessionExerciseItemId: null, currentExerciseId: null });
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const current = SessionNavigator.findNextTarget(loadedGroups);
  const allDone = current === null;

  const setCountAdvice = useMemo(() => {
    if (!current?.item) return null;
    const completed = current.item.sets.filter(s => s.isCompleted);
    const ps = current.set.plannedSetId ? current.item.plannedSets[current.set.plannedSetId] : undefined;
    return adviseOnSetCount(
      completed,
      ps,
      userRegulation?.fatigueSensitivity ?? 'medium',
      simpleMode
    );
  }, [current, userRegulation, simpleMode]);

  const handlers = useSessionHandlers(
    activeSessionId,
    current,
    loadedGroups,
    loadData,
    startRestTimer,
    reset,
    navigate
  );

  useEffect(() => {
    setViewedSetParams(null);
  }, [current?.gi, current?.ii, current?.si]);

  const handleViewPrevSet = (gi: number, ii: number, si: number) => {
    if (si > 0) setViewedSetParams({ gi, ii, si: si - 1 });
  };

  const handleViewNextSet = (gi: number, ii: number, si: number, maxSi: number) => {
    if (si < maxSi) {
      if (current && gi === current.gi && ii === current.ii && si + 1 === current.si) {
        // Going back to the active set — clear viewed params
        setViewedSetParams(null);
      } else {
        setViewedSetParams({ gi, ii, si: si + 1 });
      }
    }
  };

  const handleReturnToActiveSet = () => {
    setViewedSetParams(null);
  };



  const handleOpenSwapExercise = (sessionExerciseItemId: string, currentExerciseId: string) => {
    setSwapSheetState({ open: true, sessionExerciseItemId, currentExerciseId });
  };

  const endSession = (title: string, description: string) => {
    void handlers.handleEndSession(allDone, title, description);
  };

  const quickAddSuperset = (exIds: string[]) => {
    void handlers.handleQuickAddSuperset(exIds, ExerciseGroupType.Superset);
  };

  // Split loadedGroups into display units
  const allUnits: DisplayUnit[] = useMemo(() => {
    const units: DisplayUnit[] = [];
    loadedGroups.forEach((lg, gi) => {
      if (rendersAsGroupUnit(lg.group.groupType, lg.items.length)) {
        units.push({ type: 'group', group: lg, originalGroupIndex: gi });
      } else {
        let currentMergedItems: typeof lg.items = [];
        let currentMergedIndices: number[] = [];

        lg.items.forEach((li, ii) => {
          if (currentMergedItems.length === 0) {
            currentMergedItems.push(li);
            currentMergedIndices.push(ii);
          } else {
            const lastItem = currentMergedItems[currentMergedItems.length - 1];
            if (lastItem.item.exerciseId === li.item.exerciseId) {
              currentMergedItems.push(li);
              currentMergedIndices.push(ii);
            } else {
              units.push({
                type: 'item',
                group: lg,
                items: currentMergedItems,
                originalGroupIndex: gi,
                originalItemIndices: currentMergedIndices
              });
              currentMergedItems = [li];
              currentMergedIndices = [ii];
            }
          }
        });

        if (currentMergedItems.length > 0) {
          units.push({
            type: 'item',
            group: lg,
            items: currentMergedItems,
            originalGroupIndex: gi,
            originalItemIndices: currentMergedIndices
          });
        }
      }
    });
    return units;
  }, [loadedGroups]);

  const activeUnits = useMemo(() => allUnits.filter(u => {
    if (u.type === 'group') return !isGroupCompleted(u.group);
    return !u.items.every(isItemCompleted);
  }), [allUnits]);

  const completedUnits = useMemo(() => allUnits.filter(u => {
    if (u.type === 'group') return isGroupCompleted(u.group);
    return u.items.every(isItemCompleted);
  }), [allUnits]);


  return {
    state: {
      isLoading,
      activeSessionId,
      workoutSession,
      plannedSession,
      plannedWorkout,
      simpleMode,
      current,
      allDone,
      viewedSetParams,
      swapSheetState,
      quickAddOpen,
      alertConfig: handlers.alertConfig,
      unresolvedSetsState: handlers.unresolvedSetsState,
      setCountAdvice,
      activeUnits,
      completedUnits,
      allUnits,
      sessionHealth,
    },
    actions: {
      setViewedSetParams,
      setSwapSheetState,
      setQuickAddOpen,
      setAlertConfig: handlers.setAlertConfig,
      setUnresolvedSetsState: handlers.setUnresolvedSetsState,

      onViewPrevSet: handleViewPrevSet,
      onViewNextSet: handleViewNextSet,
      onReturnToActiveSet: handleReturnToActiveSet,
      openSwapExerciseDialog: handleOpenSwapExercise,

      // Mapped handlers
      onCompleteSet: handlers.handleCompleteSet,
      onSkipSet: handlers.handleSkipSet,
      onSkipRemainingSets: handlers.handleSkipRemainingSets,
      onSkipRound: handlers.handleSkipRound,
      onSkipRemainingRounds: handlers.handleSkipRemainingRounds,
      handleAddSet: handlers.handleAddSet,
      handleAddWarmupSets: handlers.handleAddWarmupSets,
      handleAddRound: handlers.handleAddRound,
      onUncompleteSet: handlers.handleUncompleteSet,
      onUncompleteLastSet: handlers.handleUncompleteLastSet,
      onUncompleteLastRound: handlers.handleUncompleteLastRound,
      onCompleteRound: handlers.handleCompleteRound,
      onCompleteScreen: handlers.handleCompleteScreen,
      onEndSession: endSession,
      onSkipAllAndFinish: handlers.handleSkipAllAndFinish,
      onDiscardSession: handlers.handleDiscardSession,
      onSwapItems: handlers.handleSwapItems,
      onActivateUnit: handlers.handleActivateUnit,
      onUndoUnitLastSets: handlers.handleUndoUnitLastSets,
      onSwapExercise: handlers.handleSwapExercise,
      onQuickAddExercise: handlers.handleQuickAddExercise,
      onQuickAddSuperset: quickAddSuperset,
      onRemoveExercise: handlers.handleRemoveExercise,
      onResetSession: reset,
    }
  };
}
