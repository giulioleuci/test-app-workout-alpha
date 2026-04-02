import { useState, useCallback } from 'react';

import { nanoid } from 'nanoid';

import type { PlannedExerciseGroup, PlannedExerciseItem, PlannedSet, Exercise } from '@/domain/entities';
import { ExerciseGroupType, SetType, ToFailureIndicator } from '@/domain/enums';
import { getGroupBehavior } from '@/domain/groupBehavior';
import type { ClusterSetParams } from '@/domain/value-objects';
import { getRankBetween, getInitialRank } from '@/lib/lexorank';

export interface UseEntityCRUDProps {
  initialGroups?: PlannedExerciseGroup[];
  initialItems?: Record<string, PlannedExerciseItem[]>;
  initialSets?: Record<string, PlannedSet[]>;
  plannedSessionId?: string;
}

export function usePlanEditor({
  initialGroups = [],
  initialItems = {},
  initialSets = {},
  plannedSessionId = '__temp__',
}: UseEntityCRUDProps = {}) {
  const [groups, setGroups] = useState<PlannedExerciseGroup[]>(initialGroups);
  const [items, setItems] = useState<Record<string, PlannedExerciseItem[]>>(initialItems);
  const [sets, setSets] = useState<Record<string, PlannedSet[]>>(initialSets);

  // Groups
  const addGroup = useCallback(() => {
    const newGroup: PlannedExerciseGroup = {
      id: nanoid(),
      plannedSessionId,
      groupType: ExerciseGroupType.Standard,
      orderIndex: groups.length === 0 ? getInitialRank() : getRankBetween(groups[groups.length - 1].orderIndex, null),
    };
    setGroups(prev => [...prev, newGroup]);
    setItems(prev => ({ ...prev, [newGroup.id]: [] }));
    // No need to init sets as there are no items yet
    return newGroup;
  }, [groups.length, plannedSessionId]);

  const removeGroup = useCallback((groupId: string) => {
    // We need to know which items are being removed to cleanup sets
    // But inside setSets functional update we can't see items if we use functional update for setItems.
    // So we should probably use the current state 'items' from closure.
    // However, if we rely on 'items' state, we need it in deps.
    // To avoid stale closures, let's use the 'items' from state.

    const groupItems = items[groupId] || [];

    setGroups(prev => prev.filter(g => g.id !== groupId));

    setItems(prev => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });

    setSets(prev => {
      const next = { ...prev };
      for (const item of groupItems) {
        if (item) delete next[item.id];
      }
      return next;
    });
  }, [items]);

  const updateGroup = useCallback((groupId: string, updates: Partial<PlannedExerciseGroup>) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g));
  }, []);

  const moveGroup = useCallback((index: number, direction: -1 | 1) => {
    setGroups(prev => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const a = next[index];
      const b = next[targetIndex];

      const tempOrder = a.orderIndex;
      const bOrder = b.orderIndex;

      next[index] = { ...b, orderIndex: tempOrder };
      next[targetIndex] = { ...a, orderIndex: bOrder };

      return next;
    });
  }, []);

  // Items
  const addItem = useCallback((groupId: string, exercise: Exercise) => {
    const currentItems = items[groupId] || [];
    const newItem: PlannedExerciseItem = {
      id: nanoid(),
      plannedExerciseGroupId: groupId,
      exerciseId: exercise.id,
      counterType: exercise.counterType,
      orderIndex: currentItems.length === 0 ? getInitialRank() : getRankBetween(currentItems[currentItems.length - 1].orderIndex, null),
    };

    setItems(prev => ({ ...prev, [groupId]: [...(prev[groupId] || []), newItem] }));
    setSets(prev => ({ ...prev, [newItem.id]: [] }));
  }, [items]); // Added items to deps

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => {
      const next: Record<string, PlannedExerciseItem[]> = {};
      for (const [gId, list] of Object.entries(prev)) {
        next[gId] = list.filter(i => i.id !== itemId);
      }
      return next;
    });
    setSets(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  const updateItem = useCallback((itemId: string, updates: Partial<PlannedExerciseItem>) => {
    setItems(prev => {
      const next: Record<string, PlannedExerciseItem[]> = {};
      for (const [gId, list] of Object.entries(prev)) {
        next[gId] = list.map(i => i.id === itemId ? { ...i, ...updates } : i);
      }
      return next;
    });
  }, []);

  const moveItem = useCallback((groupId: string, index: number, direction: -1 | 1) => {
    setItems(prev => {
      const list = [...(prev[groupId] || [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;

      const a = list[index];
      const b = list[targetIndex];
      list[index] = { ...b, orderIndex: a.orderIndex };
      list[targetIndex] = { ...a, orderIndex: b.orderIndex };

      return { ...prev, [groupId]: list }; // Removed sort logic to match original implicit assumption
    });
  }, []);

  const updateItemClusterParams = useCallback((itemId: string, params: ClusterSetParams) => {
    setItems(prev => {
      const next: Record<string, PlannedExerciseItem[]> = {};
      for (const [gId, list] of Object.entries(prev)) {
        next[gId] = list.map(i => i.id === itemId ? { ...i, modifiers: [{ type: 'cluster' as const, config: params }] } : i);
      }
      return next;
    });
  }, []);

  // Sets
  const addSet = useCallback((itemId: string, groupId?: string) => {
    // Determine set type based on group behavior if groupId is provided
    let setType = SetType.Working;
    if (groupId) {
      const group = groups.find(g => g.id === groupId);
      const behavior = group ? getGroupBehavior(group.groupType) : null;
      if (behavior?.setBlockTraversal === 'cluster') {
        setType = SetType.ClusterMiniSet;
      }
    }

    setSets(prev => {
      const currentSets = prev[itemId] || [];
      const newSet: PlannedSet = {
        id: nanoid(),
        plannedExerciseItemId: itemId,
        setCountRange: { min: 3 },
        countRange: { min: 8, max: null, toFailure: ToFailureIndicator.None },
        restSecondsRange: { min: 0, max: 0, isFixed: true },
        setType,
        orderIndex: currentSets.length === 0 ? getInitialRank() : getRankBetween(currentSets[currentSets.length - 1].orderIndex, null),
      };

      return { ...prev, [itemId]: [...currentSets, newSet] };
    });
  }, [groups]);

  const updateSet = useCallback((setId: string, updates: Partial<PlannedSet>) => {
    setSets(prev => {
      const next: Record<string, PlannedSet[]> = {};
      for (const [iId, list] of Object.entries(prev)) {
        next[iId] = list.map(s => s.id === setId ? { ...s, ...updates } : s);
      }
      return next;
    });
  }, []);

  const removeSet = useCallback((setId: string) => {
    setSets(prev => {
      const next: Record<string, PlannedSet[]> = {};
      for (const [iId, list] of Object.entries(prev)) {
        next[iId] = list.filter(s => s.id !== setId);
      }
      return next;
    });
  }, []);

  // Bulk setters
  const setAll = useCallback((
    newGroups: PlannedExerciseGroup[],
    newItems: Record<string, PlannedExerciseItem[]>,
    newSets: Record<string, PlannedSet[]>
  ) => {
    setGroups(newGroups);
    setItems(newItems);
    setSets(newSets);
  }, []);

  return {
    groups, items, sets,
    setGroups, setItems, setSets, setAll,
    addGroup, removeGroup, updateGroup, moveGroup,
    addItem, removeItem, updateItem, moveItem, updateItemClusterParams,
    addSet, updateSet, removeSet,
  };
}
