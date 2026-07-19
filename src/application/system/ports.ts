import type { GlobalAppState } from '@/domain/global-entities';

export interface SystemPort {
  initialize(): Promise<void>; mountUser(userId: string): Promise<void>; unmountUser(): Promise<void>;
  getUserId(): string; isUserMounted(): boolean; getLastActiveUserId(): Promise<string | null>;
  updateGlobalAppState(update: Partial<GlobalAppState>): Promise<void>; getGlobalAppState(): Promise<GlobalAppState | undefined>;
  deleteUserDatabase(userId: string): Promise<void>;
}
