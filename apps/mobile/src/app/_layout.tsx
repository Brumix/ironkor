import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AuthRuntimeScreen from "@/features/auth/AuthRuntimeScreen";
import {
  ClerkProvider,
  ConvexProviderWithClerk,
  getClerkRuntimeError,
  isClerkRuntimeAvailable,
  useAuth,
} from "@/features/auth/clerkCompat";
import { ThemeProvider, useTheme } from "@/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
let convexClient: ConvexReactClient | null = null;

function getConvexClient() {
  if (!convexUrl) {
    throw new Error("Missing EXPO_PUBLIC_CONVEX_URL in apps/mobile/.env.local.");
  }

  convexClient ??= new ConvexReactClient(convexUrl, {
    unsavedChangesWarning: false,
  });

  return convexClient;
}

function RootStack() {
  const { resolvedMode, theme } = useTheme();

  return (
    <>
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </>
  );
}

function RootProviders() {
  const runtimeError = getClerkRuntimeError();

  if (!publishableKey) {
    return <AuthRuntimeScreen missingPublishableKey />;
  }

  if (!convexUrl) {
    return (
      <AuthRuntimeScreen error={new Error("Missing EXPO_PUBLIC_CONVEX_URL in apps/mobile/.env.local.")} />
    );
  }

  if (!isClerkRuntimeAvailable()) {
    return <AuthRuntimeScreen error={runtimeError} />;
  }

  const convex = getConvexClient();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      taskUrls={{
        "reset-password": "/auth-task",
        "setup-mfa": "/auth-task",
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <RootStack />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootProviders />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
