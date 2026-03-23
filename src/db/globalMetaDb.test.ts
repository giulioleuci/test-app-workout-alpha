import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { GlobalMetaDB } from './globalMetaDb';

describe('GlobalMetaDB', () => {
  let metaDb: GlobalMetaDB;

  beforeEach(() => {
    metaDb = new GlobalMetaDB();
  });

  it('can add and retrieve a user', async () => {
    await metaDb.users.add({
      id: 'u1',
      name: 'Test User',
      pinHash: null,
      avatarColor: '#6366f1',
      createdAt: new Date(),
    });
    const user = await metaDb.users.get('u1');
    expect(user?.name).toBe('Test User');
  });

  it('can set and read app state with language', async () => {
    await metaDb.appState.put({ id: 'singleton', lastActiveUserId: 'u1', language: 'en' });
    const state = await metaDb.appState.get('singleton');
    expect(state?.lastActiveUserId).toBe('u1');
    expect(state?.language).toBe('en');
  });
});
