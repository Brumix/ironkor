import { memo, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme";

import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "lg";

interface AppButtonBaseProps {
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}

type AppButtonProps =
  | (AppButtonBaseProps & {
      label: string;
      icon?: ReactNode;
    })
  | (AppButtonBaseProps & {
      label?: never;
      icon: ReactNode;
      accessibilityLabel: string;
    });

interface ButtonStyleSet {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  shadowColor: string;
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
      shadowColor: theme.colors.shadow,
    },
    secondary: {
      backgroundColor: theme.colors.secondarySoft,
      borderColor: theme.colors.border,
      textColor: theme.colors.text,
      shadowColor: theme.colors.shadow,
    },
    ghost: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderSoft,
      textColor: theme.colors.text,
      shadowColor: theme.colors.shadow,
    },
    danger: {
      backgroundColor: theme.colors.errorSoft,
      borderColor: theme.colors.error,
      textColor: theme.colors.error,
      shadowColor: theme.colors.shadow,
    },
    accent: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.borderAccent,
      textColor: theme.colors.onAccent,
      shadowColor: theme.colors.shadowAccent,
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
  loading = false,
  accessibilityLabel,
}: AppButtonProps) {
  const { theme } = useTheme();
  const isIconOnly = !label;
  const isDisabled = disabled || loading;

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
          minHeight: 44,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        label: {
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
        },
      }),
    [fullWidth, theme],
  );

  const variantStyle = resolveButtonStyle(variant, theme);
  const buttonSize = resolveButtonSize(size, theme);

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      pressedOpacity={0.95}
      pressedScale={0.975}
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          paddingVertical: buttonSize.paddingVertical,
          paddingHorizontal: isIconOnly ? theme.tokens.spacing.sm : buttonSize.paddingHorizontal,
          opacity: isDisabled ? 0.5 : 1,
          shadowColor: variantStyle.shadowColor,
          shadowOpacity: variant === "accent" ? 0.28 : (theme.isDark ? 0.2 : 0.1),
          shadowRadius: variant === "accent" ? 16 : 10,
          shadowOffset: { width: 0, height: variant === "accent" ? 8 : 4 },
          elevation: theme.tokens.elevation.sm,
          minWidth: isIconOnly ? 44 : undefined,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.textColor} size="small" />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          {label ? (
            <Text style={[styles.label, { color: variantStyle.textColor, fontSize: buttonSize.fontSize }]}>
              {label}
            </Text>
          ) : null}
        </>
      )}
    </PressableScale>
  );
}

export default memo(AppButton);
