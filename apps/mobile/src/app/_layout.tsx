import { ConvexReactClient } from "convex/react";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  identifyAnalyticsUser,
  installPostHogConsoleCapture,
  markAnalyticsUserAsInternalTest,
  resetAnalytics,
  trackAnalyticsScreen,
} from "@/config/posthog";
import { AccountDeletionTransitionProvider } from "@/features/auth/AccountDeletionTransitionProvider";
import { AppUnlockProvider } from "@/features/auth/AppUnlockProvider";
import AuthRuntimeScreen from "@/features/auth/AuthRuntimeScreen";
import {
  ClerkProvider,
  ConvexProviderWithClerk,
  getClerkRuntimeError,
  isClerkRuntimeAvailable,
  useAuth,
  useUser,
} from "@/features/auth/clerkCompat";
import {
  getSecureStoreRuntimeError,
  getSecureStoreTokenCache,
  isSecureStoreRuntimeAvailable,
} from "@/features/auth/secureStoreCompat";
import AppErrorBoundary from "@/features/errors/AppErrorBoundary";
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

function PostHogBridge() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);
  const identifiedUser = useRef<{
    email: string | null;
    id: string;
  } | null>(null);
  const { isLoaded, user } = useUser();

  useEffect(() => {
    installPostHogConsoleCapture();
  }, []);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      trackAnalyticsScreen(pathname, {
        previous_screen: previousPathname.current,
      });
      previousPathname.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!user) {
      if (identifiedUser.current) {
        resetAnalytics();
        identifiedUser.current = null;
      }
      return;
    }

    const nextUser = {
      email: user.primaryEmailAddress?.emailAddress ?? null,
      id: user.id,
    };

    const previousUser = identifiedUser.current;
    if (!previousUser) {
      identifyAnalyticsUser(nextUser);
      markAnalyticsUserAsInternalTest();
      identifiedUser.current = nextUser;
      return;
    }

    if (
      previousUser.id !== nextUser.id ||
      previousUser.email !== nextUser.email
    ) {
      identifyAnalyticsUser(nextUser);
      markAnalyticsUserAsInternalTest();
      identifiedUser.current = nextUser;
    }
  }, [isLoaded, user]);

  return null;
}

function RootProviders() {
  const runtimeError = getClerkRuntimeError();
  const secureStoreRuntimeError = getSecureStoreRuntimeError();

  if (!publishableKey) {
    return <AuthRuntimeScreen missingPublishableKey />;
  }

  if (!convexUrl) {
    return (
      <AuthRuntimeScreen error={new Error("Missing EXPO_PUBLIC_CONVEX_URL in environment")} />
    );
  }

  if (!isClerkRuntimeAvailable()) {
    return <AuthRuntimeScreen error={runtimeError} />;
  }

  if (!isSecureStoreRuntimeAvailable()) {
    return (
      <AuthRuntimeScreen
        error={
          secureStoreRuntimeError ??
          new Error("The current native client is missing Expo Secure Store.")
        }
      />
    );
  }

  const convex = getConvexClient();
  const secureStoreTokenCache = getSecureStoreTokenCache();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={secureStoreTokenCache}
      taskUrls={{
        "reset-password": "/auth-task",
        "setup-mfa": "/auth-task",
      }}
    >
      <AccountDeletionTransitionProvider>
        <AppUnlockProvider>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <AppErrorBoundary>
              <PostHogBridge />
              <RootStack />
            </AppErrorBoundary>
          </ConvexProviderWithClerk>
        </AppUnlockProvider>
      </AccountDeletionTransitionProvider>
    </ClerkProvider>
  );
}

function RootLayout() {
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

export default RootLayout;
