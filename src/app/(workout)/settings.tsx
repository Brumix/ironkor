import { useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import MetricCard from "@/components/ui/MetricCard";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { useTheme } from "@/theme";

export default function SettingsScreen() {
  const { mode, setMode, theme } = useTheme();
  const [autoStartTimer, setAutoStartTimer] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        metricsRow: {
          flexDirection: "row",
          gap: theme.tokens.spacing.md,
        },
        metricColumn: {
          flex: 1,
        },
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
          fontSize: theme.tokens.typography.fontSize.lg,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        description: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          lineHeight: theme.tokens.typography.fontSize.sm * theme.tokens.typography.lineHeight.relaxed,
        },
        themeRow: {
          flexDirection: "row",
          gap: theme.tokens.spacing.sm,
          flexWrap: "wrap",
        },
      }),
    [theme],
  );

  return (
    <WorkoutPage headerChip={{ icon: "options-outline", label: "Preferences" }} subtitle="Gym-ready setup">
      <SectionHeader
        title="Interaction"
        subtitle="Small settings that make the workout flow feel faster"
      />

      <AppCard>
        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.label}>Auto-start timer</Text>
            <Text style={styles.description}>Start the rest timer as soon as a set is marked complete.</Text>
          </View>
          <Switch
            onValueChange={setAutoStartTimer}
            thumbColor={theme.colors.surface}
            trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.accent }}
            value={autoStartTimer}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.label}>Haptic feedback</Text>
            <Text style={styles.description}>Feel subtle tactile confirmation when sets are checked off.</Text>
          </View>
          <Switch
            onValueChange={setHapticFeedback}
            thumbColor={theme.colors.surface}
            trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.accent }}
            value={hapticFeedback}
          />
        </View>
      </AppCard>

      <SectionHeader
        title="Visual mode"
        subtitle="Switch between light, dark, or system-controlled themes"
      />

      <AppCard variant="muted">
        <View style={styles.themeRow}>
          <AppButton label="System" onPress={() => { setMode("system"); }} size="sm" variant={mode === "system" ? "accent" : "secondary"} />
          <AppButton label="Light" onPress={() => { setMode("light"); }} size="sm" variant={mode === "light" ? "accent" : "secondary"} />
          <AppButton label="Dark" onPress={() => { setMode("dark"); }} size="sm" variant={mode === "dark" ? "accent" : "secondary"} />
        </View>
      </AppCard>

      <SectionHeader
        title="Experience"
        subtitle="A quick summary of the current behavior preferences"
      />

      <View style={styles.metricsRow}>
        <View style={styles.metricColumn}>
          <MetricCard
            helper="Rest timer begins right after a completed set"
            icon="timer-outline"
            label="Auto Timer"
            tone={autoStartTimer ? "success" : "default"}
            value={autoStartTimer ? "On" : "Off"}
          />
        </View>
        <View style={styles.metricColumn}>
          <MetricCard
            helper="Tactile feedback when sets are completed"
            icon="phone-portrait-outline"
            label="Haptics"
            tone={hapticFeedback ? "accent" : "default"}
            value={hapticFeedback ? "On" : "Off"}
          />
        </View>
      </View>
    </WorkoutPage>
  );
}
