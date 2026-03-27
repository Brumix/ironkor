import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import SafeScreen from "@/components/ui/SafeScreen";
import { useTheme } from "@/theme";

export default function AuthLoadingScreen({
  title = "Checking your session",
  message = "Connecting Clerk and Convex...",
}: {
  title?: string;
  message?: string;
}) {
  const { theme } = useTheme();

  return (
    <SafeScreen>
      <View style={styles(theme).root}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
        <Text style={styles(theme).title}>{title}</Text>
        <Text style={styles(theme).message}>{message}</Text>
      </View>
    </SafeScreen>
  );
}

const styles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.tokens.spacing.xl,
      gap: theme.tokens.spacing.sm,
    },
    title: {
      color: theme.colors.text,
      fontSize: theme.tokens.typography.fontSize["2xl"],
      fontWeight: theme.tokens.typography.fontWeight.black,
      textAlign: "center",
    },
    message: {
      color: theme.colors.textMuted,
      fontSize: theme.tokens.typography.fontSize.md,
      textAlign: "center",
    },
  });
