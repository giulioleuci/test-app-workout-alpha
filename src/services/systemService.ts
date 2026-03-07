import { databaseLifecycle } from '@/db/core';

export const systemService = {
  initialize: async (): Promise<void> => {
    await databaseLifecycle.initialize();
  },

  mountUser: async (userId: string): Promise<void> => {
    await databaseLifecycle.mountUser(userId);
  },

  unmountUser: async (): Promise<void> => {
    await databaseLifecycle.unmountUser();
  },

  getUserId: (): string => {
    return databaseLifecycle.getUserId();
  },

  isUserMounted: (): boolean => {
    return databaseLifecycle.isUserMounted();
  },

  getLastActiveUserId: async (): Promise<string | null> => {
    return databaseLifecycle.getLastActiveUserId();
  },

  setLastActiveUserId: async (userId: string | null): Promise<void> => {
    await databaseLifecycle.setLastActiveUserId(userId);
  },

  deleteUserDatabase: async (userId: string): Promise<void> => {
    await databaseLifecycle.deleteDatabase(userId);
  },

  getCurrentUserId: (): string => {
    return databaseLifecycle.isUserMounted() ? databaseLifecycle.getUserId() : 'default';
  }
};
