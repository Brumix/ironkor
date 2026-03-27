import { Redirect, Stack } from "expo-router";

import AuthLoadingScreen from "@/features/auth/AuthLoadingScreen";
import { useAuth, useSession } from "@/features/auth/clerkCompat";
import { useTheme } from "@/theme";

export default function AuthLayout() {
  const { theme } = useTheme();
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();

  if (!isLoaded) {
    return <AuthLoadingScreen title="Loading Ironkor" message="Preparing sign-in..." />;
  }

  if (isSignedIn && session?.currentTask) {
    return <Redirect href="/auth-task" />;
  }

  if (isSignedIn) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
