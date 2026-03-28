import type { ExpoConfig, ConfigContext } from "expo/config";

const appName = process.env.APP_NAME ?? "Faceme";
const appSlug = process.env.APP_SLUG ?? "faceme-wqk2zo";
const appOwner = process.env.EXPO_OWNER ?? "xd-tech";
const iosBundleIdentifier = process.env.IOS_BUNDLE_ID ?? "com.xdtech.faceme";
const androidPackage = process.env.ANDROID_PACKAGE_ID ?? "com.xdtech.faceme";
const easProjectId = process.env.EAS_PROJECT_ID ?? "7f86ffc9-354f-484b-90ff-14bf288323c9";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  description: "Faceme hybrid social platform with premium chat-first identity",
  slug: appSlug,
  owner: appOwner,
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
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#F5F2EA",
    },
  },
  plugins: [
    "expo-router",
    "expo-asset",
    "expo-font",
    "expo-video",
    "expo-dev-client",
    [
      "@config-plugins/react-native-webrtc",
      {
        microphonePermission: "Faceme needs microphone access so you can speak inside live voice rooms.",
      },
    ],
    [
      "@livekit/react-native-expo-plugin",
      {
        android: {
          audioType: "communication",
        },
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Faceme needs access to your photos and videos so you can publish posts, statuses, reels, and message attachments.",
      },
    ],
  ],
  extra: {
    ...config.extra,
    eas: {
      ...(config.extra?.eas ?? {}),
      ...(easProjectId ? { projectId: easProjectId } : {}),
    },
  },
});
