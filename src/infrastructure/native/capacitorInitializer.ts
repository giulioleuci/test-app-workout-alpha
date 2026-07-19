import { Capacitor } from '@capacitor/core';

/** Initialize native-only device integrations; a no-op in browsers. */
export async function initializeCapacitor(
  initializeNativeDevice: () => Promise<void>,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#00000000' });
  } catch (error) {
    console.warn('StatusBar plugin not available:', error);
  }

  await initializeNativeDevice();
}
