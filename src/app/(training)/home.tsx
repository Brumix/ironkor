import { Pressable, StyleSheet, Text, View } from "react-native";

import WorkoutPage from "@/components/workout/WorkoutPage";
import { mockRoutine } from "@/features/workout/mockData";

export default function HomeScreen() {
  return (
    <WorkoutPage
      title="Home"
      subtitle="Quick overview of your weekly split so you can train fast and stay focused."
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{mockRoutine.name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{mockRoutine.daysPerWeek} days/week</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Routine sessions</Text>
        {mockRoutine.sessions.map((session, index) => (
          <View key={session.id} style={styles.sessionRow}>
            <Text style={styles.sessionIndex}>{index + 1}</Text>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionName}>{session.name}</Text>
              <Text style={styles.sessionMeta}>{session.exerciseIds.length} exercises</Text>
            </View>
          </View>
        ))}

        <Pressable style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit routine</Text>
        </Pressable>
      </View>
    </WorkoutPage>
  );
}

const styles = StyleSheet.create({
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
  editButton: {
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  editButtonText: {
    color: "#121317",
    fontSize: 14,
    fontWeight: "700",
  },
});
