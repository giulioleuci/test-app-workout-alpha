import { lazy, Suspense } from 'react';

import { useUserGateViewModel } from '@/hooks/useUserGateViewModel';
import { SwitchUserContext } from '@/hooks/useSwitchUser';

import { OnboardingFlow } from './auth/OnboardingFlow';

const UserSelectionPage = lazy(() => import('@/pages/UserSelectionPage'));

export function UserGate({ children }: { children: React.ReactNode }) {
  const viewModel = useUserGateViewModel();

  if (viewModel.state.kind === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">...</div>
      </div>
    );
  }

  if (viewModel.state.kind === 'onboarding') {
    return <OnboardingFlow onComplete={viewModel.completeOnboarding} />;
  }

  if (viewModel.state.kind === 'select-user') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <UserSelectionPage
          users={viewModel.state.users}
          pinTarget={viewModel.state.pinTarget}
          onSelectUser={viewModel.selectUser}
          onPinSuccess={viewModel.unlockUser}
          onPinCancel={viewModel.cancelPin}
          onUserCreated={viewModel.userCreated}
          onGoBack={viewModel.state.canGoBack ? viewModel.goBack : undefined}
        />
      </Suspense>
    );
  }

  return (
    <SwitchUserContext.Provider value={viewModel.switchUser}>
      {children}
    </SwitchUserContext.Provider>
  );
}
