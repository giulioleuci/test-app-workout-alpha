import { useCallback } from 'react';

import { nativeDeviceCommands } from '@/composition/nativeDevice';

/** Maps native-device use cases into UI intent callbacks. */
export function useNativeDeviceViewModel() {
  const initialize = useCallback(() => nativeDeviceCommands.initialize.execute(), []);
  const setKeepAwake = useCallback((enable: boolean) => nativeDeviceCommands.setKeepAwake.execute(enable), []);
  const scheduleRestNotification = useCallback(
    (seconds: number) => nativeDeviceCommands.scheduleRestNotification.execute(seconds),
    [],
  );
  const cancelRestNotifications = useCallback(
    () => nativeDeviceCommands.cancelRestNotifications.execute(),
    [],
  );

  return { initialize, setKeepAwake, scheduleRestNotification, cancelRestNotifications };
}
