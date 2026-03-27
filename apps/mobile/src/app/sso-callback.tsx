import { Redirect } from "expo-router";

import AuthLoadingScreen from "@/features/auth/AuthLoadingScreen";
import { useAuth, useSession } from "@/features/auth/clerkCompat";

export default function SsoCallbackScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();

  if (!isLoaded) {
    return (
      <AuthLoadingScreen
        title="Signing you in"
        message="Finishing your secure sign-in..."
      />
    );
  }

  if (isSignedIn && session?.currentTask) {
    return <Redirect href="/auth-task" />;
  }

  if (isSignedIn) {
    return <Redirect href="/(workout)/home" />;
  }

  return (
    <AuthLoadingScreen
      title="Signing you in"
      message="Finishing your secure sign-in..."
    />
  );
}
