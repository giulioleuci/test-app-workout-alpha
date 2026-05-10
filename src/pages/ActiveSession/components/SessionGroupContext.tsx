import { createContext, useContext } from 'react';

import type { CurrentTarget, LoadedGroup } from '@/domain/activeSessionTypes';
import type { SessionSet } from '@/domain/entities';
import type { SetCountAdvisorResult } from '@/services/setCountAdvisor';
import type { WarmupSet } from '@/services/warmupCalculator';


export interface SessionGroupContextType {
    current: CurrentTarget | null;
    viewedSetParams: { gi: number; ii: number; si: number } | null;
    simpleMode: boolean;
    activeSessionId: string | null;
    setCountAdvice: SetCountAdvisorResult | null;

    onSwapItems?: (groupId: string, indexA: number, indexB: number) => void;
    onViewPrevSet: (gi: number, ii: number, si: number) => void;
    onViewNextSet: (gi: number, ii: number, si: number, maxSi: number) => void;
    setViewedSetParams: (params: { gi: number; ii: number; si: number } | null) => void;
    onReturnToActiveSet: () => void;
    onCompleteSet: (updates: Partial<SessionSet>, setId: string) => void;
    onCompleteRound?: (group: LoadedGroup, roundIndex: number, setsData: Record<string, Partial<SessionSet>>) => void;
    onCompleteScreen?: (group: LoadedGroup, roundIndex: number, screenItemIndices: number[], setsData: Record<string, Partial<SessionSet>>, isLastScreenOfRound: boolean) => void;
    onSkipSet: () => void;
    onSkipRemainingSets: () => void;
    onSkipRound?: () => void;
    onSkipRemainingRounds?: () => void;
    onUncompleteSet: (setId: string) => void;
    onUncompleteLastSet: (itemId: string) => void;
    onUncompleteLastRound?: (lg: LoadedGroup) => void;
    onAddSet: (itemId: string) => void;
    onAddWarmupSets: (itemId: string, warmupSets: WarmupSet[]) => void;
    onAddRound?: (lg: LoadedGroup) => void;
    onSwapExercise?: (sessionExerciseItemId: string, currentExerciseId: string) => void;
    onRemoveExercise?: (sessionExerciseItemId: string) => void;
}

export const SessionGroupContext = createContext<SessionGroupContextType | null>(null);

export function useSessionGroupContext() {
    const context = useContext(SessionGroupContext);
    if (!context) {
        throw new Error('useSessionGroupContext must be used within a SessionGroupContext.Provider');
    }
    return context;
}
