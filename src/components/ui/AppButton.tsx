import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme";

import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
}

interface ButtonStyleSet {
  backgroundColor: string;
  borderDark: string;
  borderLight: string;
  textColor: string;
}

function resolveButtonStyle(
  variant: ButtonVariant,
  theme: ReturnType<typeof useTheme>["theme"],
): ButtonStyleSet {
  const variantMap: Record<ButtonVariant, ButtonStyleSet> = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderDark: theme.colors.borderStrong,
      borderLight: theme.colors.primarySoft,
      textColor: theme.colors.onPrimary,
    },
    secondary: {
      backgroundColor: theme.colors.secondarySoft,
      borderDark: theme.colors.secondary,
      borderLight: theme.colors.surface,
      textColor: theme.colors.onSecondary,
    },
    ghost: {
      backgroundColor: theme.colors.surface,
      borderDark: theme.colors.borderStrong,
      borderLight: theme.colors.backgroundElevated,
      textColor: theme.colors.text,
    },
    danger: {
      backgroundColor: theme.colors.errorSoft,
      borderDark: theme.colors.error,
      borderLight: theme.colors.surface,
      textColor: theme.colors.error,
    },
  };

  return variantMap[variant];
}

function resolveButtonSize(size: ButtonSize, theme: ReturnType<typeof useTheme>["theme"]) {
  const sizeMap: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
    sm: {
      paddingVertical: theme.tokens.spacing.xs + 1,
      paddingHorizontal: theme.tokens.spacing.md,
      fontSize: theme.tokens.typography.fontSize.sm,
    },
    md: {
      paddingVertical: theme.tokens.spacing.sm,
      paddingHorizontal: theme.tokens.spacing.lg,
      fontSize: theme.tokens.typography.fontSize.md,
    },
    lg: {
      paddingVertical: theme.tokens.spacing.md - 1,
      paddingHorizontal: theme.tokens.spacing.xl,
      fontSize: theme.tokens.typography.fontSize.lg,
    },
  };

  return sizeMap[size];
}

function AppButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  fullWidth = false,
  disabled = false,
}: AppButtonProps) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.tokens.spacing.xs,
          borderRadius: theme.tokens.radius.xs,
          borderTopWidth: 2,
          borderLeftWidth: 2,
          borderBottomWidth: 4,
          borderRightWidth: 4,
          minHeight: 44,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        label: {
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          textTransform: "uppercase",
          letterSpacing: 1.05,
        },
      }),
    [fullWidth, theme],
  );

  const variantStyle = resolveButtonStyle(variant, theme);
  const buttonSize = resolveButtonSize(size, theme);

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      pressedOpacity={1}
      pressedScale={0.99}
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderTopColor: variantStyle.borderLight,
          borderLeftColor: variantStyle.borderLight,
          borderBottomColor: variantStyle.borderDark,
          borderRightColor: variantStyle.borderDark,
          paddingVertical: buttonSize.paddingVertical,
          paddingHorizontal: buttonSize.paddingHorizontal,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {icon ? <View>{icon}</View> : null}
      <Text style={[styles.label, { color: variantStyle.textColor, fontSize: buttonSize.fontSize }]}>{label}</Text>
    </PressableScale>
  );
}

export default memo(AppButton);
