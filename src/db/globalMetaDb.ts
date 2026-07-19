import Dexie, { type Table } from 'dexie';

import type { GlobalUser, GlobalAppState } from '@/domain/global-entities';

export class GlobalMetaDB extends Dexie {
  users!: Table<GlobalUser, string>;
  appState!: Table<GlobalAppState, string>;

  constructor() {
    super('WT_GlobalMeta');
    this.version(1).stores({
      users: 'id, name',
      appState: 'id',
    });
  }
}
