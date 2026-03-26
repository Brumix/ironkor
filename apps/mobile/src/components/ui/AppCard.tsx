import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme";

import type { ReactNode } from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";

type CardVariant = "default" | "muted" | "highlight" | "outline" | "accent";

interface AppCardProps {
  children: ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: PressableProps["onLongPress"];
  delayLongPress?: number;
  disabled?: boolean;
  pressedOpacity?: number;
  pressedScale?: number;
}

function resolveVariantStyle(variant: CardVariant, theme: ReturnType<typeof useTheme>["theme"]): ViewStyle {
  const variantMap: Record<CardVariant, ViewStyle> = {
    default: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    muted: {
      backgroundColor: theme.colors.surfaceAlt,
      borderColor: theme.colors.borderSoft,
    },
    highlight: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderSoft,
    },
    outline: {
      backgroundColor: "transparent",
      borderColor: theme.colors.borderStrong,
    },
    accent: {
      backgroundColor: theme.colors.accentSoft,
      borderColor: theme.colors.borderAccent,
    },
  };

  return variantMap[variant];
}

function AppCard({
  children,
  variant = "default",
  style,
  onPress,
  onLongPress,
  delayLongPress,
  disabled = false,
  pressedOpacity,
  pressedScale,
}: AppCardProps) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          borderRadius: theme.tokens.radius.lg,
          borderWidth: 1,
          padding: theme.tokens.spacing.lg,
          gap: theme.tokens.spacing.sm,
          overflow: "hidden",
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.34 : 0.12,
          shadowRadius: theme.isDark ? 18 : 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: theme.tokens.elevation.sm,
        },
      }),
    [theme],
  );

  const variantStyle = resolveVariantStyle(variant, theme);

  if (onPress || onLongPress) {
    return (
      <PressableScale
        delayLongPress={delayLongPress}
        disabled={disabled}
        onLongPress={onLongPress}
        onPress={onPress}
        pressedOpacity={pressedOpacity}
        pressedScale={pressedScale}
        style={[styles.base, variantStyle, style]}
      >
        {children}
      </PressableScale>
    );
  }

  return <View style={[styles.base, variantStyle, style]}>{children}</View>;
}

export default memo(AppCard);
