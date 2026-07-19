import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { beforeAll, afterAll } from 'vitest';

import '@/i18n/config';
import { systemCommands } from '@/composition/system';
import { userCommands } from '@/composition/users';

import { setupBrowserMocks } from '../mocks/browser';

setupBrowserMocks();

beforeAll(async () => {
  await systemCommands.initialize();
  // Ensure a test user exists for integration tests
  try {
      const user = await userCommands.createUser('Test User', null);
      await systemCommands.mountUser(user.id);
  } catch (e) {
      console.warn('User creation failed or user already exists, attempting to proceed', e);
  }
});

afterAll(async () => {
  try {
    await systemCommands.unmountUser();
  } catch (e) {
      console.warn('Unmount failed', e);
  }
});
