import { useCallback, useEffect, useState } from 'react';

import type { UserGateState } from '@/application/userGate';
import { userGateCoordinator } from '@/composition/userGate';
import type { GlobalUser } from '@/domain/global-entities';
import { useLanguage } from '@/hooks/useLanguage';
import { queryClient } from '@/lib/queryClient';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

/** Presentation adapter for application bootstrap and user-session transitions. */
export function useUserGateViewModel() {
  const [state, setState] = useState<UserGateState>({ kind: 'loading' });
  const { syncLanguage } = useLanguage();

  useEffect(() => {
    let active = true;

    void userGateCoordinator.bootstrap(syncLanguage).then((nextState) => {
      if (active) setState(nextState);
    });

    return () => {
      active = false;
    };
  }, [syncLanguage]);

  const selectUser = useCallback(async (user: GlobalUser) => {
    if (state.kind !== 'select-user') return;
    setState(await userGateCoordinator.selectUser(user, state.users));
  }, [state]);

  const unlockUser = useCallback(async (userId: string) => {
    setState(await userGateCoordinator.unlockUser(userId));
  }, []);

  const switchUser = useCallback(async () => {
    setState(await userGateCoordinator.switchUser(
      useActiveSessionStore.getState().reset,
      () => queryClient.clear(),
      state.kind === 'ready',
    ));
  }, [state.kind]);

  const goBack = useCallback(async () => {
    if (state.kind !== 'select-user') return;
    const nextState = await userGateCoordinator.goBack(state.users);
    if (nextState) setState(nextState);
  }, [state]);

  const cancelPin = useCallback(() => {
    if (state.kind !== 'select-user') return;
    setState({ ...state, pinTarget: null });
  }, [state]);

  const userCreated = useCallback(async (_userId: string) => {
    setState(await userGateCoordinator.refreshAfterUserCreated());
  }, []);

  const completeOnboarding = useCallback(() => {
    setState({ kind: 'select-user', users: [], pinTarget: null, canGoBack: false });
  }, []);

  return {
    state,
    selectUser,
    unlockUser,
    switchUser,
    goBack,
    cancelPin,
    userCreated,
    completeOnboarding,
  };
}
