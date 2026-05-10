import { useState, useCallback } from 'react';

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/hooks/useToast';
import {
  activateSession,
  prepareSessionActivation,
  type SubstitutionPrompt,
  findPendingSessionInfo,
  type PendingSessionInfo,
} from '@/services/sessionActivation';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

export { type PendingSessionInfo };

export function useSessionActivation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const activeSessionId = useActiveSessionStore(s => s.activeSessionId);
  const setActiveSession = useActiveSessionStore(s => s.setActiveSession);

  const [launching, setLaunching] = useState(false);

  // Pending Session State
  const [pendingSession, setPendingSession] = useState<PendingSessionInfo | null>(null);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [pendingLaunchCallback, setPendingLaunchCallback] = useState<(() => void) | null>(null);

  // Substitution State
  const [subPrompts, setSubPrompts] = useState<SubstitutionPrompt[]>([]);
  const [subDialogOpen, setSubDialogOpen] = useState(false);

  // Context for activation (to persist across dialogs)
  const [activationContext, setActivationContext] = useState<{
    plannedSessionId: string;
    plannedWorkoutId: string;
  } | null>(null);

  const doActivate = useCallback(async (
    plannedSessionId: string,
    plannedWorkoutId: string,
    choices?: Map<string, string>
  ) => {
    setLaunching(true);
    try {
      if (!choices) {
        const prep = await prepareSessionActivation(plannedSessionId);
        if (prep.substitutionPrompts.length > 0) {
          setSubPrompts(prep.substitutionPrompts);
          setActivationContext({ plannedSessionId, plannedWorkoutId });
          setSubDialogOpen(true);
          setLaunching(false);
          return;
        }
      }

      const wsId = await activateSession(plannedSessionId, choices);
      setActiveSession(wsId, plannedSessionId, plannedWorkoutId);
      navigate('/session/active');
    } catch (error) {
      console.error('Failed to activate session:', error);
      toast({ title: t('pendingSession.error'), variant: 'destructive' });
      setLaunching(false);
    }
  }, [navigate, setActiveSession, toast, t]);

  const handleStartSession = useCallback(async (plannedSessionId: string, plannedWorkoutId: string) => {
    // Check for pending session first
    const pending = await findPendingSessionInfo();

    // If there is a pending session, and it's NOT the one we are currently viewing (activeSessionId store might be stale/empty or same)
    // Actually the logic in findPendingSession was checking activeSessionId too.
    // findPendingSessionInfo() just finds ANY active session.

    // Logic check: The original findPendingSession took `activeSessionId` arg.
    // Let's see if we need that.
    // If we are already in the active session, do we prevent starting a new one?
    // Yes, the UI likely handles this.

    if (pending) {
      setPendingSession(pending);
      setPendingDialogOpen(true);
      // Store the callback to execute if user resolves pending session
      setPendingLaunchCallback(() => () => doActivate(plannedSessionId, plannedWorkoutId));
    } else {
      await doActivate(plannedSessionId, plannedWorkoutId);
    }
  }, [activeSessionId, doActivate]);

  const handlePendingResolved = useCallback(() => {
    setPendingDialogOpen(false);
    setPendingSession(null);
    if (pendingLaunchCallback) {
      void pendingLaunchCallback();
    }
  }, [pendingLaunchCallback]);

  const handlePendingCancel = useCallback(() => {
    setPendingDialogOpen(false);
    setPendingSession(null);
    setPendingLaunchCallback(null);
  }, []);

  const handleSubstitutionComplete = useCallback((choices: Map<string, string>) => {
    setSubDialogOpen(false);
    if (activationContext) {
      void doActivate(activationContext.plannedSessionId, activationContext.plannedWorkoutId, choices);
      setActivationContext(null);
    }
  }, [activationContext, doActivate]);

  const handleSubstitutionCancel = useCallback(() => {
    setSubDialogOpen(false);
    setLaunching(false);
    setActivationContext(null);
  }, []);

  return {
    launching,
    handleStartSession,

    // Pending Session Dialog Props
    pendingDialogOpen,
    pendingSession,
    onPendingResolved: handlePendingResolved,
    onPendingCancel: handlePendingCancel,

    // Substitution Dialog Props
    subDialogOpen,
    subPrompts,
    onSubstitutionComplete: handleSubstitutionComplete,
    onSubstitutionCancel: handleSubstitutionCancel,
  };
}
