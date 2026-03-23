import { createContext, useContext } from 'react';

export const SwitchUserContext = createContext<(() => Promise<void>) | null>(null);

export function useSwitchUser() {
  const ctx = useContext(SwitchUserContext);
  if (!ctx) throw new Error('useSwitchUser must be used within UserGate');
  return ctx;
}
