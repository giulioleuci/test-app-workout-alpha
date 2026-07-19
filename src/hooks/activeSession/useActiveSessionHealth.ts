import { useMemo } from 'react';

import type { LoadedGroup } from '@/domain/activeSessionTypes';

export interface SessionHealth {
    completionPercentage: number;
    currentVolume: number;
    completedSets: number;
    totalSets: number;
    completedExercises: number;
    totalExercises: number;
}

export function useActiveSessionHealth(loadedGroups: LoadedGroup[]): SessionHealth {
    return useMemo(() => {
        let totalSets = 0;
        let completedSets = 0;
        let totalExercises = 0;
        let completedExercises = 0;
        let currentVolume = 0;

        for (const group of loadedGroups) {
            for (const item of group.items) {
                totalExercises++;
                let itemCompleted = true;

                for (const set of item.sets) {
                    totalSets++;
                    if (set.isCompleted) {
                        completedSets++;
                        const load = set.actualLoad ?? 0;
                        const count = set.actualCount ?? 0;
                        currentVolume += load * count;
                    } else if (!set.isSkipped) {
                        itemCompleted = false;
                    }
                }

                // An item is "completed" if all its sets are completed or skipped
                if (itemCompleted && item.sets.length > 0) {
                    completedExercises++;
                }
            }
        }

        const completionPercentage = totalSets > 0
            ? Math.round((completedSets / totalSets) * 100)
            : 0;

        return {
            completionPercentage,
            currentVolume,
            completedSets,
            totalSets,
            completedExercises,
            totalExercises,
        };
    }, [loadedGroups]);
}
