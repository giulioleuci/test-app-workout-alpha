import { useState } from 'react';

import type { CurrentTarget, LoadedGroup } from '@/domain/activeSessionTypes';
import type { UnresolvedSet } from '@/services/sessionMutator';

import { useSessionFinishHandlers } from './useSessionFinishHandlers';
import { useSessionMutationHandlers } from './useSessionMutationHandlers';
import { useSessionNavigationHandlers } from './useSessionNavigationHandlers';
import { useSetCompletionHandlers } from './useSetCompletionHandlers';


export function useSessionHandlers(
    activeSessionId: string | null,
    current: CurrentTarget | null,
    loadedGroups: LoadedGroup[],
    loadData: () => void,
    startRestTimer: (seconds: number) => void,
    resetSessionStore: () => void,
    navigate: (path: string) => void,
) {

    const [alertConfig, setAlertConfig] = useState<{
        open: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
    }>({ open: false, title: '', description: '', onConfirm: () => { /* Initialized when alert is shown */ } });

    const [unresolvedSetsState, setUnresolvedSetsState] = useState<{
        open: boolean;
        sets: UnresolvedSet[];
    }>({ open: false, sets: [] });

    const completionHandlers = useSetCompletionHandlers(
        current,
        loadData,
        startRestTimer
    );

    const navigationHandlers = useSessionNavigationHandlers(
        current,
        loadedGroups,
        loadData
    );

    const finishHandlers = useSessionFinishHandlers(
        activeSessionId,
        resetSessionStore,
        navigate,
        setAlertConfig,
        unresolvedSetsState,
        setUnresolvedSetsState
    );

    const mutationHandlers = useSessionMutationHandlers(
        activeSessionId,
        loadedGroups,
        loadData
    );

    return {

        alertConfig,
        setAlertConfig,
        unresolvedSetsState,
        setUnresolvedSetsState,
        ...completionHandlers,
        ...navigationHandlers,
        ...finishHandlers,
        ...mutationHandlers,
    };
}
