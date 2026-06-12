import type { ExpoConfig } from "expo/config";

const env = process.env.EXPO_PUBLIC_APP_ENV || "development";
const version = process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0";
const appName = process.env.EXPO_PUBLIC_APP_NAME || "Hub V2";

type HubExpoConfig = ExpoConfig & {
  newArchEnabled?: boolean;
};

const config: HubExpoConfig = {
  name: env === "production" ? appName : `${appName} (${env})`,
  slug: "hubv2-app",

  version,

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
