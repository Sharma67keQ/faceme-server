import { ErrorBoundaryProps, Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { AppBootstrap } from "@/components/app-bootstrap";
import { AppErrorState } from "@/components/app-error-state";
import { useAuthStore } from "@/store/auth-store";

const queryClient = new QueryClient();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <AppErrorState
      title="Faceme could not open this screen"
      message={error.message || "An unexpected runtime error blocked the screen from rendering."}
      onAction={retry}
    />
  );
}

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      {isHydrated ? <Stack screenOptions={{ headerShown: false }} /> : <AppBootstrap />}
    </QueryClientProvider>
  );
}
