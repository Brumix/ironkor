import { StyleSheet, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AuthScreenShell from "@/features/auth/AuthScreenShell";
import { useTheme } from "@/theme";

export default function LocalUnlockScreen({
  errorMessage,
  isUnlocking,
  onSignOut,
  onUnlock,
}: {
  errorMessage?: string | null;
  isUnlocking?: boolean;
  onSignOut: () => void;
  onUnlock: () => void;
}) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <AuthScreenShell
      eyebrow="Protected workspace"
      title="Unlock Ironkor"
      subtitle="Your session is still valid. Verify your identity on this device before Ironkor shows your workout data."
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sign out if you want to close this device session completely.
          </Text>
        </View>
      }
    >
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <AppButton
        fullWidth
        label="Unlock with biometrics"
        loading={isUnlocking}
        onPress={onUnlock}
        variant="accent"
      />
      <AppButton
        fullWidth
        label="Sign out"
        onPress={onSignOut}
        variant="secondary"
      />
    </AuthScreenShell>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    errorText: {
      color: theme.colors.error,
      fontSize: theme.tokens.typography.fontSize.sm,
      lineHeight:
        theme.tokens.typography.fontSize.sm *
        theme.tokens.typography.lineHeight.relaxed,
    },
    footer: {
      gap: theme.tokens.spacing.xs,
    },
    footerText: {
      color: theme.colors.textMuted,
      fontSize: theme.tokens.typography.fontSize.sm,
      textAlign: "center",
    },
  });
