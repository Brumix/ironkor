import { LinearGradient } from "expo-linear-gradient";
import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme";

import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

interface GradientCardProps {
  children: ReactNode;
  colors?: [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

function GradientCard({
  children,
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  onPress,
}: GradientCardProps) {
  const { theme } = useTheme();

  const gradientColors: [string, string, ...string[]] = colors ?? [
    theme.gradients.heroAccentStart,
    theme.gradients.heroAccentEnd,
  ];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          borderRadius: theme.tokens.radius.lg,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: theme.colors.borderSoft,
          shadowColor: theme.colors.shadowAccent,
          shadowOpacity: theme.isDark ? 0.34 : 0.18,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 10 },
          elevation: theme.tokens.elevation.md,
        },
        gradient: {
          padding: theme.tokens.spacing.lg,
          gap: theme.tokens.spacing.sm,
        },
        overlay: {
          ...StyleSheet.absoluteFill,
          backgroundColor: theme.colors.overlaySoft,
        },
      }),
    [theme],
  );

  const content = (
    <>
      <LinearGradient colors={gradientColors} end={end} start={start} style={styles.gradient}>
        <View style={styles.overlay} />
        {children}
      </LinearGradient>
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.container, style]}>
        {content}
      </PressableScale>
    );
  }

  return <View style={[styles.container, style]}>{content}</View>;
}

export default memo(GradientCard);
