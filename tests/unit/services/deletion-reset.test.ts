import Dexie from 'dexie';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { globalUserRepository, globalDb } from '@/db/core';
import { SystemMaintenanceService } from '@/services/systemMaintenanceService';
import { systemService } from '@/services/systemService';
import { userService } from '@/services/userService';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

describe('Account Deletion and App Reset', () => {
  beforeEach(async () => {
    // Clear all before each test
    await globalDb.users.clear();
    await globalDb.appState.clear();
    localStorage.clear();
    useActiveSessionStore.getState().reset();
    await systemService.initialize();
  });

  it('userService.deleteCurrentUser should clear active session and delete user data', async () => {
    // 1. Setup a user and an active session
    const user = await userService.createUser('Delete Me');
    await systemService.mountUser(user.id);
    
    useActiveSessionStore.getState().setActiveSession('session-1');
    // Verify it's set
    expect(useActiveSessionStore.getState().activeSessionId).toBe('session-1');
    
    // Manually set some items in localStorage that we expect to be cleared
    const userId = user.id;
    const sessionKey = `active-session-store-default`; // Current known key due to early eval
    const userSpecificKey = `active-session-store-${userId}`;
    
    localStorage.setItem(sessionKey, 'some-data');
    localStorage.setItem(userSpecificKey, 'some-data');

    // 2. Delete current user
    await userService.deleteCurrentUser();

    // 3. Verify user is gone from global repo
    const users = await globalUserRepository.getAll();
    expect(users.find(u => u.id === user.id)).toBeUndefined();

    // 4. Verify active session store is reset in-memory
    expect(useActiveSessionStore.getState().activeSessionId).toBeNull();
    
    // 5. Verify localStorage keys are cleared
    expect(localStorage.getItem(sessionKey)).toBeNull();
    expect(localStorage.getItem(userSpecificKey)).toBeNull();
    
    // 6. Verify lastActiveUserId is cleared if it was this user
    const lastActive = await systemService.getLastActiveUserId();
    expect(lastActive).toBeNull();
  });

  it('SystemMaintenanceService.resetWholeApplication should clear EVERYTHING', async () => {
    // 1. Setup multiple users
    await userService.createUser('User 1');
    await userService.createUser('User 2');
    localStorage.setItem('app-theme', 'dark');
    localStorage.setItem('app-color-palette', 'vibrant');

    // 2. Perform reset
    await SystemMaintenanceService.resetWholeApplication();

    // 3. Verify no users exist in the (re-initialized or cleared) global repo
    // We re-open the globalDb because resetWholeApplication deleted it (which closes it)
    await globalDb.open();
    const users = await globalUserRepository.getAll();
    expect(users.length).toBe(0);

    // 4. Verify localStorage is empty
    expect(localStorage.getItem('app-theme')).toBeNull();
    expect(localStorage.getItem('app-color-palette')).toBeNull();
    
    // 5. Verify appState is cleared
    const state = await globalDb.appState.get('singleton');
    expect(state).toBeUndefined();
  });
});
