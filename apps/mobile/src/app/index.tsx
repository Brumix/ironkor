import { Redirect } from "expo-router";

import { useAppUnlock } from "@/features/auth/AppUnlockProvider";
import AuthLoadingScreen from "@/features/auth/AuthLoadingScreen";
import { useAuth, useSession } from "@/features/auth/clerkCompat";
import LocalUnlockScreen from "@/features/auth/LocalUnlockScreen";
import { useSecureSignOut } from "@/features/auth/useSecureSignOut";
import { useViewerBootstrap } from "@/features/auth/useViewerBootstrap";

export default function Index() {
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
    return <AuthLoadingScreen title="Loading Ironkor" message="Preparing authentication..." />;
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
    return <AuthLoadingScreen title="Starting your workspace" message="Syncing your account..." />;
  }

  return <Redirect href="/(workout)/home" />;
}
