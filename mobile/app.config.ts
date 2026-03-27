import type { ExpoConfig, ConfigContext } from "expo/config";

const appName = process.env.APP_NAME ?? "Faceme";
const appSlug = process.env.APP_SLUG ?? "faceme";
const iosBundleIdentifier = process.env.IOS_BUNDLE_ID ?? "com.xdtech.faceme";
const androidPackage = process.env.ANDROID_PACKAGE_ID ?? "com.xdtech.faceme";
const easProjectId = process.env.EAS_PROJECT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  description: "Faceme hybrid social platform with premium chat-first identity",
  slug: appSlug,
  scheme: "faceme",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  newArchEnabled: true,
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  experiments: {
    typedRoutes: true,
  },
  assetBundlePatterns: ["**/*"],
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#F5F2EA",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: iosBundleIdentifier,
    buildNumber: "1.0.0",
  },
  android: {
    package: androidPackage,
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#F5F2EA",
    },
  },
  plugins: ["expo-router", "expo-asset"],
  extra: {
    ...config.extra,
    eas: {
      ...(config.extra?.eas ?? {}),
      ...(easProjectId ? { projectId: easProjectId } : {}),
    },
  },
});
