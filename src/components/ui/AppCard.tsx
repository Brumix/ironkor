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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          borderRadius: theme.tokens.radius.lg,
          borderWidth: 2,
          padding: theme.tokens.spacing.lg,
          gap: theme.tokens.spacing.sm,
          overflow: "hidden",
          shadowColor: theme.colors.text,
          shadowOpacity: 0.12,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 3 },
        },
      }),
    [theme],
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
