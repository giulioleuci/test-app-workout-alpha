import {
  CancelRestNotifications,
  InitializeNativeDevice,
  ScheduleRestNotification,
  SetKeepAwake,
} from '@/application/nativeDevice';
import { nativeDeviceGateway } from '@/infrastructure/native/nativeDeviceGateway';

/** Presentation-facing commands for native device effects. */
export const nativeDeviceCommands = {
  initialize: new InitializeNativeDevice(nativeDeviceGateway),
  setKeepAwake: new SetKeepAwake(nativeDeviceGateway),
  scheduleRestNotification: new ScheduleRestNotification(nativeDeviceGateway),
  cancelRestNotifications: new CancelRestNotifications(nativeDeviceGateway),
};
