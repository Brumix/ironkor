import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "@/theme";

interface HeaderBackButtonProps {
  onPress: () => void;
}

export default function HeaderBackButton({ onPress }: HeaderBackButtonProps) {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.xs,
          alignSelf: "flex-start",
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.pill,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.tokens.spacing.md,
          paddingVertical: theme.tokens.spacing.sm,
        },
        label: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
      }),
    [theme],
  );

  return (
    <Pressable accessibilityLabel="Go back" hitSlop={12} onPress={onPress} style={styles.button}>
      <Ionicons color={theme.colors.text} name="chevron-back" size={16} />
      <Text style={styles.label}>Back</Text>
    </Pressable>
  );
}
