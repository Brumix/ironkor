import { useQuery } from "convex/react";
import { StyleSheet, Text, View } from "react-native";

import WorkoutPage from "@/components/workout/WorkoutPage";
import { mapRoutineDetailed } from "@/features/workout/mappers";

import { api } from "@convex/_generated/api";

export default function HomeScreen() {
  const activeRoutineData = useQuery(api.routines.getActiveDetailed);
  const activeRoutine = activeRoutineData ? mapRoutineDetailed(activeRoutineData) : null;

  if (activeRoutineData === undefined) {
    return (
      <WorkoutPage title="Home" subtitle="Loading your active routine...">
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>Syncing routines...</Text>
        </View>
      </WorkoutPage>
    );
  }

  if (!activeRoutine) {
    return (
      <WorkoutPage title="Home" subtitle="No active routine yet.">
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>Create and activate your first routine in the Routines tab.</Text>
        </View>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      title="Home"
      subtitle="Quick overview of your weekly split so you can train fast and stay focused."
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{activeRoutine.name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeRoutine.daysPerWeek} days/week</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Routine sessions</Text>
        {activeRoutine.sessions.map((session, index) => (
          <View key={session.id} style={styles.sessionRow}>
            <Text style={styles.sessionIndex}>{index + 1}</Text>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionName}>{session.name}</Text>
              <Text style={styles.sessionMeta}>{session.exercises.length} exercises</Text>
            </View>
          </View>
        ))}
      </View>
    </WorkoutPage>
  );
}

const styles = StyleSheet.create({
  placeholderCard: {
    backgroundColor: "#16181D",
    borderRadius: 20,
    padding: 18,
  },
  placeholderText: {
    color: "#B7BEC8",
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#16181D",
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    color: "#F4F6F8",
    fontSize: 20,
    fontWeight: "700",
  },
  badge: {
    backgroundColor: "#272B33",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#CCD2DC",
    fontWeight: "600",
    fontSize: 12,
  },
  sectionTitle: {
    color: "#AFB4BD",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#20242B",
    borderRadius: 14,
    padding: 12,
  },
  sessionIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#303543",
    textAlign: "center",
    textAlignVertical: "center",
    color: "#F4F6F8",
    fontWeight: "700",
    overflow: "hidden",
  },
  sessionInfo: {
    gap: 2,
  },
  sessionName: {
    color: "#F4F6F8",
    fontSize: 16,
    fontWeight: "700",
  },
  sessionMeta: {
    color: "#AFB4BD",
    fontSize: 13,
  },
});
