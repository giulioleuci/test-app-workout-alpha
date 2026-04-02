import { useLiveQuery } from 'dexie-react-hooks';

import type { OneRepMaxRecord } from '@/domain/entities';
import { getLatestOneRepMax } from '@/services/oneRepMaxService';
import type { PerformanceAnalysis } from '@/services/performanceAnalyzer';

import { useExerciseHistory, usePerformanceTrend } from './queries/sessionQueries';

export interface PerformanceTrendsResult {
    trend: PerformanceAnalysis | null;
    history: ReturnType<typeof useExerciseHistory>['data'] | undefined;
    oneRepMax: OneRepMaxRecord | null;
    isLoading: boolean;
}

export function usePerformanceTrends(
    exerciseId?: string,
    activeSessionId?: string
): PerformanceTrendsResult {
    const trendQuery = usePerformanceTrend(exerciseId, activeSessionId);
    const historyQuery = useExerciseHistory(
        exerciseId ?? '',
        activeSessionId ?? '',
    );

    const oneRepMaxData = useLiveQuery(
        () => exerciseId ? getLatestOneRepMax(exerciseId) : Promise.resolve(null),
        [exerciseId]
    );

    return {
        trend: trendQuery.data ?? null,
        history: historyQuery.data,
        oneRepMax: oneRepMaxData ?? null,
        isLoading: trendQuery.isLoading || historyQuery.isLoading || (oneRepMaxData === undefined && !!exerciseId),
    };
}
