import type { LoadedGroup } from '@/domain/activeSessionTypes';
import { ExerciseGroupType } from '@/domain/enums';
import { SessionExecutionService } from '@/services/sessionExecutionService';

export function useSessionMutationHandlers(
  activeSessionId: string | null,
  loadedGroups: LoadedGroup[],
  loadData: () => void,
) {
    const handleSwapExercise = async (sessionExerciseItemId: string, newExerciseId: string) => {
        if (!activeSessionId) return;
        await SessionExecutionService.swapExercise(activeSessionId, sessionExerciseItemId, newExerciseId);
        loadData();
    };

    const handleQuickAddExercise = async (exerciseId: string) => {
        if (!activeSessionId) return;
        const insertIndex = loadedGroups.length;
        await SessionExecutionService.quickAddExercise(activeSessionId, exerciseId, insertIndex);
        loadData();
    };

    const handleQuickAddSuperset = async (exerciseIds: string[], groupType: ExerciseGroupType) => {
        if (!activeSessionId) return;
        const insertIndex = loadedGroups.length;
        await SessionExecutionService.quickAddSuperset(activeSessionId, exerciseIds, groupType, insertIndex);
        loadData();
    };

    const handleRemoveExercise = async (sessionExerciseItemId: string) => {
        await SessionExecutionService.removeExercise(sessionExerciseItemId);
        loadData();
    };

    return {
        handleSwapExercise,
        handleQuickAddExercise,
        handleQuickAddSuperset,
        handleRemoveExercise,
    };
}
