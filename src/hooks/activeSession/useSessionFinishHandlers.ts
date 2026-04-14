import { useInvalidation } from '@/hooks/queries/useInvalidation';
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
    const { invalidateSessionContext } = useInvalidation();

    const handleEndSession = async (allDone: boolean, title: string, incompleteConfirmDesc: string) => {
        if (!activeSessionId) return;

        const doFinish = async () => {
            await SessionExecutionService.finishSession(activeSessionId);
            await invalidateSessionContext();
            resetSessionStore();
            navigate('/');
        };

        const validation = await SessionExecutionService.validateSessionCompletion(activeSessionId);

        if (!validation.isValid) {
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

        await SessionExecutionService.skipUnresolvedSets(unresolvedSetsState.sets);

        setUnresolvedSetsState({ open: false, sets: [] });
        await SessionExecutionService.finishSession(activeSessionId);
        await invalidateSessionContext();
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
                await invalidateSessionContext();
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
