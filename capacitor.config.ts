import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cypherstudio.notibee',
  appName: 'NotiBee',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_bee",
      iconColor: "#ffbf00",
    },
    BackgroundTask: {
      enabled: true,
    },
    AdMob: {
      initializeOnBoot: true,
      // Test IDs for development
      // androidAppId: 'ca-app-pub-3940256099942544~3347511713',
      androidAppId: 'ca-app-pub-4440713684746844~5299111758',
      iosAppId: 'ca-app-pub-3940256099942544~1458002511'
    }
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#ffbf00",
  },
  server: {
    androidScheme: "https"
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
