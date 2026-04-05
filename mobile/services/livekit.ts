let liveKitBootstrapped = false;

export const ensureLiveKitGlobals = () => {
  if (liveKitBootstrapped) {
    return;
  }

  // Keep the native bootstrap scoped to voice-room usage so the rest of the app can still load.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { registerGlobals } = require("@livekit/react-native");
  registerGlobals();
  liveKitBootstrapped = true;
};
