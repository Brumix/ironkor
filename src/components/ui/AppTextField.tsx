import { memo, useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "@/theme";

import type { TextInputProps } from "react-native";

interface AppTextFieldProps extends TextInputProps {
  label?: string;
}

function AppTextField({ label, ...inputProps }: AppTextFieldProps) {
  const { theme } = useTheme();
  const insetLight = theme.isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const insetDark = theme.isDark ? "rgba(0,0,0,0.58)" : "#D2D8E2";

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          gap: theme.tokens.spacing.xs,
        },
        label: {
          color: theme.colors.textMuted,
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
        },
        input: {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.sm,
          borderTopWidth: 1.5,
          borderLeftWidth: 1.5,
          borderRightWidth: 1,
          borderBottomWidth: 1,
          borderTopColor: insetDark,
          borderLeftColor: insetDark,
          borderRightColor: insetLight,
          borderBottomColor: insetLight,
          color: theme.colors.text,
          paddingHorizontal: theme.tokens.spacing.md,
          paddingVertical: theme.tokens.spacing.sm + 2,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.medium,
        },
      }),
    [insetDark, insetLight, theme],
  );

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.colors.textSubtle}
        selectionColor={theme.colors.primary}
        {...inputProps}
        style={[styles.input, inputProps.style]}
      />
    </View>
  );
}

export default memo(AppTextField);
