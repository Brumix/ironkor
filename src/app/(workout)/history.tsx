import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import MetricCard from "@/components/ui/MetricCard";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { mockExercises, mockLogs } from "@/features/workout/mockData";
import { getExerciseMap } from "@/features/workout/selectors";
import { useTheme } from "@/theme";

export default function HistoryScreen() {
  const { theme } = useTheme();
  const exerciseMap = getExerciseMap(mockExercises);

  const bestSessionLoad = Math.max(
    ...mockLogs.map((log) =>
      log.entries.reduce((sessionMax, entry) => {
        const topSet = entry.performedSets.reduce((max, current) => (current.loadKg > max.loadKg ? current : max), entry.performedSets[0]);
        return Math.max(sessionMax, topSet.loadKg);
      }, 0),
    ),
  );
  const averageDuration = Math.round(
    mockLogs.reduce((sum, log) => sum + log.durationMinutes, 0) / Math.max(mockLogs.length, 1),
  );

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
        headerRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: theme.tokens.spacing.sm,
        },
        sessionName: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          flex: 1,
        },
        date: {
          color: theme.colors.textSubtle,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
        entry: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          lineHeight: theme.tokens.typography.fontSize.sm * theme.tokens.typography.lineHeight.relaxed,
        },
        notes: {
          color: theme.colors.textSubtle,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontStyle: "italic",
          marginTop: theme.tokens.spacing.xxs + 2,
        },
        entryList: {
          gap: theme.tokens.spacing.xs,
        },
        metaRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.xs,
        },
      }),
    [theme],
  );

  return (
    <WorkoutPage headerChip={{ icon: "time-outline", label: "History" }} subtitle="Performance log">
      <SectionHeader
        title="Performance snapshot"
        subtitle="A motivating overview of your recent training"
      />

      <Animated.View entering={FadeInUp.delay(30).springify().damping(18)} style={styles.metricsRow}>
        <View style={styles.metricColumn}>
          <MetricCard helper="Heaviest top set in recent logs" icon="trophy-outline" label="Top Load" tone="accent" value={`${bestSessionLoad}kg`} />
        </View>
        <View style={styles.metricColumn}>
          <MetricCard helper="Average time spent per workout" icon="time-outline" label="Avg Duration" value={`${averageDuration}m`} />
        </View>
      </Animated.View>

      <SectionHeader
        title="Recent sessions"
        subtitle="Expandable-style cards that surface the important parts first"
      />

      {mockLogs.map((log, index) => (
        <Animated.View entering={FadeInUp.delay(50 + index * 28)} key={log.id}>
          <AppCard variant="default">
            <View style={styles.headerRow}>
              <View style={{ flex: 1, gap: theme.tokens.spacing.xs }}>
                <Text style={styles.sessionName}>{log.sessionName}</Text>
                <Text style={styles.date}>{new Date(log.dateISO).toLocaleDateString("en-US")}</Text>
              </View>
              <AppChip label={`${log.durationMinutes} min`} variant="accent" />
            </View>

            <View style={styles.metaRow}>
              <AppChip label={`${log.entries.length} exercises`} variant="neutral" />
              <AppChip label="Workout complete" variant="success" />
            </View>

            <View style={styles.entryList}>
              {log.entries.map((entry) => {
                const exercise = exerciseMap.get(entry.exerciseId);
                const topSet = entry.performedSets.reduce((max, current) => {
                  return current.loadKg > max.loadKg ? current : max;
                }, entry.performedSets[0]);

                return (
                  <Text key={`${log.id}-${entry.exerciseId}`} style={styles.entry}>
                    {exercise?.name ?? entry.exerciseId}: {entry.performedSets.length} sets, top set {topSet.reps} reps x {topSet.loadKg}kg
                  </Text>
                );
              })}
            </View>

            {log.notes ? <Text style={styles.notes}>{log.notes}</Text> : null}
          </AppCard>
        </Animated.View>
      ))}
    </WorkoutPage>
  );
}
