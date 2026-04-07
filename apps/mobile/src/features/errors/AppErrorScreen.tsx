import { StyleSheet, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import SafeScreen from "@/components/ui/SafeScreen";
import { useTheme } from "@/theme";

type ActionVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";

interface ErrorAction {
  label: string;
  onPress: () => void;
  variant?: ActionVariant;
}

export default function AppErrorScreen({
  eyebrow = "Something went wrong",
  message,
  primaryAction,
  secondaryAction,
  title,
}: {
  eyebrow?: string;
  message: string;
  primaryAction?: ErrorAction;
  secondaryAction?: ErrorAction;
  title: string;
}) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <SafeScreen>
      <View style={styles.root}>
        <AppCard style={styles.card} variant="default">
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {primaryAction || secondaryAction ? (
            <View style={styles.actions}>
              {primaryAction ? (
                <AppButton
                  fullWidth
                  label={primaryAction.label}
                  onPress={primaryAction.onPress}
                  variant={primaryAction.variant ?? "accent"}
                />
              ) : null}
              {secondaryAction ? (
                <AppButton
                  fullWidth
                  label={secondaryAction.label}
                  onPress={secondaryAction.onPress}
                  variant={secondaryAction.variant ?? "ghost"}
                />
              ) : null}
            </View>
          ) : null}
        </AppCard>
      </View>
    </SafeScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    actions: {
      gap: theme.tokens.spacing.sm,
      marginTop: theme.tokens.spacing.sm,
    },
    card: {
      gap: theme.tokens.spacing.md,
      maxWidth: 480,
      width: "100%",
    },
    eyebrow: {
      color: theme.colors.accent,
      fontSize: theme.tokens.typography.fontSize.xs,
      fontWeight: theme.tokens.typography.fontWeight.bold,
      letterSpacing: theme.tokens.typography.letterSpacing.wide,
      textTransform: "uppercase",
    },
    message: {
      color: theme.colors.textMuted,
      fontSize: theme.tokens.typography.fontSize.md,
      lineHeight:
        theme.tokens.typography.fontSize.md *
        theme.tokens.typography.lineHeight.relaxed,
    },
    root: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: theme.tokens.spacing.lg,
    },
    title: {
      color: theme.colors.text,
      fontSize: theme.tokens.typography.fontSize["2xl"],
      fontWeight: theme.tokens.typography.fontWeight.black,
      letterSpacing: theme.tokens.typography.letterSpacing.tight,
    },
  });
