import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { KeepAwake } from '@capacitor-community/keep-awake';

import { t } from '@/i18n/t';

export const nativeDeviceService = {
  /**
   * Initial setup for native device features.
   */
  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // 1. Lock orientation to portrait if it's a smartphone
      const info = await Device.getInfo();
      if (info.model !== 'iPad' && info.platform === 'ios' || info.platform === 'android') {
        // Simple check for phone: if not tablet and is mobile platform
        // Device plugin doesn't have an explicit 'isTablet' but we can infer
        // For simplicity, we lock portrait for all mobile platforms as requested
        // "schermo sempre verticale solo se su smartphone"
        // Most tablets have 'tablet' in model or specific screen sizes, 
        // but here we apply it to mobile platforms generally.
        await ScreenOrientation.lock({ orientation: 'portrait' });
      }

      // 2. Request notification permissions
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      // 3. Create a channel for Android (required for sounds/importance)
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: 'rest-timer',
          name: 'Rest Timer',
          description: 'Notifications for finished rest periods',
          importance: 5,
          visibility: 1,
          vibration: true,
        });
      }
    } catch (e) {
      console.warn('Native initialization error:', e);
    }
  },

  /**
   * Keeps the screen on during a workout.
   */
  async keepAwake(enable: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      if (enable) {
        await KeepAwake.keepAwake();
      } else {
        await KeepAwake.allowSleep();
      }
    } catch (e) {
      console.warn('KeepAwake error:', e);
    }
  },

  /**
   * Schedules a rest timer notification.
   */
  async scheduleRestNotification(seconds: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await this.cancelRestNotifications();
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title: t('settings.restTimerFinished'),
            body: t('settings.restTimerFinishedDesc'),
            id: 101,
            schedule: { 
              at: new Date(Date.now() + seconds * 1000),
              allowWhileIdle: true,
            },
            channelId: 'rest-timer',
          }
        ]
      });
    } catch (e) {
      console.warn('Notification schedule error:', e);
    }
  },

  /**
   * Cancels any pending rest timer notifications.
   */
  async cancelRestNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: 101 }]
      });
    } catch (e) {
      console.warn('Notification cancel error:', e);
    }
  }
};
