import { Capacitor } from '@capacitor/core';
import { nativeDeviceService } from './nativeDeviceService';

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#00000000' });
  } catch (e) {
    console.warn('StatusBar plugin not available:', e);
  }

  // Initialize native features (orientation, notifications, etc.)
  await nativeDeviceService.initialize();
}
