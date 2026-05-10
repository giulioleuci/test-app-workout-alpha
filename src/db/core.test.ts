import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, it, expect, beforeEach } from 'vitest';

import { hashPin, verifyPin } from '@/services/authService';
import { systemService } from '@/services/systemService';
import { userService } from '@/services/userService';

// This test file now tests the integrated system/user services
describe('System and User Services', () => {
  beforeEach(async () => {
    if (systemService.isUserMounted()) {
        await systemService.unmountUser();
    }
    await Dexie.delete('WT_GlobalMeta');
    await systemService.initialize();
  });

  it('initializes with no users', async () => {
    const users = await userService.listUsers();
    expect(users).toHaveLength(0);
    // Helper to check if mounted? systemService doesn't expose isUserMounted directly but getUserId throws.
    expect(() => systemService.getUserId()).toThrow();
  });

  it('creates a user and lists it', async () => {
    const user = await userService.createUser('Alice');
    const users = await userService.listUsers();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('Alice');
    expect(user.pinHash).toBeNull();
  });

  it('creates a user with a PIN', async () => {
    const hash = await hashPin('1234');
    const user = await userService.createUser('Bob', hash);
    expect(user.pinHash).toBeTruthy();
    expect(user.pinHash).toBe(hash);
  });

  it('verifies correct PIN', async () => {
    const hash = await hashPin('5678');
    const user = await userService.createUser('Carol', hash);
    // Verified via authService
    if (!user.pinHash) throw new Error('Pin hash missing');
    expect(await verifyPin('5678', user.pinHash)).toBe(true);
    expect(await verifyPin('0000', user.pinHash)).toBe(false);
  });

  it('mounts a user database', async () => {
    const user = await userService.createUser('Dave');
    await systemService.mountUser(user.id);
    expect(systemService.getUserId()).toBe(user.id);
  });

  it('unmounts a user database', async () => {
    const user = await userService.createUser('Eve');
    await systemService.mountUser(user.id);
    await systemService.unmountUser();
    expect(() => systemService.getUserId()).toThrow();
  });

  it('saves lastActiveUserId on mount', async () => {
    const user = await userService.createUser('Frank');
    await systemService.mountUser(user.id);
    expect(await systemService.getLastActiveUserId()).toBe(user.id);
  });

  it('deletes current user and their database', async () => {
    const user = await userService.createUser('Grace');
    await systemService.mountUser(user.id);
    await userService.deleteCurrentUser();
    expect(() => systemService.getUserId()).toThrow();
    const users = await userService.listUsers();
    expect(users).toHaveLength(0);
  });
});
