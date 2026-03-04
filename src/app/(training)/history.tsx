import { StyleSheet, Text, View } from "react-native";

import WorkoutPage from "@/components/workout/WorkoutPage";
import { mockExercises, mockLogs } from "@/features/workout/mockData";
import { getExerciseMap } from "@/features/workout/selectors";

export default function HistoryScreen() {
  const exerciseMap = getExerciseMap(mockExercises);

  return (
    <WorkoutPage
      title="History"
      subtitle="Log of completed workouts with duration, loads, and notes."
    >
      {mockLogs.map((log) => (
        <View key={log.id} style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.sessionName}>{log.sessionName}</Text>
            <Text style={styles.duration}>{log.durationMinutes} min</Text>
          </View>
          <Text style={styles.date}>{new Date(log.dateISO).toLocaleDateString("en-US")}</Text>

          {log.entries.map((entry) => {
            const exercise = exerciseMap.get(entry.exerciseId);
            const topSet = entry.performedSets.reduce((max, current) => {
              return current.loadKg > max.loadKg ? current : max;
            }, entry.performedSets[0]);

            return (
              <Text key={`${log.id}-${entry.exerciseId}`} style={styles.entry}>
                {exercise?.name ?? entry.exerciseId}: {entry.performedSets.length} sets • top set {topSet.reps} reps x {topSet.loadKg}kg
              </Text>
            );
          })}

          {log.notes ? <Text style={styles.notes}>{log.notes}</Text> : null}
        </View>
      ))}
    </WorkoutPage>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#16181D",
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionName: {
    color: "#F4F6F8",
    fontSize: 17,
    fontWeight: "700",
  },
  duration: {
    color: "#101114",
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  date: {
    color: "#B0B6C1",
    fontSize: 12,
    marginBottom: 2,
  },
  entry: {
    color: "#DCE1EA",
    fontSize: 13,
    lineHeight: 19,
  },
  notes: {
    marginTop: 4,
    color: "#A8AFBA",
    fontSize: 12,
    fontStyle: "italic",
  },
});
