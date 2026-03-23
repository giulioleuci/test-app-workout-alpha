import { useState, useEffect, useCallback, lazy, Suspense } from 'react';

import type { GlobalUser } from '@/domain/global-entities';
import { useLanguage } from '@/hooks/useLanguage';
import { SwitchUserContext } from '@/hooks/useSwitchUser';
import { queryClient } from '@/lib/queryClient';
import { systemService } from '@/services/systemService';
import { userService } from '@/services/userService';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

const UserSelectionPage = lazy(() => import('@/pages/UserSelectionPage'));

export function UserGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'select' | 'mounted'>('loading');
  const [canGoBack, setCanGoBack] = useState(false);
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [pinTarget, setPinTarget] = useState<GlobalUser | null>(null);
  const { syncLanguage } = useLanguage();

  const loadUsers = useCallback(async () => {
    const list = await userService.listUsers();
    setUsers(list);
    return list;
  }, []);

  useEffect(() => {
    void (async () => {
      await systemService.initialize();
      await syncLanguage();
      const lastUserId = await systemService.getLastActiveUserId();
      const userList = await loadUsers();

      if (lastUserId) {
        const lastUser = userList.find(u => u.id === lastUserId);
        if (lastUser) {
          if (lastUser.pinHash) {
            setPinTarget(lastUser);
            setState('select');
          } else {
            await systemService.mountUser(lastUser.id);
            setState('mounted');
          }
          return;
        }
      }
      setState('select');
    })();
  }, [loadUsers, syncLanguage]);

  const handleSelectUser = async (user: GlobalUser) => {
    if (user.pinHash) {
      setPinTarget(user);
    } else {
      await systemService.mountUser(user.id);
      setState('mounted');
      setCanGoBack(false);
    }
  };

  const handlePinSuccess = async (userId: string) => {
    await systemService.mountUser(userId);
    setPinTarget(null);
    setState('mounted');
    setCanGoBack(false);
  };

  const handleSwitchUser = useCallback(async () => {
    const mounted = state === 'mounted';
    useActiveSessionStore.getState().reset();
    queryClient.clear();
    await systemService.unmountUser();
    const userList = await loadUsers();
    setUsers(userList);
    setPinTarget(null);
    setCanGoBack(mounted);
    setState('select');
  }, [loadUsers, state]);

  const handleGoBack = useCallback(async () => {
    const lastUserId = await systemService.getLastActiveUserId();
    if (lastUserId) {
      const user = users.find(u => u.id === lastUserId);
      if (user) {
        if (user.pinHash) {
          setPinTarget(user);
        } else {
          await systemService.mountUser(user.id);
          setState('mounted');
        }
        setCanGoBack(false);
      }
    }
  }, [users]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">...</div>
      </div>
    );
  }

  if (state === 'select') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <UserSelectionPage
          users={users}
          pinTarget={pinTarget}
          onSelectUser={handleSelectUser}
          onPinSuccess={handlePinSuccess}
          onPinCancel={() => setPinTarget(null)}
          onUserCreated={loadUsers}
          onGoBack={canGoBack ? handleGoBack : undefined}
        />
      </Suspense>
    );
  }

  return (
    <SwitchUserContext.Provider value={handleSwitchUser}>
      {children}
    </SwitchUserContext.Provider>
  );
}
