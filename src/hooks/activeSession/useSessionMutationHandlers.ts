import { sessionExecutionCommands } from '@/composition/sessionExecution';
import type { LoadedGroup } from '@/domain/activeSessionTypes';
import { ExerciseGroupType } from '@/domain/enums';

export function useSessionMutationHandlers(
  activeSessionId: string | null,
  loadedGroups: LoadedGroup[],
  loadData: () => void,
) {
    const handleSwapExercise = async (sessionExerciseItemId: string, newExerciseId: string) => {
        if (!activeSessionId) return;
        await sessionExecutionCommands.swapExercise(activeSessionId, sessionExerciseItemId, newExerciseId);
        loadData();
    };

    const handleQuickAddExercise = async (exerciseId: string) => {
        if (!activeSessionId) return;
        const insertIndex = loadedGroups.length;
        await sessionExecutionCommands.quickAddExercise(activeSessionId, exerciseId, insertIndex);
        loadData();
    };

    const handleQuickAddSuperset = async (exerciseIds: string[], groupType: ExerciseGroupType) => {
        if (!activeSessionId) return;
        const insertIndex = loadedGroups.length;
        await sessionExecutionCommands.quickAddSuperset(activeSessionId, exerciseIds, groupType, insertIndex);
        loadData();
    };

    const handleRemoveExercise = async (sessionExerciseItemId: string) => {
        await sessionExecutionCommands.removeExercise(sessionExerciseItemId);
        loadData();
    };

    return {
        handleSwapExercise,
        handleQuickAddExercise,
        handleQuickAddSuperset,
        handleRemoveExercise,
    };
}
