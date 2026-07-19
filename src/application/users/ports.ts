import type { GlobalUser } from '@/domain/global-entities';
export interface UsersPort { getAll(): Promise<GlobalUser[]>; getById(id: string): Promise<GlobalUser | undefined>; count(): Promise<number>; add(user: GlobalUser): Promise<void>; delete(id: string): Promise<void>; }
export interface UserLifecyclePort { getUserId(): string; unmountUser(): Promise<void>; deleteUserDatabase(id: string): Promise<void>; getLastActiveUserId(): Promise<string | null>; setLastActiveUserId(id: string | null): Promise<void>; }
export interface StoragePort { removeItem(key: string): void; }
