import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

type ChipVariant = "neutral" | "primary" | "success" | "warning" | "error" | "accent";

interface AppChipProps {
  label: string;
  variant?: ChipVariant;
}

function resolveChipStyle(variant: ChipVariant, theme: ReturnType<typeof useTheme>["theme"]) {
  const variantMap: Record<ChipVariant, { backgroundColor: string; textColor: string; borderColor: string }> = {
    neutral: {
      backgroundColor: theme.colors.secondarySoft,
      textColor: theme.colors.textMuted,
      borderColor: theme.colors.borderSoft,
    },
    primary: {
      backgroundColor: theme.colors.primarySoft,
      textColor: theme.colors.primary,
      borderColor: theme.colors.borderStrong,
    },
    success: {
      backgroundColor: theme.colors.successSoft,
      textColor: theme.colors.success,
      borderColor: theme.colors.borderSuccess,
    },
    warning: {
      backgroundColor: theme.colors.warningSoft,
      textColor: theme.colors.warning,
      borderColor: theme.colors.borderSoft,
    },
    error: {
      backgroundColor: theme.colors.errorSoft,
      textColor: theme.colors.error,
      borderColor: theme.colors.error,
    },
    accent: {
      backgroundColor: theme.colors.accentSoft,
      textColor: theme.colors.accent,
      borderColor: theme.colors.borderAccent,
    },
  };

  return variantMap[variant];
}

function AppChip({ label, variant = "neutral" }: AppChipProps) {
  const { theme } = useTheme();
  const chipStyle = resolveChipStyle(variant, theme);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          alignSelf: "flex-start",
          borderRadius: theme.tokens.radius.pill,
          borderWidth: 1,
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xxs,
          minHeight: 28,
          justifyContent: "center",
        },
        label: {
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
        },
      }),
    [theme],
  );

  return (
    <View style={[styles.chip, { backgroundColor: chipStyle.backgroundColor, borderColor: chipStyle.borderColor }]}>
      <Text style={[styles.label, { color: chipStyle.textColor }]}>{label}</Text>
    </View>
  );
}

export default memo(AppChip);
