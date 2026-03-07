import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme";

interface FloatingActionButtonProps {
  label?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  bottomOffset?: number;
}

function FloatingActionButton({
  label,
  iconName = "add",
  onPress,
  bottomOffset = 112,
}: FloatingActionButtonProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          position: "absolute",
          right: theme.tokens.spacing.lg,
          bottom: Math.max(insets.bottom + theme.tokens.spacing.lg, bottomOffset),
          minHeight: 54,
          borderRadius: theme.tokens.radius.pill,
          backgroundColor: theme.colors.primary,
          borderWidth: 1,
          borderColor: theme.colors.primary,
          paddingHorizontal: theme.tokens.spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.tokens.spacing.xs,
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: theme.tokens.elevation.lg,
        },
        label: {
          color: theme.colors.onPrimary,
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
      }),
    [bottomOffset, insets.bottom, theme],
  );

  return (
    <PressableScale accessibilityRole="button" style={styles.button} onPress={onPress}>
      <Ionicons color={theme.colors.onPrimary} name={iconName} size={20} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </PressableScale>
  );
}

export default memo(FloatingActionButton);
