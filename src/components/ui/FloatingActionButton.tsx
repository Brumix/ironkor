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
  const edgeLight = theme.isDark ? "rgba(255,255,255,0.22)" : "#40454E";
  const edgeDark = theme.isDark ? "rgba(0,0,0,0.74)" : "#070A0F";

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
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1.5,
          borderTopColor: edgeLight,
          borderLeftColor: edgeLight,
          borderRightColor: edgeDark,
          borderBottomColor: edgeDark,
          paddingHorizontal: theme.tokens.spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.tokens.spacing.xs,
          shadowColor: "#000000",
          shadowOpacity: theme.isDark ? 0.4 : 0.2,
          shadowRadius: 18,
          shadowOffset: { width: 2, height: 9 },
          elevation: theme.tokens.elevation.lg,
        },
        label: {
          color: theme.colors.onPrimary,
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
      }),
    [bottomOffset, edgeDark, edgeLight, insets.bottom, theme],
  );

  return (
    <PressableScale accessibilityRole="button" pressedOpacity={0.95} pressedScale={0.975} style={styles.button} onPress={onPress}>
      <Ionicons color={theme.colors.onPrimary} name={iconName} size={20} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </PressableScale>
  );
}

export default memo(FloatingActionButton);
