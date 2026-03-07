import { useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { useTheme } from "@/theme";

export default function SettingsScreen() {
  const { mode, setMode, theme } = useTheme();
  const [autoStartTimer, setAutoStartTimer] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.tokens.spacing.md,
        },
        textBlock: {
          flex: 1,
          gap: theme.tokens.spacing.xxs + 1,
        },
        label: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        description: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          lineHeight: theme.tokens.typography.fontSize.sm * theme.tokens.typography.lineHeight.relaxed,
        },
      }),
    [theme],
  );

  return (
    <WorkoutPage title="Settings" subtitle="Tune app behavior for speed, comfort, and focus in the gym.">
      <AppCard>
        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.label}>Auto-start timer</Text>
            <Text style={styles.description}>Start rest timer automatically right after each completed set.</Text>
          </View>
          <Switch onValueChange={setAutoStartTimer} value={autoStartTimer} />
        </View>

        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.label}>Haptic feedback</Text>
            <Text style={styles.description}>Vibrate when sets are checked or timers finish.</Text>
          </View>
          <Switch onValueChange={setHapticFeedback} value={hapticFeedback} />
        </View>
      </AppCard>

      <AppCard variant="muted">
        <Text style={styles.label}>Theme mode</Text>
        <Text style={styles.description}>Switch between system, light, and dark themes.</Text>
        <View style={{ flexDirection: "row", gap: theme.tokens.spacing.sm, flexWrap: "wrap" }}>
          <AppButton label="System" onPress={() => { setMode("system"); }} size="sm" variant={mode === "system" ? "primary" : "secondary"} />
          <AppButton label="Light" onPress={() => { setMode("light"); }} size="sm" variant={mode === "light" ? "primary" : "secondary"} />
          <AppButton label="Dark" onPress={() => { setMode("dark"); }} size="sm" variant={mode === "dark" ? "primary" : "secondary"} />
        </View>
      </AppCard>
    </WorkoutPage>
  );
}
