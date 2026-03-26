import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect, useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme";

interface FloatingActionButtonProps {
  label?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
  onPress: () => void;
  bottomOffset?: number;
  pulsing?: boolean;
  variant?: "primary" | "accent";
}

function FloatingActionButton({
  label,
  iconName = "add",
  accessibilityLabel,
  onPress,
  bottomOffset = 112,
  pulsing = false,
  variant = "accent",
}: FloatingActionButtonProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (pulsing) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [pulsing, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          position: "absolute",
          right: theme.tokens.spacing.lg,
          bottom: Math.max(insets.bottom + theme.tokens.spacing.lg, bottomOffset),
        },
        button: {
          minHeight: 58,
          borderRadius: theme.tokens.radius.pill,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: variant === "accent" ? theme.colors.borderAccent : theme.colors.borderStrong,
          paddingHorizontal: theme.tokens.spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.tokens.spacing.xs,
          shadowColor: variant === "accent" ? theme.colors.shadowAccent : theme.colors.shadow,
          shadowOpacity: 0.34,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: theme.tokens.elevation.lg,
        },
        gradient: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
        content: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.xs,
        },
        label: {
          color: variant === "accent" ? theme.colors.onAccent : theme.colors.onPrimary,
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
        },
      }),
    [bottomOffset, insets.bottom, theme, variant],
  );

  const gradientColors: [string, string] =
    variant === "accent"
      ? [theme.gradients.heroAccentStart, theme.gradients.heroAccentEnd]
      : [theme.gradients.heroNeutralStart, theme.gradients.heroNeutralEnd];

  const iconColor = variant === "accent" ? theme.colors.onAccent : theme.colors.onPrimary;

  return (
    <Animated.View style={[styles.wrapper, pulseStyle]}>
      <PressableScale
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        onPress={onPress}
        pressedOpacity={0.95}
        pressedScale={0.96}
        style={styles.button}
      >
        <LinearGradient
          colors={gradientColors}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.gradient}
        />
        <Animated.View style={styles.content}>
          <Ionicons color={iconColor} name={iconName} size={22} />
          {label ? <Text style={styles.label}>{label}</Text> : null}
        </Animated.View>
      </PressableScale>
    </Animated.View>
  );
}

export default memo(FloatingActionButton);
