import { useQueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '@/hooks/queries/dashboardQueries';
import { SessionExecutionService } from '@/services/sessionExecutionService';
import type { UnresolvedSet } from '@/services/sessionMutator';

interface AlertConfig {
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
}

export function useSessionFinishHandlers(
  activeSessionId: string | null,
  resetSessionStore: () => void,
  navigate: (path: string) => void,
  setAlertConfig: (config: AlertConfig) => void,
  unresolvedSetsState: { open: boolean; sets: UnresolvedSet[] },
  setUnresolvedSetsState: (state: { open: boolean; sets: UnresolvedSet[] }) => void,
) {
    const queryClient = useQueryClient();

    const handleEndSession = async (allDone: boolean, title: string, incompleteConfirmDesc: string) => {
        if (!activeSessionId) return;

        const doFinish = async () => {
            await SessionExecutionService.finishSession(activeSessionId);
            await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
            resetSessionStore();
            navigate('/');
        };

        // Run validation to find unresolved sets
        const validation = await SessionExecutionService.validateSessionCompletion(activeSessionId);

        if (!validation.isValid) {
            // Show the unresolved sets dialog
            setUnresolvedSetsState({ open: true, sets: validation.unresolvedSets });
            return;
        }

        if (!allDone) {
            setAlertConfig({
                open: true,
                title,
                description: incompleteConfirmDesc,
                onConfirm: doFinish,
            });
            return;
        }

        await doFinish();
    };

    const handleSkipAllAndFinish = async () => {
        if (!activeSessionId) return;

        // Bulk-mark all unresolved sets as skipped
        await SessionExecutionService.skipUnresolvedSets(unresolvedSetsState.sets);

        setUnresolvedSetsState({ open: false, sets: [] });
        await SessionExecutionService.finishSession(activeSessionId);
        await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
        resetSessionStore();
        navigate('/');
    };

    const handleDiscardSession = (title: string, desc: string) => {
        setAlertConfig({
            open: true,
            title,
            description: desc,
            onConfirm: async () => {
                if (!activeSessionId) return;
                await SessionExecutionService.discardSession(activeSessionId);
                await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
                resetSessionStore();
                navigate('/');
            },
        });
    };

    return {
        handleEndSession,
        handleSkipAllAndFinish,
        handleDiscardSession,
    };
}
