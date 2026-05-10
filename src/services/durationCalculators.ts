import type { PlannedSet } from '@/domain/entities';
import { CounterType } from '@/domain/enums';
import type { ClusterSetParams } from '@/domain/value-objects';

export interface DurationRange {
    minSeconds: number;
    maxSeconds: number;
}

/** Estimate duration of a single set execution (not counting rest) */
export function estimateSetExecutionSeconds(set: PlannedSet, counterType: CounterType): DurationRange {
    const repsMin = set.countRange.min;
    const repsMax = set.countRange.max;

    switch (counterType) {
        case CounterType.Reps: {
            const effectiveMax = repsMax ?? repsMin * 2;
            return {
                minSeconds: repsMin * 4,
                maxSeconds: effectiveMax * 4,
            };
        }
        case CounterType.Seconds:
            return { minSeconds: repsMin, maxSeconds: repsMax ?? repsMin * 2 };
        case CounterType.Minutes:
            return { minSeconds: repsMin * 60, maxSeconds: (repsMax ?? repsMin * 2) * 60 };
        case CounterType.DistanceKMeter:
            return { minSeconds: repsMin * 5 * 60, maxSeconds: (repsMax ?? repsMin) * 10 * 60 };
        case CounterType.DistanceMeter:
            return { minSeconds: (repsMin / 1000) * 5 * 60, maxSeconds: ((repsMax ?? repsMin) / 1000) * 10 * 60 };
        default:
            return { minSeconds: repsMin * 4, maxSeconds: (repsMax ?? repsMin * 2) * 4 };
    }
}

/** Estimate total duration for a planned set block (set count × execution + rest) */
export function estimateSetBlockSeconds(
    set: PlannedSet,
    counterType: CounterType,
    clusterParams?: ClusterSetParams,
): DurationRange {
    if (clusterParams) {
        const miniSetExec = clusterParams.miniSetReps * 4;
        const miniSetCount = clusterParams.miniSetCount;
        const miniRest = clusterParams.interMiniSetRestSeconds;
        const setsMin = set.setCountRange.min;
        const setsMax = set.setCountRange.max ?? setsMin;
        const restMin = set.restSecondsRange?.min ?? 90;
        const restMax = set.restSecondsRange?.max ?? restMin;

        const oneCluster = miniSetCount * miniSetExec + Math.max(0, miniSetCount - 1) * miniRest;
        return {
            minSeconds: setsMin * oneCluster + Math.max(0, setsMin - 1) * restMin,
            maxSeconds: setsMax * oneCluster + Math.max(0, setsMax - 1) * restMax,
        };
    }

    const exec = estimateSetExecutionSeconds(set, counterType);
    const setsMin = set.setCountRange.min;
    const setsMax = set.setCountRange.max ?? setsMin;
    const restMin = set.restSecondsRange?.min ?? 90;
    const restMax = set.restSecondsRange?.max ?? restMin;

    return {
        minSeconds: setsMin * exec.minSeconds + Math.max(0, setsMin - 1) * restMin,
        maxSeconds: setsMax * exec.maxSeconds + Math.max(0, setsMax - 1) * restMax,
    };
}
