import type { WarmupSet } from '@/application/warmups';
import { sessionExecutionCommands } from '@/composition/sessionExecution';
import type { CurrentTarget, LoadedGroup } from '@/domain/activeSessionTypes';
import type { SessionSet } from '@/domain/entities';
import { useNativeDeviceViewModel } from '@/hooks/view-models/useNativeDeviceViewModel';

export function useSetCompletionHandlers(
    current: CurrentTarget | null,
    loadData: () => void,
    startRestTimer: (seconds: number) => void,
) {
    const { scheduleRestNotification } = useNativeDeviceViewModel();

    const handleStartRest = (duration: number) => {
        startRestTimer(duration);
        void scheduleRestNotification(duration);
    };

    const handleCompleteSet = async (updates: Partial<SessionSet>, setId?: string) => {
        const targetSetId = setId || current?.set.id;
        if (!targetSetId) return;

        const { restDuration } = await sessionExecutionCommands.completeSet(
            targetSetId,
            updates,
            current
        );

        if (restDuration) handleStartRest(restDuration);

        loadData();
    };

    const handleSkipSet = async () => {
        if (!current) return;
        await sessionExecutionCommands.skipSet(current.set.id);
        loadData();
    };

    const handleSkipRemainingSets = async () => {
        if (!current) return;
        await sessionExecutionCommands.skipRemainingSets(current);
        loadData();
    };

    const handleAddSet = async (itemId: string) => {
        await sessionExecutionCommands.addSet(itemId);
        loadData();
    };

    const handleAddWarmupSets = async (itemId: string, warmupSets: WarmupSet[]) => {
        await sessionExecutionCommands.addWarmupSets(itemId, warmupSets);
        loadData();
    };

    const handleUncompleteSet = async (setId: string) => {
        await sessionExecutionCommands.uncompleteSet(setId);
        loadData();
    };

    const handleUncompleteLastSet = async (itemId: string) => {
        await sessionExecutionCommands.uncompleteLastSet(itemId);
        loadData();
    };

    const handleUncompleteLastRound = async (lg: LoadedGroup) => {
        await sessionExecutionCommands.uncompleteLastRound(lg);
        loadData();
    };

    const handleCompleteRound = async (group: LoadedGroup, roundIndex: number, setsData: Record<string, Partial<SessionSet>>) => {
        const { restDuration } = await sessionExecutionCommands.completeRound(group, roundIndex, setsData);

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
        const { restDuration } = await sessionExecutionCommands.completeScreen(
            group, roundIndex, screenItemIndices, setsData, isLastScreenOfRound
        );

        if (restDuration) handleStartRest(restDuration);

        loadData();
    };

    const handleSkipRound = async () => {
        if (!current) return;
        await sessionExecutionCommands.skipRound(current);
        loadData();
    };

    const handleSkipRemainingRounds = async () => {
        if (!current) return;
        await sessionExecutionCommands.skipRemainingRounds(current);
        loadData();
    };

    const handleAddRound = async (group: LoadedGroup) => {
        await sessionExecutionCommands.addRound(group);
        loadData();
    };

    return {
        handleCompleteSet,
        handleSkipSet,
        handleSkipRemainingSets,
        handleAddSet,
        handleAddWarmupSets,
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
