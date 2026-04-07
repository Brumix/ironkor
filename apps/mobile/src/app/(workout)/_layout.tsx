import { Redirect, Tabs, router } from "expo-router";

import WorkoutBottomNav from "@/components/workout/WorkoutBottomNav";
import { useAccountDeletionTransition } from "@/features/auth/AccountDeletionTransitionProvider";
import AccountRestoreChoiceModal from "@/features/auth/AccountRestoreChoiceModal";
import { useAppUnlock } from "@/features/auth/AppUnlockProvider";
import AuthLoadingScreen from "@/features/auth/AuthLoadingScreen";
import { useAuth, useSession } from "@/features/auth/clerkCompat";
import LocalUnlockScreen from "@/features/auth/LocalUnlockScreen";
import { useSecureSignOut } from "@/features/auth/useSecureSignOut";
import { useViewerBootstrap } from "@/features/auth/useViewerBootstrap";
import AppErrorScreen from "@/features/errors/AppErrorScreen";
import { useOnboardingGate } from "@/features/onboarding/useOnboardingGate";
import { DraftRoutineProvider } from "@/features/workout/DraftRoutineProvider";
import { useTheme } from "@/theme";

export default function WorkoutLayout() {
  const { theme } = useTheme();
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();
  const { isAccountDeletionTransitioning } = useAccountDeletionTransition();
  const secureSignOut = useSecureSignOut();
  const {
    errorMessage: unlockErrorMessage,
    status: unlockStatus,
    unlock,
  } = useAppUnlock();
  const isUnlocked = unlockStatus === "unavailable" || unlockStatus === "unlocked";
  const {
    errorMessage,
    isReady,
    isResolvingRestoreChoice,
    restoreCandidate,
    restorePreviousAccount,
    startFreshAccount,
  } = useViewerBootstrap({
    enabled:
      isSignedIn &&
      !session?.currentTask &&
      isUnlocked &&
      !isAccountDeletionTransitioning,
  });
  const onboardingGate = useOnboardingGate({ enabled: isReady });

  if (!isLoaded) {
    return <AuthLoadingScreen title="Loading Ironkor" message="Preparing your session..." />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  if (session?.currentTask) {
    return <Redirect href="/auth-task" />;
  }

  if (isAccountDeletionTransitioning) {
    return (
      <AuthLoadingScreen
        title="Deleting your account"
        message="Signing you out and preserving your previous Ironkor account..."
      />
    );
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

  if (restoreCandidate) {
    return (
      <>
        <AuthLoadingScreen
          title="Restore your previous account"
          message={
            errorMessage ??
            "Choose whether to bring back your previous Ironkor account or start with a fresh workspace."
          }
        />
        <AccountRestoreChoiceModal
          visible
          isSubmitting={isResolvingRestoreChoice}
          onRestore={restorePreviousAccount}
          onStartFresh={startFreshAccount}
        />
      </>
    );
  }

  if (errorMessage) {
    return (
      <AppErrorScreen
        eyebrow="Workspace sync"
        message={errorMessage}
        primaryAction={{
          label: "Try again",
          onPress: () => {
            router.replace("/");
          },
          variant: "accent",
        }}
        secondaryAction={{
          label: "Sign out",
          onPress: () => {
            void secureSignOut().catch(() => undefined);
          },
        }}
        title="We couldn't open your gym logbook"
      />
    );
  }

  if (!isReady) {
    return <AuthLoadingScreen title="Opening your gym logbook" message="Syncing your account..." />;
  }

  if (onboardingGate.errorMessage) {
    return (
      <AppErrorScreen
        eyebrow="Profile sync"
        message={onboardingGate.errorMessage}
        primaryAction={{
          label: "Try again",
          onPress: () => {
            router.replace("/");
          },
          variant: "accent",
        }}
        secondaryAction={{
          label: "Sign out",
          onPress: () => {
            void secureSignOut().catch(() => undefined);
          },
        }}
        title="We couldn't open your profile"
      />
    );
  }

  if (onboardingGate.isLoading) {
    return <AuthLoadingScreen title="Opening onboarding" message="Loading your profile..." />;
  }

  if (onboardingGate.blocked) {
    return (
      <Redirect
        href={{
          pathname: "/onboarding",
          params: { mode: "create" },
        }}
      />
    );
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
