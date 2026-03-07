import { useQuery } from "convex/react";
import { StyleSheet, Text, View } from "react-native";

import WorkoutPage from "@/components/workout/WorkoutPage";
import { mapRoutineDetailed } from "@/features/workout/mappers";
import { buildWeeklyPlan, getSessionById, getTodayPlan } from "@/features/workout/selectors";

import { api } from "@convex/_generated/api";

export default function StartScreen() {
  const activeRoutineData = useQuery(api.routines.getActiveDetailed);
  const activeRoutine = activeRoutineData ? mapRoutineDetailed(activeRoutineData) : null;
  const weeklyPlan = activeRoutine ? buildWeeklyPlan(activeRoutine) : null;
  const todayPlan = weeklyPlan ? getTodayPlan(weeklyPlan) : null;
  const todaySession = activeRoutine ? getSessionById(activeRoutine, todayPlan?.sessionId) : null;

  if (activeRoutineData === undefined) {
    return (
      <WorkoutPage title="Start" subtitle="Loading today's workout...">
        <View style={styles.restCard}>
          <Text style={styles.restTitle}>Preparing session</Text>
          <Text style={styles.restText}>Syncing your active routine and weekly plan.</Text>
        </View>
      </WorkoutPage>
    );
  }

  if (!activeRoutine || !todayPlan || todayPlan.type === "rest" || !todaySession) {
    return (
      <WorkoutPage
        title="Start"
        subtitle="Today is a rest day. Recover, hydrate, and get ready for your next workout."
      >
        <View style={styles.restCard}>
          <Text style={styles.restTitle}>Active recovery</Text>
          <Text style={styles.restText}>Suggestion: 20-30 min walk + light mobility work.</Text>
        </View>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      title="Start"
      subtitle={`Today's workout: ${todaySession.name} • estimate ${todayPlan.estimatedDurationMinutes} min`}
    >
      <View style={styles.sessionCard}>
        <Text style={styles.sessionTitle}>{todaySession.name}</Text>
        <Text style={styles.sessionMeta}>{todaySession.exercises.length} planned exercises</Text>
      </View>

      {todaySession.exercises.map((sessionExercise, index) => {
        const exercise = sessionExercise.exercise;

        return (
          <View key={sessionExercise.id} style={styles.exerciseCard}>
            <Text style={styles.exerciseIndex}>{index + 1}</Text>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseTarget}>
                {exercise.setsTarget} sets • {exercise.repsTarget} reps • {exercise.restSeconds}s
              </Text>
            </View>
          </View>
        );
      })}
    </WorkoutPage>
  );
}

const styles = StyleSheet.create({
  restCard: {
    backgroundColor: "#16181D",
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  restTitle: {
    color: "#F4F6F8",
    fontSize: 18,
    fontWeight: "700",
  },
  restText: {
    color: "#B5BCC8",
    fontSize: 14,
    lineHeight: 20,
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 4,
  },
  sessionTitle: {
    color: "#121317",
    fontSize: 20,
    fontWeight: "800",
  },
  sessionMeta: {
    color: "#4E545F",
    fontSize: 13,
    fontWeight: "600",
  },
  exerciseCard: {
    backgroundColor: "#16181D",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  exerciseIndex: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#2C313C",
    color: "#F4F6F8",
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "700",
    overflow: "hidden",
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    color: "#F4F6F8",
    fontSize: 16,
    fontWeight: "700",
  },
  exerciseTarget: {
    color: "#AFB4BD",
    fontSize: 13,
  },
});
