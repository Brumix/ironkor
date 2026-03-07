import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { mockExercises, mockLogs } from "@/features/workout/mockData";
import { getExerciseMap } from "@/features/workout/selectors";
import { useTheme } from "@/theme";

export default function HistoryScreen() {
  const { theme } = useTheme();
  const exerciseMap = getExerciseMap(mockExercises);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.tokens.spacing.sm,
        },
        sessionName: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.xl,
          fontWeight: theme.tokens.typography.fontWeight.bold,
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
      }),
    [theme],
  );

  return (
    <WorkoutPage headerChip={{ icon: "time-outline", label: "History" }}>
      {mockLogs.map((log, index) => (
        <Animated.View entering={FadeInUp.delay(40 + index * 30)} key={log.id}>
          <AppCard>
            <View style={styles.headerRow}>
              <Text style={styles.sessionName}>{log.sessionName}</Text>
              <AppChip label={`${log.durationMinutes} min`} variant="neutral" />
            </View>
            <Text style={styles.date}>{new Date(log.dateISO).toLocaleDateString("en-US")}</Text>

            {log.entries.map((entry) => {
              const exercise = exerciseMap.get(entry.exerciseId);
              const topSet = entry.performedSets.reduce((max, current) => {
                return current.loadKg > max.loadKg ? current : max;
              }, entry.performedSets[0]);

              return (
                <Text key={`${log.id}-${entry.exerciseId}`} style={styles.entry}>
                  {exercise?.name ?? entry.exerciseId}: {entry.performedSets.length} sets • top set{" "}
                  {topSet.reps} reps x {topSet.loadKg}kg
                </Text>
              );
            })}

            {log.notes ? <Text style={styles.notes}>{log.notes}</Text> : null}
          </AppCard>
        </Animated.View>
      ))}
    </WorkoutPage>
  );
}
