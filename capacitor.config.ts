import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.workouttracker.app',
  appName: 'Workout Tracker 2',
  webDir: 'dist',
  android: {
    edgeToEdge: true,
  },
};

export default config;
