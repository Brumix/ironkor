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
  borderLight: string;
  borderDark: string;
  textColor: string;
}

function resolveButtonStyle(
  variant: ButtonVariant,
  theme: ReturnType<typeof useTheme>["theme"],
): ButtonStyleSet {
  const variantMap: Record<ButtonVariant, ButtonStyleSet> = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderLight: theme.isDark ? "rgba(255,255,255,0.24)" : "#3C4149",
      borderDark: theme.isDark ? "rgba(0,0,0,0.74)" : "#070A0F",
      textColor: theme.colors.onPrimary,
    },
    secondary: {
      backgroundColor: theme.colors.secondarySoft,
      borderLight: theme.isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
      borderDark: theme.isDark ? "rgba(0,0,0,0.62)" : "#D3D9E2",
      textColor: theme.colors.text,
    },
    ghost: {
      backgroundColor: theme.colors.surface,
      borderLight: theme.isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
      borderDark: theme.isDark ? "rgba(0,0,0,0.62)" : "#D3D9E2",
      textColor: theme.colors.text,
    },
    danger: {
      backgroundColor: theme.colors.errorSoft,
      borderLight: theme.isDark ? "rgba(255,255,255,0.1)" : "#FFF4F2",
      borderDark: theme.isDark ? "rgba(0,0,0,0.62)" : "#E9C2BE",
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
          borderRadius: theme.tokens.radius.sm,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1.5,
          minHeight: 44,
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
      pressedOpacity={0.96}
      pressedScale={0.975}
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderTopColor: variantStyle.borderLight,
          borderLeftColor: variantStyle.borderLight,
          borderRightColor: variantStyle.borderDark,
          borderBottomColor: variantStyle.borderDark,
          paddingVertical: buttonSize.paddingVertical,
          paddingHorizontal: buttonSize.paddingHorizontal,
          opacity: disabled ? 0.5 : 1,
          shadowColor: "#000000",
          shadowOpacity: theme.isDark ? 0.28 : 0.1,
          shadowRadius: 12,
          shadowOffset: { width: 2, height: 5 },
          elevation: theme.tokens.elevation.sm,
        },
      ]}
    >
      {icon ? <View>{icon}</View> : null}
      <Text style={[styles.label, { color: variantStyle.textColor, fontSize: buttonSize.fontSize }]}>{label}</Text>
    </PressableScale>
  );
}

export default memo(AppButton);
