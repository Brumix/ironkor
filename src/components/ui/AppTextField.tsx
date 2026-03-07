import { memo, useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "@/theme";

import type { TextInputProps } from "react-native";

interface AppTextFieldProps extends TextInputProps {
  label?: string;
}

function AppTextField({ label, ...inputProps }: AppTextFieldProps) {
  const { theme } = useTheme();

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
          fontWeight: theme.tokens.typography.fontWeight.bold,
          textTransform: "uppercase",
          letterSpacing: 0.7,
        },
        input: {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          color: theme.colors.text,
          paddingHorizontal: theme.tokens.spacing.md,
          paddingVertical: theme.tokens.spacing.sm + 2,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.medium,
        },
      }),
    [theme],
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
