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
          minHeight: 50,
          borderRadius: theme.tokens.radius.xs,
          backgroundColor: theme.colors.primary,
          borderTopWidth: 2,
          borderLeftWidth: 2,
          borderBottomWidth: 4,
          borderRightWidth: 4,
          borderTopColor: theme.colors.primarySoft,
          borderLeftColor: theme.colors.primarySoft,
          borderBottomColor: theme.colors.borderStrong,
          borderRightColor: theme.colors.borderStrong,
          paddingHorizontal: theme.tokens.spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.tokens.spacing.xs,
        },
        label: {
          color: theme.colors.onPrimary,
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: 0.95,
          textTransform: "uppercase",
        },
      }),
    [bottomOffset, insets.bottom, theme],
  );

  return (
    <PressableScale accessibilityRole="button" pressedOpacity={1} pressedScale={0.99} style={styles.button} onPress={onPress}>
      <Ionicons color={theme.colors.onPrimary} name={iconName} size={20} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </PressableScale>
  );
}

export default memo(FloatingActionButton);
