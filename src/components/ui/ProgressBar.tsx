import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/theme";

interface ProgressBarProps {
  progress: number;
  height?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function ProgressBar({ progress, height }: ProgressBarProps) {
  const { theme } = useTheme();
  const normalizedProgress = clamp(progress, 0, 1);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          width: "100%",
          borderRadius: theme.tokens.radius.pill,
          overflow: "hidden",
          backgroundColor: theme.colors.surfaceMuted,
          borderWidth: 1,
          borderColor: theme.colors.border,
          height: height ?? 10,
        },
        fill: {
          height: "100%",
          borderRadius: theme.tokens.radius.pill,
          backgroundColor: theme.colors.primary,
        },
      }),
    [height, theme],
  );

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${normalizedProgress * 100}%` }]} />
    </View>
  );
}

export default memo(ProgressBar);
