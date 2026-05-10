import { useEffect, useCallback } from 'react';

import { useBlocker } from 'react-router-dom';

interface UseUnsavedChangesOptions {
  isDirty: boolean;
  onSave: () => Promise<void>;
  onDiscard: () => void;
}

export function useUnsavedChanges({ isDirty, onSave, onDiscard }: UseUnsavedChangesOptions) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // Browser beforeunload
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const confirmSaveAndLeave = useCallback(async () => {
    await onSave();
    if (blocker.state === 'blocked') blocker.proceed();
  }, [onSave, blocker]);

  const confirmLeaveWithout = useCallback(() => {
    onDiscard();
    if (blocker.state === 'blocked') blocker.proceed();
  }, [onDiscard, blocker]);

  const cancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);

  return {
    isNavigationBlocked: blocker.state === 'blocked',
    confirmSaveAndLeave,
    confirmLeaveWithout,
    cancelNavigation,
  };
}
