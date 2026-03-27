import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth-store";

export default function Index() {
  const { accessToken, isHydrated, user } = useAuthStore();

  if (!isHydrated) {
    return null;
  }

  if (!accessToken) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href={(user?.isOnboardingComplete ? "/(tabs)" : "/(onboarding)/setup") as never} />;
}
