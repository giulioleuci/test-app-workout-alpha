import Dexie from 'dexie';

import { GlobalAppState } from '@/domain/global-entities';

import { WorkoutTrackerDB } from './database';
import { GlobalMetaDB } from './globalMetaDb';

export class DatabaseLifecycle {
  private globalDb: GlobalMetaDB;
  private currentUserDb: WorkoutTrackerDB | null = null;
  private currentUserId: string | null = null;

  constructor(globalDb: GlobalMetaDB) {
    this.globalDb = globalDb;
  }

  async initialize(): Promise<void> {
    const state = await this.globalDb.appState.get('singleton');
    if (!state) {
      await this.globalDb.appState.put({ id: 'singleton', lastActiveUserId: null });
    }
  }

  async mountUser(userId: string): Promise<void> {
    if (this.currentUserDb) {
      this.currentUserDb.close();
    }
    const dbName = `WT_User_${userId}`;
    this.currentUserDb = new WorkoutTrackerDB(dbName);
    this.currentUserId = userId;
    await this.setLastActiveUserId(userId);
  }

  unmountUser(): void {
    if (this.currentUserDb) {
      this.currentUserDb.close();
      this.currentUserDb = null;
    }
    this.currentUserId = null;
  }

  getDb(): WorkoutTrackerDB {
    if (!this.currentUserDb) {
      throw new Error('No user database mounted. Call mountUser() first.');
    }
    return this.currentUserDb;
  }

  getUserId(): string {
    if (!this.currentUserId) {
      throw new Error('No user mounted.');
    }
    return this.currentUserId;
  }

  isUserMounted(): boolean {
    return this.currentUserDb !== null;
  }

  async getLastActiveUserId(): Promise<string | null> {
    const state = await this.getGlobalAppState();
    return state?.lastActiveUserId ?? null;
  }

  async setLastActiveUserId(userId: string | null): Promise<void> {
    await this.updateGlobalAppState({ lastActiveUserId: userId });
  }

  async getGlobalAppState(): Promise<GlobalAppState | undefined> {
    return await this.globalDb.appState.get('singleton');
  }

  async updateGlobalAppState(update: Partial<GlobalAppState>): Promise<void> {
    await this.globalDb.appState.update('singleton', update);
  }

  async deleteDatabase(userId: string): Promise<void> {
    const dbName = `WT_User_${userId}`;
    await Dexie.delete(dbName);
  }
}
