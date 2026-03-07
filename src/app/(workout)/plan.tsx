import { useQuery } from "convex/react";
import { StyleSheet, Text, View } from "react-native";

import WorkoutPage from "@/components/workout/WorkoutPage";
import { mapRoutineDetailed } from "@/features/workout/mappers";
import { buildWeeklyPlan } from "@/features/workout/selectors";

import { api } from "@convex/_generated/api";

export default function PlanScreen() {
  const activeRoutineData = useQuery(api.routines.getActiveDetailed);
  const activeRoutine = activeRoutineData ? mapRoutineDetailed(activeRoutineData) : null;
  const weeklyPlan = activeRoutine ? buildWeeklyPlan(activeRoutine) : null;

  if (activeRoutineData === undefined) {
    return (
      <WorkoutPage title="Plan" subtitle="Loading your weekly plan...">
        <View style={styles.rowTrain}>
          <Text style={styles.session}>Syncing plan...</Text>
        </View>
      </WorkoutPage>
    );
  }

  if (!activeRoutine || !weeklyPlan) {
    return (
      <WorkoutPage title="Plan" subtitle="Automatic weekly planning with training and rest days.">
        <View style={styles.rowRest}>
          <Text style={styles.session}>Create and activate a routine to see your weekly plan.</Text>
        </View>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      title="Plan"
      subtitle="Automatic weekly planning with training and rest days."
    >
      {weeklyPlan.dayPlans.map((dayPlan) => {
        return (
          <View
            key={dayPlan.dateISO}
            style={[styles.row, dayPlan.type === "train" ? styles.rowTrain : styles.rowRest]}
          >
            <View>
              <Text style={styles.date}>{new Date(dayPlan.dateISO).toLocaleDateString("en-US", { weekday: "long", day: "2-digit", month: "2-digit" })}</Text>
              <Text style={styles.session}>{dayPlan.type === "train" ? dayPlan.sessionName ?? "Workout" : "Rest"}</Text>
            </View>

            <View style={styles.right}>
              <Text style={styles.typeTag}>{dayPlan.type === "train" ? "Workout" : "Rest"}</Text>
              {dayPlan.type === "train" ? (
                <Text style={styles.duration}>{dayPlan.estimatedDurationMinutes} min</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </WorkoutPage>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  rowTrain: {
    backgroundColor: "#16181D",
    borderRadius: 18,
    padding: 14,
  },
  rowRest: {
    backgroundColor: "#131923",
    borderRadius: 18,
    padding: 14,
  },
  date: {
    color: "#CAD1DD",
    fontSize: 12,
    textTransform: "capitalize",
  },
  session: {
    marginTop: 3,
    color: "#F4F6F8",
    fontSize: 16,
    fontWeight: "700",
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  typeTag: {
    color: "#101114",
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  duration: {
    color: "#AFB4BD",
    fontSize: 12,
    fontWeight: "600",
  },
});
