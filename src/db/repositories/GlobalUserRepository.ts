import { type GlobalUser } from '@/domain/global-entities';

import { GlobalMetaDB } from '../globalMetaDb';

export class GlobalUserRepository {
  private db: GlobalMetaDB;

  constructor(db: GlobalMetaDB) {
    this.db = db;
  }

  async getAll(): Promise<GlobalUser[]> {
    return this.db.users.toArray();
  }

  async getById(id: string): Promise<GlobalUser | undefined> {
    return this.db.users.get(id);
  }

  async add(user: GlobalUser): Promise<void> {
    await this.db.users.add(user);
  }

  async delete(id: string): Promise<void> {
    await this.db.users.delete(id);
  }

  async count(): Promise<number> {
    return this.db.users.count();
  }
}
