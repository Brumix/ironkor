import { Redirect, Tabs } from "expo-router";

import WorkoutBottomNav from "@/components/workout/WorkoutBottomNav";
import { useAppUnlock } from "@/features/auth/AppUnlockProvider";
import AuthLoadingScreen from "@/features/auth/AuthLoadingScreen";
import { useAuth, useSession } from "@/features/auth/clerkCompat";
import LocalUnlockScreen from "@/features/auth/LocalUnlockScreen";
import { useSecureSignOut } from "@/features/auth/useSecureSignOut";
import { useViewerBootstrap } from "@/features/auth/useViewerBootstrap";
import { DraftRoutineProvider } from "@/features/workout/DraftRoutineProvider";
import { useTheme } from "@/theme";

export default function WorkoutLayout() {
  const { theme } = useTheme();
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();
  const secureSignOut = useSecureSignOut();
  const {
    errorMessage: unlockErrorMessage,
    status: unlockStatus,
    unlock,
  } = useAppUnlock();
  const isUnlocked = unlockStatus === "unavailable" || unlockStatus === "unlocked";
  const { errorMessage, isReady } = useViewerBootstrap({
    enabled: isSignedIn && !session?.currentTask && isUnlocked,
  });

  if (!isLoaded) {
    return <AuthLoadingScreen title="Loading Ironkor" message="Preparing your session..." />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  if (session?.currentTask) {
    return <Redirect href="/auth-task" />;
  }

  if (!isUnlocked) {
    if (unlockStatus === "checking" || unlockStatus === "unlocking") {
      return (
        <AuthLoadingScreen
          title="Unlocking Ironkor"
          message="Verifying your device identity..."
        />
      );
    }

    return (
      <LocalUnlockScreen
        errorMessage={unlockErrorMessage}
        onSignOut={() => {
          void secureSignOut().catch(() => undefined);
        }}
        onUnlock={() => {
          void unlock();
        }}
      />
    );
  }

  if (errorMessage) {
    return <AuthLoadingScreen title="Auth setup failed" message={errorMessage} />;
  }

  if (!isReady) {
    return <AuthLoadingScreen title="Opening your gym logbook" message="Syncing your account..." />;
  }

  return (
    <DraftRoutineProvider>
      <Tabs
        tabBar={(props) => <WorkoutBottomNav {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="routines" />
        <Tabs.Screen name="start" />
        <Tabs.Screen name="plan" />
        <Tabs.Screen name="settings" />
        <Tabs.Screen
          name="routine-editor"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="session-editor"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="custom-exercise"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="my-exercises"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </DraftRoutineProvider>
  );
}
