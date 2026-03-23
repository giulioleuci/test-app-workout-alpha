import 'fake-indexeddb/auto';
import { setupBrowserMocks } from '../mocks/browser';
import { systemService } from '@/services/systemService';
import { userService } from '@/services/userService';
import '@testing-library/jest-dom';
import '@/i18n/config';
import { beforeAll, afterAll } from 'vitest';

setupBrowserMocks();

beforeAll(async () => {
  await systemService.initialize();
  // Ensure a test user exists for integration tests
  try {
      const user = await userService.createUser('Test User', null);
      await systemService.mountUser(user.id);
  } catch (e) {
      console.warn('User creation failed or user already exists, attempting to proceed', e);
  }
});

afterAll(async () => {
  try {
    await systemService.unmountUser();
  } catch (e) {
      console.warn('Unmount failed', e);
  }
});
