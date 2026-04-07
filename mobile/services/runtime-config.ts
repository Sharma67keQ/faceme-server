const warnInvalidConfig = (label: string, value: string) => {
  console.warn(`[runtime-config] Invalid ${label}: "${value}". Falling back to a safe default.`);
};

const toOrigin = (value: string, fallbackOrigin: string) => {
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    warnInvalidConfig("origin", value);
    return fallbackOrigin;
  }
};

const productionApiBase = "https://faceme-server.onrender.com/api";
const productionSocketBase = "https://faceme-server.onrender.com";
const productionLiveKitBase = "";
const developmentApiBase = "http://localhost:4000/api";
const developmentSocketBase = "http://localhost:4000";
const developmentLiveKitBase = "";
const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? "development";
const isProductionLike = appEnv !== "development";

const defaultApiBase = isProductionLike ? productionApiBase : developmentApiBase;
const defaultSocketBase = isProductionLike ? productionSocketBase : developmentSocketBase;
const defaultLiveKitBase = isProductionLike ? productionLiveKitBase : developmentLiveKitBase;

const apiSource = process.env.EXPO_PUBLIC_API_URL ?? defaultApiBase;
const socketSource = process.env.EXPO_PUBLIC_SOCKET_URL ?? defaultSocketBase;
const liveKitSource = process.env.EXPO_PUBLIC_LIVEKIT_URL ?? defaultLiveKitBase;

const resolveConfiguredUrl = (value: string, fallback: string, label: string) => {
  if (!value) {
    return fallback;
  }

  try {
    const url = new URL(value);
    return url.toString();
  } catch {
    warnInvalidConfig(label, value);
    return fallback;
  }
};

const assertHostedUrl = (value: string, label: string, fallback: string) => {
  const resolved = resolveConfiguredUrl(value, fallback, label);

  if (!isProductionLike) {
    return resolved;
  }

  try {
    const url = new URL(resolved);

    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      warnInvalidConfig(label, resolved);
      return fallback;
    }

    return resolved;
  } catch {
    warnInvalidConfig(label, resolved);
    return fallback;
  }
};

const resolveApiBaseUrl = () => {
  const configuredApiSource = assertHostedUrl(apiSource, "EXPO_PUBLIC_API_URL", defaultApiBase);

  try {
    const url = new URL(configuredApiSource);
    const origin = toOrigin(configuredApiSource, defaultSocketBase);
    return `${origin}${url.pathname}`;
  } catch {
    warnInvalidConfig("EXPO_PUBLIC_API_URL", configuredApiSource);
    return defaultApiBase;
  }
};

export const runtimeConfig = {
  appEnv,
  apiBaseUrl: resolveApiBaseUrl(),
  socketUrl: toOrigin(
    assertHostedUrl(socketSource, "EXPO_PUBLIC_SOCKET_URL", defaultSocketBase),
    defaultSocketBase,
  ),
  liveKitUrl: liveKitSource
    ? assertHostedUrl(liveKitSource, "EXPO_PUBLIC_LIVEKIT_URL", defaultLiveKitBase)
    : null,
};
