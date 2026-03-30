import { StyleSheet, Text, View } from "react-native";

import { resolveAuthErrorMessage } from "@/features/auth/clerkErrors";
import { useTheme } from "@/theme";

export default function AuthRuntimeScreen({
  error,
  missingPublishableKey,
}: {
  error?: unknown;
  missingPublishableKey?: boolean;
}) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const message = missingPublishableKey
    ? "Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in apps/mobile/.env.local to enable authentication."
    : resolveAuthErrorMessage(
        error,
        "The current native client is missing one of the required auth or secure-storage native modules. Rebuild the iOS or Android app after installing native dependencies.",
      );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Auth setup</Text>
        <Text style={styles.title}>Ironkor needs a refreshed native client</Text>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.message}>
          If you just added auth packages, rebuild with `bun run --cwd apps/mobile ios` or `bun run --cwd apps/mobile android`, then reopen the app.
        </Text>
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      backgroundColor: theme.colors.background,
      flex: 1,
      justifyContent: "center",
      padding: theme.tokens.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderSoft,
      borderRadius: theme.tokens.radius.xl,
      borderWidth: 1,
      gap: theme.tokens.spacing.md,
      maxWidth: 460,
      padding: theme.tokens.spacing.lg,
      width: "100%",
    },
    eyebrow: {
      color: theme.colors.accent,
      fontSize: theme.tokens.typography.fontSize.xs,
      fontWeight: theme.tokens.typography.fontWeight.bold,
      letterSpacing: theme.tokens.typography.letterSpacing.wide,
      textTransform: "uppercase",
    },
    title: {
      color: theme.colors.text,
      fontSize: theme.tokens.typography.fontSize["2xl"],
      fontWeight: theme.tokens.typography.fontWeight.black,
    },
    message: {
      color: theme.colors.textMuted,
      fontSize: theme.tokens.typography.fontSize.md,
      lineHeight:
        theme.tokens.typography.fontSize.md *
        theme.tokens.typography.lineHeight.relaxed,
    },
  });
