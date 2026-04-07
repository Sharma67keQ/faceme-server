import { ErrorBoundaryProps, Stack } from "expo-router";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { AppBootstrap } from "@/components/app-bootstrap";
import { AppErrorState } from "@/components/app-error-state";
import { RealtimeBridge } from "@/components/realtime-bridge";
import { I18nProvider } from "@/services/i18n";
import { useAuthStore } from "@/store/auth-store";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error("Query failed", query.queryKey, error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      console.error("Mutation failed", mutation.options.mutationKey ?? "unknown-mutation", error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
  },
});

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.error("Route render crashed", error);
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
      <I18nProvider>
        <StatusBar style="dark" />
        <RealtimeBridge />
        {isHydrated ? <Stack screenOptions={{ headerShown: false }} /> : <AppBootstrap />}
      </I18nProvider>
    </QueryClientProvider>
  );
}
