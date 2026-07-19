/** Boundary for device capabilities used by application workflows. */
export interface NativeDevicePort {
  initialize(): Promise<void>;
  keepAwake(enable: boolean): Promise<void>;
  scheduleRestNotification(seconds: number): Promise<void>;
  cancelRestNotifications(): Promise<void>;
}
