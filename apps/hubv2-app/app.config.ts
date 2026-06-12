import type { ExpoConfig } from "expo/config";

const env = process.env.EXPO_PUBLIC_APP_ENV || "development";

type HubExpoConfig = ExpoConfig & {
  newArchEnabled?: boolean;
};

const config: HubExpoConfig = {
  name: env === "production" ? "Hub V2" : `Hub V2 (${env})`,
  slug: "hubv2-app",

  version: "1.0.0",

  orientation: "portrait",

  newArchEnabled: true,

  icon: "./assets/icon.png",

  userInterfaceStyle: "light",

  scheme: "hubv2",

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.hubv2.app",
  },

  android: {
    package: "com.hubv2.app",

    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
  },

  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },

  plugins: [
    "expo-router",
    "expo-font",
    "expo-image",
    "expo-localization",
    "expo-splash-screen",
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    appEnv: env,
  },
};

export default config;
