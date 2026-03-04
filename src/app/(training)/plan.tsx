import { StyleSheet, Text, View } from "react-native";

import WorkoutPage from "@/components/workout/WorkoutPage";
import { mockRoutine } from "@/features/workout/mockData";
import { getMockWeeklyPlan, getSessionById } from "@/features/workout/selectors";

export default function PlanScreen() {
  const weeklyPlan = getMockWeeklyPlan();

  return (
    <WorkoutPage
      title="Plan"
      subtitle="Automatic weekly planning with training and rest days."
    >
      {weeklyPlan.dayPlans.map((dayPlan) => {
        const session = getSessionById(mockRoutine, dayPlan.sessionId);

        return (
          <View
            key={dayPlan.dateISO}
            style={[styles.row, dayPlan.type === "train" ? styles.rowTrain : styles.rowRest]}
          >
            <View>
              <Text style={styles.date}>{new Date(dayPlan.dateISO).toLocaleDateString("en-US", { weekday: "long", day: "2-digit", month: "2-digit" })}</Text>
              <Text style={styles.session}>{dayPlan.type === "train" ? session?.name ?? "Workout" : "Rest"}</Text>
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
  },
  rowRest: {
    backgroundColor: "#131923",
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
