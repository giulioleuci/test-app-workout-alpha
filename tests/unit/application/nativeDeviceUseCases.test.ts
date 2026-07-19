import { describe, expect, it, vi } from 'vitest';

import {
  CancelRestNotifications,
  InitializeNativeDevice,
  ScheduleRestNotification,
  SetKeepAwake,
  type NativeDevicePort,
} from '@/application/nativeDevice';

function createDevice(): NativeDevicePort {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    keepAwake: vi.fn().mockResolvedValue(undefined),
    scheduleRestNotification: vi.fn().mockResolvedValue(undefined),
    cancelRestNotifications: vi.fn().mockResolvedValue(undefined),
  };
}

describe('native device use cases', () => {
  it('delegates device intents through the port', async () => {
    const device = createDevice();

    await new InitializeNativeDevice(device).execute();
    await new SetKeepAwake(device).execute(true);
    await new ScheduleRestNotification(device).execute(90);
    await new CancelRestNotifications(device).execute();

    expect(device.initialize).toHaveBeenCalledOnce();
    expect(device.keepAwake).toHaveBeenCalledWith(true);
    expect(device.scheduleRestNotification).toHaveBeenCalledWith(90);
    expect(device.cancelRestNotifications).toHaveBeenCalledOnce();
  });
});
