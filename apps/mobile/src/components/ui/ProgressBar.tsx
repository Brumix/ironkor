import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useTheme } from "@/theme";

interface ProgressBarProps {
  progress: number;
  height?: number;
  gradient?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function ProgressBar({ progress, height = 8, gradient = true }: ProgressBarProps) {
  const { theme } = useTheme();
  const normalizedProgress = clamp(progress, 0, 1);
  const progressValue = useSharedValue(normalizedProgress);

  useEffect(() => {
    progressValue.value = withTiming(normalizedProgress, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [normalizedProgress, progressValue]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          width: "100%",
          height,
          borderRadius: theme.tokens.radius.pill,
          overflow: "hidden",
          backgroundColor: theme.colors.surfaceMuted,
        },
        fill: {
          height: "100%",
          borderRadius: theme.tokens.radius.pill,
          backgroundColor: theme.colors.accent,
          overflow: "hidden",
        },
        gradient: {
          flex: 1,
        },
      }),
    [height, theme],
  );

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fillStyle]}>
        {gradient ? (
          <LinearGradient
            colors={[theme.gradients.progressStart, theme.gradients.progressEnd]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={styles.gradient}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

export default memo(ProgressBar);
