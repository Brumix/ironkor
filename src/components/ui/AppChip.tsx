import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

type ChipVariant = "neutral" | "primary" | "success" | "warning" | "error";

interface AppChipProps {
  label: string;
  variant?: ChipVariant;
}

function resolveChipStyle(variant: ChipVariant, theme: ReturnType<typeof useTheme>["theme"]) {
  const variantMap: Record<ChipVariant, { backgroundColor: string; textColor: string; borderColor: string }> = {
    neutral: {
      backgroundColor: theme.colors.surfaceAlt,
      textColor: theme.colors.textMuted,
      borderColor: theme.colors.border,
    },
    primary: {
      backgroundColor: theme.colors.primarySoft,
      textColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    success: {
      backgroundColor: theme.colors.successSoft,
      textColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    warning: {
      backgroundColor: theme.colors.warningSoft,
      textColor: theme.colors.warning,
      borderColor: theme.colors.warning,
    },
    error: {
      backgroundColor: theme.colors.errorSoft,
      textColor: theme.colors.error,
      borderColor: theme.colors.error,
    },
  };

  return variantMap[variant];
}

function AppChip({ label, variant = "neutral" }: AppChipProps) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          alignSelf: "flex-start",
          borderRadius: theme.tokens.radius.pill,
          borderWidth: 1,
          paddingHorizontal: theme.tokens.spacing.sm + 1,
          paddingVertical: theme.tokens.spacing.xxs + 1,
        },
        label: {
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
      }),
    [theme],
  );

  const chipStyle = resolveChipStyle(variant, theme);

  return (
    <View style={[styles.chip, { backgroundColor: chipStyle.backgroundColor, borderColor: chipStyle.borderColor }]}>
      <Text style={[styles.label, { color: chipStyle.textColor }]}>{label}</Text>
    </View>
  );
}

export default memo(AppChip);
