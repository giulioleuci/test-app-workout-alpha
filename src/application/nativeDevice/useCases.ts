import type { NativeDevicePort } from './ports';

export class InitializeNativeDevice {
  constructor(private readonly device: NativeDevicePort) {}

  execute(): Promise<void> {
    return this.device.initialize();
  }
}

export class SetKeepAwake {
  constructor(private readonly device: NativeDevicePort) {}

  execute(enable: boolean): Promise<void> {
    return this.device.keepAwake(enable);
  }
}

export class ScheduleRestNotification {
  constructor(private readonly device: NativeDevicePort) {}

  execute(seconds: number): Promise<void> {
    return this.device.scheduleRestNotification(seconds);
  }
}

export class CancelRestNotifications {
  constructor(private readonly device: NativeDevicePort) {}

  execute(): Promise<void> {
    return this.device.cancelRestNotifications();
  }
}
