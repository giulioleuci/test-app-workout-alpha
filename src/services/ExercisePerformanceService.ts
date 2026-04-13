import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type { SessionSet, SessionExerciseItem } from '@/domain/entities';

export type PerformanceTrendStatus = 'improving' | 'stable' | 'stagnant' | 'deteriorating' | 'insufficient_data';

export class ExercisePerformanceService {
    /**
     * Analyzes all exercises in a completed session.
     * Finds historical twin and computes aggregate metrics.
     */
    static async analyzeSession(sessionId: string): Promise<void> {
        const hydrated = await SessionRepository.getHydratedSession(sessionId);

        if (!hydrated?.session.plannedWorkoutId || !hydrated.session.plannedSessionId || !hydrated.session.completedAt) {
            if (hydrated) {
                for (const group of hydrated.groups) {
                    for (const item of group.items) {
                        await this.updateItem(item.item.id, 'insufficient_data', false);
                    }
                }
            }
            return;
        }

        const currentSession = hydrated.session;

        if (!currentSession.plannedWorkoutId || !currentSession.plannedSessionId || !currentSession.completedAt) return;

        // Fetch the single most recent previous session T_{-1}
        const candidates = await SessionRepository.findPreviousSessionsForPerformance(
            currentSession.plannedWorkoutId,
            currentSession.plannedSessionId,
            currentSession.completedAt,
            1
        );

        const previousHydrated = candidates.length > 0 ? (await SessionRepository.getHydratedSessions(candidates))[0] : null;

        for (const group of hydrated.groups) {
            for (const item of group.items) {
                // Calculate hasRangeConstraint
                let hasRangeConstraint = false;
                if (item.item.plannedExerciseItemId) {
                    const plannedItem = await WorkoutPlanRepository.getItem(item.item.plannedExerciseItemId);
                    if (plannedItem) {
                        const plannedSets = await WorkoutPlanRepository.getSetsByItem(plannedItem.id);
                        for (const pSet of plannedSets) {
                            if (
                                (pSet.setCountRange && pSet.setCountRange.min !== pSet.setCountRange.max) ||
                                (pSet.countRange && pSet.countRange.min !== pSet.countRange.max) ||
                                (pSet.loadRange && pSet.loadRange.min !== pSet.loadRange.max) ||
                                (pSet.rpeRange && pSet.rpeRange.min !== pSet.rpeRange.max)
                            ) {
                                hasRangeConstraint = true;
                                break;
                            }
                        }
                    }
                }

                const currentExerciseId = item.item.exerciseId;
                const currentOriginalId = item.item.originalExerciseId;

                // Calculate occurrence index
                const exerciseOccurrenceIndex = group.items
                    .filter(i => i.item.orderIndex < item.item.orderIndex)
                    .filter(i => i.item.exerciseId === currentExerciseId || i.item.originalExerciseId === currentExerciseId)
                    .length;

                // Find match in previous session
                let previousItem: SessionExerciseItem | null = null;
                let previousSets: SessionSet[] = [];

                if (previousHydrated) {
                    const matchedGroup = previousHydrated.groups.find(g => g.group.orderIndex === group.group.orderIndex);
                    if (matchedGroup) {
                        const itemsOfSameExercise = matchedGroup.items.filter(i =>
                            i.item.exerciseId === currentExerciseId ||
                            i.item.originalExerciseId === currentExerciseId ||
                            (currentOriginalId && (i.item.exerciseId === currentOriginalId || i.item.originalExerciseId === currentOriginalId))
                        );

                        const matchedHydratedItem = itemsOfSameExercise[exerciseOccurrenceIndex];
                        if (matchedHydratedItem) {
                            previousItem = matchedHydratedItem.item;
                            previousSets = matchedHydratedItem.sets;
                        }
                    }
                }

                const currentSets = item.sets;
                const status = this.compareItems(currentSets, previousSets, previousItem?.performanceStatus, hasRangeConstraint);

                await this.updateItem(item.item.id, status, hasRangeConstraint);
            }
        }
    }

    /**
     * Compares execution of an exercise between two sessions to determine a trend.
     */
    private static compareItems(
        currentSets: SessionSet[],
        previousSets: SessionSet[],
        previousStatus?: 'improving' | 'stable' | 'stagnant' | 'deteriorating' | 'insufficient_data',
        hasRangeConstraint = false
    ): PerformanceTrendStatus {
        const currCompleted = currentSets.filter(s => s.isCompleted && !s.isSkipped);
        const prevCompleted = previousSets.filter(s => s.isCompleted && !s.isSkipped);

        if (currCompleted.length === 0 || prevCompleted.length === 0) {
            return 'insufficient_data';
        }

        const calcMetrics = (sets: SessionSet[]) => {
            const S = sets.length;
            let C = 0;
            let L = 0;
            let F = 0;
            for (const s of sets) {
                C += s.actualCount ?? 0;
                L += (s.actualCount ?? 0) * (s.actualLoad ?? 0);
                F += s.actualRPE ?? 0;
            }
            return { S, C, L, F };
        };

        const curr = calcMetrics(currCompleted);
        const prev = calcMetrics(prevCompleted);

        const dS = curr.S - prev.S;
        const dC = curr.C - prev.C;
        const dL = curr.L - prev.L;
        const dF = curr.F - prev.F;

        const isStableVolumeLoad = dS === 0 && dC === 0 && dL === 0;

        // Improving: (S, C, L) increase and none decrease, OR stable but F decreases
        if ((dS >= 0 && dC >= 0 && dL >= 0 && (dS > 0 || dC > 0 || dL > 0)) || (isStableVolumeLoad && dF < 0)) {
            return 'improving';
        }

        // Deteriorating: (S, C, L) decrease and none increase, OR stable but F increases
        if ((dS <= 0 && dC <= 0 && dL <= 0 && (dS < 0 || dC < 0 || dL < 0)) || (isStableVolumeLoad && dF > 0)) {
            return 'deteriorating';
        }

        // Stable
        if (isStableVolumeLoad && dF === 0) {
            if (hasRangeConstraint && (previousStatus === 'stable' || previousStatus === 'stagnant')) {
                return 'stagnant';
            }
            return 'stable';
        }

        // Default mixed results
        return 'stable';
    }

    /**
     * Directly requested to re-analyze from a single item context (e.g. History updates)
     */
    static async analyzeItemOnChange(itemId: string): Promise<void> {
        const item = await SessionRepository.getItem(itemId);
        if (!item) return;

        const group = await SessionRepository.getGroup(item.sessionExerciseGroupId);
        if (!group) return;

        const session = await SessionRepository.getSession(group.workoutSessionId);
        if (!session?.completedAt || !session.plannedWorkoutId || !session.plannedSessionId) {
            // If it's incomplete or free session, just mark insufficient_data
            await this.updateItem(itemId, 'insufficient_data', false);
            return;
        }

        // Instead of heavy per-item analysis, running full session analysis is fast and reliable
        await this.analyzeSession(session.id);
    }

    private static async updateItem(itemId: string, status: PerformanceTrendStatus, hasRangeConstraint: boolean): Promise<void> {
        await SessionRepository.updateItem(itemId, { performanceStatus: status, hasRangeConstraint });
    }
}
