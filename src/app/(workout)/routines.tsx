import { StyleSheet, Text, View } from "react-native";

import WorkoutPage from "@/components/workout/WorkoutPage";
import { mockExercises } from "@/features/workout/mockData";

export default function RoutinesScreen() {
  return (
    <WorkoutPage
      title="Routines"
      subtitle="Exercise list with sets, reps, rest time, and target muscles."
    >
      {mockExercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <View style={styles.rowTop}>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.variant}>{exercise.variant}</Text>
          </View>
          <Text style={styles.targets}>
            {exercise.setsTarget} sets • {exercise.repsTarget} reps • {exercise.restSeconds}s rest
          </Text>
          <Text style={styles.muscles}>
            Primary: {exercise.primaryMuscles.join(", ")} | Secondary: {exercise.secondaryMuscles.join(", ")}
          </Text>
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
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  name: {
    flex: 1,
    color: "#F4F6F8",
    fontSize: 16,
    fontWeight: "700",
  },
  variant: {
    color: "#BCC2CC",
    fontSize: 12,
    fontWeight: "600",
    backgroundColor: "#232831",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  targets: {
    color: "#D8DEE8",
    fontSize: 13,
  },
  muscles: {
    color: "#A8AFBA",
    fontSize: 12,
    lineHeight: 17,
  },
});
