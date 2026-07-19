import type { StoragePort } from '@/application/users';
export const localStorageGateway: StoragePort = { removeItem: key => localStorage.removeItem(key) };
