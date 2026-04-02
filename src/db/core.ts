import { DatabaseLifecycle } from './DatabaseLifecycle';
import { GlobalMetaDB } from './globalMetaDb';
import { GlobalUserRepository } from './repositories/GlobalUserRepository';

export const globalDb = new GlobalMetaDB();
export const globalUserRepository = new GlobalUserRepository(globalDb);
export const databaseLifecycle = new DatabaseLifecycle(globalDb);
