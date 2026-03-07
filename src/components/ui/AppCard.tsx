import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme";

import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

type CardVariant = "default" | "muted" | "highlight" | "outline";

interface AppCardProps {
  children: ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

function resolveVariantStyle(variant: CardVariant, theme: ReturnType<typeof useTheme>["theme"]): ViewStyle {
  const variantMap: Record<CardVariant, ViewStyle> = {
    default: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    muted: {
      backgroundColor: theme.colors.surfaceAlt,
      borderColor: theme.colors.border,
    },
    highlight: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.borderStrong,
    },
    outline: {
      backgroundColor: "transparent",
      borderColor: theme.colors.borderStrong,
    },
  };

  return variantMap[variant];
}

function AppCard({ children, variant = "default", style, onPress }: AppCardProps) {
  const { theme } = useTheme();
  const bevelLight = theme.isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const bevelDark = theme.isDark ? "rgba(0,0,0,0.62)" : "#D7DDE7";

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          borderRadius: theme.tokens.radius.md,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1.5,
          padding: theme.tokens.spacing.lg,
          gap: theme.tokens.spacing.sm,
          overflow: "hidden",
          shadowColor: "#000000",
          shadowOpacity: theme.isDark ? 0.34 : 0.1,
          shadowRadius: theme.isDark ? 22 : 14,
          shadowOffset: { width: 3, height: 6 },
          elevation: theme.tokens.elevation.sm,
          borderTopColor: bevelLight,
          borderLeftColor: bevelLight,
          borderRightColor: bevelDark,
          borderBottomColor: bevelDark,
        },
      }),
    [bevelDark, bevelLight, theme],
  );

  const variantStyle = resolveVariantStyle(variant, theme);

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.base, variantStyle, style]}>
        {children}
      </PressableScale>
    );
  }

  return <View style={[styles.base, variantStyle, style]}>{children}</View>;
}

export default memo(AppCard);
