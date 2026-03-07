import { useQuery } from '@tanstack/react-query';

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

const oneRepMaxKeys = {
    latest: (exerciseId: string) => ['oneRepMax', 'latest', exerciseId] as const,
};

export function usePerformanceTrends(
    exerciseId?: string,
    activeSessionId?: string
): PerformanceTrendsResult {
    const trendQuery = usePerformanceTrend(exerciseId, activeSessionId);
    const historyQuery = useExerciseHistory(
        exerciseId ?? '',
        activeSessionId ?? '',
    );

    const oneRepMaxQuery = useQuery({
        queryKey: oneRepMaxKeys.latest(exerciseId!),
        queryFn: async () => {
            const result = await getLatestOneRepMax(exerciseId!);
            return result ?? null;
        },
        enabled: !!exerciseId,
    });

    return {
        trend: trendQuery.data ?? null,
        history: historyQuery.data,
        oneRepMax: oneRepMaxQuery.data ?? null,
        isLoading: trendQuery.isLoading || historyQuery.isLoading || oneRepMaxQuery.isLoading,
    };
}
