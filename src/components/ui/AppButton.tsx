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
  borderColor: string;
  textColor: string;
}

function resolveButtonStyle(
  variant: ButtonVariant,
  theme: ReturnType<typeof useTheme>["theme"],
): ButtonStyleSet {
  const variantMap: Record<ButtonVariant, ButtonStyleSet> = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      textColor: theme.colors.onPrimary,
    },
    secondary: {
      backgroundColor: theme.colors.surfaceAlt,
      borderColor: theme.colors.borderStrong,
      textColor: theme.colors.text,
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: theme.colors.border,
      textColor: theme.colors.textMuted,
    },
    danger: {
      backgroundColor: theme.colors.errorSoft,
      borderColor: theme.colors.error,
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
      paddingVertical: theme.tokens.spacing.sm + 1,
      paddingHorizontal: theme.tokens.spacing.lg,
      fontSize: theme.tokens.typography.fontSize.md,
    },
    lg: {
      paddingVertical: theme.tokens.spacing.md,
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
          borderRadius: theme.tokens.radius.md,
          borderWidth: 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        label: {
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontWeight: theme.tokens.typography.fontWeight.bold,
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
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
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
