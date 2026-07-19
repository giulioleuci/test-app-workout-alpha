import type { UsersPort } from '@/application/users';
import { globalUserRepository } from '@/db/core';
export const globalUserGateway: UsersPort = { getAll: () => globalUserRepository.getAll(), getById: id => globalUserRepository.getById(id), count: () => globalUserRepository.count(), add: user => globalUserRepository.add(user), delete: id => globalUserRepository.delete(id) };
