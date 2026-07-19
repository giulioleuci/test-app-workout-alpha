import type { GlobalAppState } from '@/domain/global-entities';

import type { SystemPort } from './ports';
export class SystemUseCases {
  constructor(private readonly system: SystemPort) {}
  initialize() { return this.system.initialize(); } mountUser(id: string) { return this.system.mountUser(id); } unmountUser() { return this.system.unmountUser(); }
  getUserId() { return this.system.getUserId(); } isUserMounted() { return this.system.isUserMounted(); } getLastActiveUserId() { return this.system.getLastActiveUserId(); }
  setLastActiveUserId(userId: string | null) { return this.system.updateGlobalAppState({ lastActiveUserId: userId }); }
  getGlobalAppState() { return this.system.getGlobalAppState(); } updateGlobalAppState(update: Partial<GlobalAppState>) { return this.system.updateGlobalAppState(update); }
  deleteUserDatabase(id: string) { return this.system.deleteUserDatabase(id); } getCurrentUserId() { return this.system.isUserMounted() ? this.system.getUserId() : 'default'; }
}
