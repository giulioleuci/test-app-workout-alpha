import { useQuery } from '@tanstack/react-query';

import type { OneRepMaxRecord } from '@/domain/entities';
import { getLatestOneRepMax } from '@/services/oneRepMaxService';
import type { PerformanceAnalysis } from '@/services/performanceAnalyzer';

import { useExerciseHistory, usePerformanceTrend, sessionKeys } from './queries/sessionQueries';

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

    const { data: oneRepMaxData, isLoading: isOneRepMaxLoading } = useQuery({
        queryKey: sessionKeys.oneRepMax(exerciseId ?? ''),
        queryFn: () => getLatestOneRepMax(exerciseId!),
        enabled: !!exerciseId,
        staleTime: 0,
    });

    return {
        trend: trendQuery.data ?? null,
        history: historyQuery.data,
        oneRepMax: oneRepMaxData ?? null,
        isLoading: trendQuery.isLoading || historyQuery.isLoading || (isOneRepMaxLoading && !!exerciseId),
    };
}
