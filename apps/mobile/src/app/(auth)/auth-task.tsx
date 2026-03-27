import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AuthScreenShell from "@/features/auth/AuthScreenShell";
import { useAuth, useSession } from "@/features/auth/clerkCompat";
import { useTheme } from "@/theme";

export default function AuthTaskScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const { session } = useSession();
  const taskKey = session?.currentTask?.key;
  const screenStyles = styles(theme);

  if (!taskKey) {
    return <Redirect href="/" />;
  }

  async function signOutAndGoToReset() {
    await signOut();
    router.replace("/forgot-password");
  }

  async function signOutAndGoToSignIn() {
    await signOut();
    router.replace("/sign-in");
  }

  return (
    <AuthScreenShell
      eyebrow="Security task"
      title="One more step is required"
      subtitle="Clerk flagged this session for an extra security action before Ironkor can unlock your workout data."
    >
      {taskKey === "reset-password" ? (
        <>
          <Text style={screenStyles.message}>
            Your account must reset its password before you can continue. We’ll send you to the password recovery flow next.
          </Text>
          <AppButton
            fullWidth
            label="Reset password now"
            onPress={signOutAndGoToReset}
            variant="accent"
          />
        </>
      ) : null}

      {taskKey === "setup-mfa" ? (
        <>
          <Text style={screenStyles.message}>
            Multi-factor authentication setup is required for this account. Complete it in the Clerk account flow, then sign back in here.
          </Text>
          <AppButton
            fullWidth
            label="Sign out for now"
            onPress={signOutAndGoToSignIn}
            variant="secondary"
          />
        </>
      ) : null}

      {taskKey !== "reset-password" && taskKey !== "setup-mfa" ? (
        <>
          <Text style={screenStyles.message}>
            This session requires the task &quot;{taskKey}&quot;. Sign out and retry after completing the requirement in Clerk.
          </Text>
          <AppButton
            fullWidth
            label="Sign out"
            onPress={signOutAndGoToSignIn}
            variant="secondary"
          />
        </>
      ) : null}
    </AuthScreenShell>
  );
}

const styles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    message: {
      color: theme.colors.textMuted,
      fontSize: theme.tokens.typography.fontSize.md,
      lineHeight:
        theme.tokens.typography.fontSize.md *
        theme.tokens.typography.lineHeight.relaxed,
    },
  });
