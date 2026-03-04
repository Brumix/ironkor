import { StyleSheet, Switch, Text, View } from "react-native";

import WorkoutPage from "@/components/workout/WorkoutPage";

export default function SettingsScreen() {
  return (
    <WorkoutPage
      title="Settings"
      subtitle="Customize your workout tracking preferences and app behavior."
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.label}>Auto-start timer</Text>
            <Text style={styles.description}>Start rest timer automatically after each set.</Text>
          </View>
          <Switch value />
        </View>

        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.label}>Haptic feedback</Text>
            <Text style={styles.description}>Vibrate on set completion and timer end.</Text>
          </View>
          <Switch value />
        </View>

        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.label}>Weight unit</Text>
            <Text style={styles.description}>Current unit: kilograms (kg).</Text>
          </View>
          <Text style={styles.value}>kg</Text>
        </View>
      </View>
    </WorkoutPage>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#16181D",
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  label: {
    color: "#F4F6F8",
    fontSize: 15,
    fontWeight: "700",
  },
  description: {
    color: "#AFB4BD",
    fontSize: 12,
    lineHeight: 17,
  },
  value: {
    color: "#101114",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontWeight: "700",
    fontSize: 12,
  },
});
