import { nanoid } from 'nanoid';

import { globalUserRepository } from '@/db/core';
import { AVATAR_COLORS, type GlobalUser } from '@/domain/global-entities';
import { systemService } from '@/services/systemService';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

export const userService = {
  listUsers: async (): Promise<GlobalUser[]> => {
    return globalUserRepository.getAll();
  },

  getUser: async (id: string): Promise<GlobalUser | undefined> => {
    return globalUserRepository.getById(id);
  },

  // FEATURE HIDDEN: PIN logic is retained but hidden from UI
  createUser: async (name: string, pinHash: string | null = null, avatarColor?: string): Promise<GlobalUser> => {
    const count = await globalUserRepository.count();
    const user: GlobalUser = {
      id: nanoid(),
      name,
      pinHash,
      avatarColor: avatarColor ?? AVATAR_COLORS[count % AVATAR_COLORS.length],
      createdAt: new Date(),
    };
    await globalUserRepository.add(user);
    return user;
  },

  deleteCurrentUser: async (): Promise<void> => {
    const userId = systemService.getUserId();
    
    // 1. Reset in-memory active session store
    useActiveSessionStore.getState().reset();
    
    // 2. Clear persisted state for this specific user if possible
    // We try multiple keys because systemService.getCurrentUserId() 
    // might evaluate to 'default' or the actual userId depending on the mount state.
    localStorage.removeItem(`active-session-store-${userId}`);
    localStorage.removeItem('active-session-store-default');
    
    await systemService.unmountUser();
    await systemService.deleteUserDatabase(userId);
    await globalUserRepository.delete(userId);

    const lastActive = await systemService.getLastActiveUserId();
    if (lastActive === userId) {
      await systemService.setLastActiveUserId(null);
    }
  },

  // If needed for admin or non-current user deletion
  deleteUser: async (id: string): Promise<void> => {
      // Potentially also delete their DB?
      // Assuming deleteCurrentUser is the main use case for now.
      await globalUserRepository.delete(id);
  }
};
