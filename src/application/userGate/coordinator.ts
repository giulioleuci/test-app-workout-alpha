import type { GlobalUser } from '@/domain/global-entities';

export type UserGateState =
  | { kind: 'loading' }
  | { kind: 'onboarding' }
  | { kind: 'select-user'; users: GlobalUser[]; pinTarget: GlobalUser | null; canGoBack: boolean }
  | { kind: 'ready' };

export interface UserGateSystemPort {
  initialize(): Promise<void>;
  getLastActiveUserId(): Promise<string | null>;
  mountUser(userId: string): Promise<void>;
  unmountUser(): Promise<void>;
}

export interface UserGateUsersPort { listUsers(): Promise<GlobalUser[]>; }

/** Coordinates bootstrap and user-session transitions without depending on React or Dexie. */
export class UserGateCoordinator {
  constructor(private readonly system: UserGateSystemPort, private readonly users: UserGateUsersPort) {}

  async bootstrap(syncLanguage: () => Promise<void>): Promise<UserGateState> {
    await this.system.initialize();
    await syncLanguage();
    const [lastUserId, users] = await Promise.all([this.system.getLastActiveUserId(), this.users.listUsers()]);
    if (users.length === 0) return { kind: 'onboarding' };
    const lastUser = users.find((user) => user.id === lastUserId);
    if (!lastUser) return this.selection(users, null, false);
    if (lastUser.pinHash) return this.selection(users, lastUser, false);
    await this.system.mountUser(lastUser.id);
    return { kind: 'ready' };
  }

  async refreshAfterUserCreated(): Promise<UserGateState> {
    await this.users.listUsers();
    return { kind: 'ready' };
  }

  async selectUser(user: GlobalUser, users: GlobalUser[]): Promise<UserGateState> {
    if (user.pinHash) return this.selection(users, user, false);
    await this.system.mountUser(user.id);
    return { kind: 'ready' };
  }

  async unlockUser(userId: string): Promise<UserGateState> {
    await this.system.mountUser(userId);
    return { kind: 'ready' };
  }

  async switchUser(resetActiveSession: () => void, clearQueryCache: () => void, wasReady: boolean): Promise<UserGateState> {
    resetActiveSession();
    clearQueryCache();
    await this.system.unmountUser();
    const users = await this.users.listUsers();
    if (users.length === 0) return { kind: 'onboarding' };
    return this.selection(users, null, wasReady);
  }

  async goBack(users: GlobalUser[]): Promise<UserGateState | null> {
    const lastUserId = await this.system.getLastActiveUserId();
    const user = users.find((candidate) => candidate.id === lastUserId);
    if (!user) return null;
    if (user.pinHash) return this.selection(users, user, false);
    await this.system.mountUser(user.id);
    return { kind: 'ready' };
  }

  private selection(users: GlobalUser[], pinTarget: GlobalUser | null, canGoBack: boolean): UserGateState {
    return { kind: 'select-user', users, pinTarget, canGoBack };
  }
}
