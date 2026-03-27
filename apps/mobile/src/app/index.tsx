import { Redirect } from "expo-router";

import AuthLoadingScreen from "@/features/auth/AuthLoadingScreen";
import { useAuth, useSession } from "@/features/auth/clerkCompat";
import { useViewerBootstrap } from "@/features/auth/useViewerBootstrap";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();
  const { errorMessage, isReady } = useViewerBootstrap();

  if (!isLoaded) {
    return <AuthLoadingScreen title="Loading Ironkor" message="Preparing authentication..." />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  if (session?.currentTask) {
    return <Redirect href="/auth-task" />;
  }

  if (errorMessage) {
    return <AuthLoadingScreen title="Auth setup failed" message={errorMessage} />;
  }

  if (!isReady) {
    return <AuthLoadingScreen title="Starting your workspace" message="Syncing your account..." />;
  }

  return <Redirect href="/(workout)/home" />;
}
