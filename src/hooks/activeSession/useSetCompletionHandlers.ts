import type { CurrentTarget, LoadedGroup } from '@/domain/activeSessionTypes';
import type { SessionSet } from '@/domain/entities';
import { SessionExecutionService } from '@/services/sessionExecutionService';
import { nativeDeviceService } from '@/services/nativeDeviceService';

export function useSetCompletionHandlers(
    current: CurrentTarget | null,
    loadData: () => void,
    startRestTimer: (seconds: number) => void,
) {
    const handleStartRest = (duration: number) => {
        startRestTimer(duration);
        void nativeDeviceService.scheduleRestNotification(duration);
    };

    const handleCompleteSet = async (updates: Partial<SessionSet>, setId?: string) => {
        const targetSetId = setId || current?.set.id;
        if (!targetSetId) return;

        const { restDuration } = await SessionExecutionService.completeSet(
            targetSetId,
            updates,
            current
        );

        if (restDuration) handleStartRest(restDuration);

        loadData();
    };

    const handleSkipSet = async () => {
        if (!current) return;
        await SessionExecutionService.skipSet(current.set.id);
        loadData();
    };

    const handleSkipRemainingSets = async () => {
        if (!current) return;
        await SessionExecutionService.skipRemainingSets(current);
        loadData();
    };

    const handleAddSet = async (itemId: string) => {
        await SessionExecutionService.addSet(itemId);
        loadData();
    };

    const handleUncompleteSet = async (setId: string) => {
        await SessionExecutionService.uncompleteSet(setId);
        loadData();
    };

    const handleUncompleteLastSet = async (itemId: string) => {
        await SessionExecutionService.uncompleteLastSet(itemId);
    };

    const handleUncompleteLastRound = async (lg: LoadedGroup) => {
        await SessionExecutionService.uncompleteLastRound(lg);
        loadData();
    };

    const handleCompleteRound = async (group: LoadedGroup, roundIndex: number, setsData: Record<string, Partial<SessionSet>>) => {
        const { restDuration } = await SessionExecutionService.completeRound(group, roundIndex, setsData);

        if (restDuration) handleStartRest(restDuration);

        loadData();
    };

    const handleCompleteScreen = async (
        group: LoadedGroup,
        roundIndex: number,
        screenItemIndices: number[],
        setsData: Record<string, Partial<SessionSet>>,
        isLastScreenOfRound: boolean,
    ) => {
        const { restDuration } = await SessionExecutionService.completeScreen(
            group, roundIndex, screenItemIndices, setsData, isLastScreenOfRound
        );

        if (restDuration) handleStartRest(restDuration);

        loadData();
    };

    const handleSkipRound = async () => {
        if (!current) return;
        await SessionExecutionService.skipRound(current);
        loadData();
    };

    const handleSkipRemainingRounds = async () => {
        if (!current) return;
        await SessionExecutionService.skipRemainingRounds(current);
        loadData();
    };

    const handleAddRound = async (group: LoadedGroup) => {
        await SessionExecutionService.addRound(group);
        loadData();
    };

    return {
        handleCompleteSet,
        handleSkipSet,
        handleSkipRemainingSets,
        handleAddSet,
        handleUncompleteSet,
        handleUncompleteLastSet,
        handleUncompleteLastRound,
        handleCompleteRound,
        handleCompleteScreen,
        handleSkipRound,
        handleSkipRemainingRounds,
        handleAddRound,
    };
}
