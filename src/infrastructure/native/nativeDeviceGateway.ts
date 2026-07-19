import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { KeepAwake } from '@capacitor-community/keep-awake';

import type { NativeDevicePort } from '@/application/nativeDevice';
import { t } from '@/i18n/t';

export const nativeDeviceGateway: NativeDevicePort = {
  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const info = await Device.getInfo();
      if ((info.model !== 'iPad' && info.platform === 'ios') || info.platform === 'android') {
        await ScreenOrientation.lock({ orientation: 'portrait' });
      }

      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') await LocalNotifications.requestPermissions();

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
    } catch (error) {
      console.warn('Native initialization error:', error);
    }
  },

  async keepAwake(enable: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      if (enable) await KeepAwake.keepAwake();
      else await KeepAwake.allowSleep();
    } catch (error) {
      console.warn('KeepAwake error:', error);
    }
  },

  async scheduleRestNotification(seconds: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await this.cancelRestNotifications();
      await LocalNotifications.schedule({
        notifications: [{
          title: t('settings.restTimerFinished'),
          body: t('settings.restTimerFinishedDesc'),
          id: 101,
          schedule: { at: new Date(Date.now() + seconds * 1000), allowWhileIdle: true },
          channelId: 'rest-timer',
        }],
      });
    } catch (error) {
      console.warn('Notification schedule error:', error);
    }
  },

  async cancelRestNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 101 }] });
    } catch (error) {
      console.warn('Notification cancel error:', error);
    }
  },
};
