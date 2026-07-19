import { AVATAR_COLORS, type GlobalUser } from '@/domain/global-entities';

import type { StoragePort, UserLifecyclePort, UsersPort } from './ports';
export class UserUseCases {
  constructor(private readonly users: UsersPort, private readonly lifecycle: UserLifecyclePort, private readonly storage: StoragePort, private readonly createId: () => string, private readonly now: () => Date) {}
  listUsers() { return this.users.getAll(); } getUser(id: string) { return this.users.getById(id); }
  async createUser(name: string, pinHash: string | null = null, avatarColor?: string): Promise<GlobalUser> { const count = await this.users.count(); const user: GlobalUser = { id: this.createId(), name, pinHash, avatarColor: avatarColor ?? AVATAR_COLORS[count % AVATAR_COLORS.length], createdAt: this.now() }; await this.users.add(user); return user; }
  async deleteCurrentUser(): Promise<void> { const id = this.lifecycle.getUserId(); this.storage.removeItem(`active-session-store-${id}`); this.storage.removeItem('active-session-store-default'); await this.lifecycle.unmountUser(); await this.lifecycle.deleteUserDatabase(id); await this.users.delete(id); if (await this.lifecycle.getLastActiveUserId() === id) await this.lifecycle.setLastActiveUserId(null); }
  deleteUser(id: string) { return this.users.delete(id); }
}
