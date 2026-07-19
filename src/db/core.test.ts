import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, it, expect, beforeEach } from 'vitest';

import { systemCommands } from '@/composition/system';
import { userCommands } from '@/composition/users';
import { hashPin, verifyPin } from '@/services/authService';

// This test file now tests the integrated system/user services
describe('System and User Services', () => {
  beforeEach(async () => {
    if (systemCommands.isUserMounted()) {
        await systemCommands.unmountUser();
    }
    await Dexie.delete('WT_GlobalMeta');
    await systemCommands.initialize();
  });

  it('initializes with no users', async () => {
    const users = await userCommands.listUsers();
    expect(users).toHaveLength(0);
    // Helper to check if mounted? systemService doesn't expose isUserMounted directly but getUserId throws.
    expect(() => systemCommands.getUserId()).toThrow();
  });

  it('creates a user and lists it', async () => {
    const user = await userCommands.createUser('Alice');
    const users = await userCommands.listUsers();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('Alice');
    expect(user.pinHash).toBeNull();
  });

  it('creates a user with a PIN', async () => {
    const hash = await hashPin('1234');
    const user = await userCommands.createUser('Bob', hash);
    expect(user.pinHash).toBeTruthy();
    expect(user.pinHash).toBe(hash);
  });

  it('verifies correct PIN', async () => {
    const hash = await hashPin('5678');
    const user = await userCommands.createUser('Carol', hash);
    // Verified via authService
    if (!user.pinHash) throw new Error('Pin hash missing');
    expect(await verifyPin('5678', user.pinHash)).toBe(true);
    expect(await verifyPin('0000', user.pinHash)).toBe(false);
  });

  it('mounts a user database', async () => {
    const user = await userCommands.createUser('Dave');
    await systemCommands.mountUser(user.id);
    expect(systemCommands.getUserId()).toBe(user.id);
  });

  it('unmounts a user database', async () => {
    const user = await userCommands.createUser('Eve');
    await systemCommands.mountUser(user.id);
    await systemCommands.unmountUser();
    expect(() => systemCommands.getUserId()).toThrow();
  });

  it('saves lastActiveUserId on mount', async () => {
    const user = await userCommands.createUser('Frank');
    await systemCommands.mountUser(user.id);
    expect(await systemCommands.getLastActiveUserId()).toBe(user.id);
  });

  it('deletes current user and their database', async () => {
    const user = await userCommands.createUser('Grace');
    await systemCommands.mountUser(user.id);
    await userCommands.deleteCurrentUser();
    expect(() => systemCommands.getUserId()).toThrow();
    const users = await userCommands.listUsers();
    expect(users).toHaveLength(0);
  });
});
