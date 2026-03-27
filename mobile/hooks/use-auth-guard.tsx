import { Redirect } from "expo-router";
import { PropsWithChildren } from "react";
import { useAuthStore } from "@/store/auth-store";

export const AuthGuard = ({ children }: PropsWithChildren) => {
  const { accessToken, isHydrated, user } = useAuthStore();

  if (!isHydrated) {
    return null;
  }

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!user?.isOnboardingComplete) {
    return <Redirect href={"/(onboarding)/setup" as never} />;
  }

  return children;
};
