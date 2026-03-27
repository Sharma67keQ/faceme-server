import Constants from "expo-constants";

const extractExpoHost = () => {
  const expoConfigHost = Constants.expoConfig?.hostUri;
  const manifest2Host = (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
    .manifest2?.extra?.expoClient?.hostUri;
  const legacyManifestHost = (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  const hostUri = expoConfigHost ?? manifest2Host ?? legacyManifestHost;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(":")[0] ?? null;
};

const resolveOrigin = (value: string, fallbackOrigin: string) => {
  try {
    const url = new URL(value);

    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return url.origin;
    }

    const expoHost = extractExpoHost();

    if (!expoHost) {
      return url.origin;
    }

    url.hostname = expoHost;
    return url.origin;
  } catch {
    return fallbackOrigin;
  }
};

const defaultApiBase = "http://localhost:4000/api";
const defaultSocketBase = "http://localhost:4000";
const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? "development";

const apiSource = process.env.EXPO_PUBLIC_API_URL ?? defaultApiBase;
const socketSource = process.env.EXPO_PUBLIC_SOCKET_URL ?? defaultSocketBase;

const requireConfiguredUrl = (value: string, fallback: string, label: string) => {
  if (appEnv !== "production") {
    return value;
  }

  if (value === fallback) {
    throw new Error(`${label} must be configured for production builds.`);
  }

  return value;
};

export const runtimeConfig = {
  appEnv,
  apiBaseUrl: (() => {
    try {
      const configuredApiSource = requireConfiguredUrl(apiSource, defaultApiBase, "EXPO_PUBLIC_API_URL");
      const url = new URL(configuredApiSource);
      const origin = resolveOrigin(configuredApiSource, defaultSocketBase);
      return `${origin}${url.pathname}`;
    } catch {
      return defaultApiBase;
    }
  })(),
  socketUrl: resolveOrigin(
    requireConfiguredUrl(socketSource, defaultSocketBase, "EXPO_PUBLIC_SOCKET_URL"),
    defaultSocketBase,
  ),
};
