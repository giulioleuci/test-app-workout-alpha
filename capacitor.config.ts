import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.deltaworkout.app',
  appName: 'Delta Workout',
  webDir: 'dist',
  android: {
    edgeToEdge: true,
  },
};

export default config;
