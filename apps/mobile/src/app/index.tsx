import { Redirect } from "expo-router";

import { useAccountDeletionTransition } from "@/features/auth/AccountDeletionTransitionProvider";
import AccountRestoreChoiceModal from "@/features/auth/AccountRestoreChoiceModal";
import { useAppUnlock } from "@/features/auth/AppUnlockProvider";
import AuthLoadingScreen from "@/features/auth/AuthLoadingScreen";
import { useAuth, useSession } from "@/features/auth/clerkCompat";
import LocalUnlockScreen from "@/features/auth/LocalUnlockScreen";
import { useSecureSignOut } from "@/features/auth/useSecureSignOut";
import { useViewerBootstrap } from "@/features/auth/useViewerBootstrap";
import { useOnboardingGate } from "@/features/onboarding/useOnboardingGate";

export default function Index() {
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
    return <AuthLoadingScreen title="Loading Ironkor" message="Preparing authentication..." />;
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
    return <AuthLoadingScreen title="Auth setup failed" message={errorMessage} />;
  }

  if (!isReady) {
    return <AuthLoadingScreen title="Starting your workspace" message="Syncing your account..." />;
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

  return <Redirect href="/(workout)/home" />;
}
