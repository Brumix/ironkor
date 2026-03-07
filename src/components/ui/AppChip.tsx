import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme";

type ChipVariant = "neutral" | "primary" | "success" | "warning" | "error";

interface AppChipProps {
  label: string;
  variant?: ChipVariant;
}

function resolveChipStyle(variant: ChipVariant, theme: ReturnType<typeof useTheme>["theme"]) {
  const variantMap: Record<ChipVariant, { backgroundColor: string; textColor: string }> = {
    neutral: {
      backgroundColor: theme.colors.secondarySoft,
      textColor: theme.colors.textMuted,
    },
    primary: {
      backgroundColor: theme.colors.primarySoft,
      textColor: theme.colors.primary,
    },
    success: {
      backgroundColor: theme.colors.successSoft,
      textColor: theme.colors.success,
    },
    warning: {
      backgroundColor: theme.colors.warningSoft,
      textColor: theme.colors.warning,
    },
    error: {
      backgroundColor: theme.colors.errorSoft,
      textColor: theme.colors.error,
    },
  };

  return variantMap[variant];
}

function AppChip({ label, variant = "neutral" }: AppChipProps) {
  const { theme } = useTheme();
  const bevelLight = theme.isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF";
  const bevelDark = theme.isDark ? "rgba(0,0,0,0.56)" : "#D6DCE6";

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          alignSelf: "flex-start",
          borderRadius: theme.tokens.radius.pill,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1.5,
          borderTopColor: bevelLight,
          borderLeftColor: bevelLight,
          borderRightColor: bevelDark,
          borderBottomColor: bevelDark,
          paddingHorizontal: theme.tokens.spacing.sm + 1,
          paddingVertical: theme.tokens.spacing.xxs + 1,
        },
        label: {
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
        },
      }),
    [bevelDark, bevelLight, theme],
  );

  const chipStyle = resolveChipStyle(variant, theme);

  return (
    <View style={[styles.chip, { backgroundColor: chipStyle.backgroundColor }]}>
      <Text style={[styles.label, { color: chipStyle.textColor }]}>{label}</Text>
    </View>
  );
}

export default memo(AppChip);
