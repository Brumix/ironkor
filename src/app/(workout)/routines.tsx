import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";

import WorkoutPage from "@/components/workout/WorkoutPage";

import { api } from "@convex/_generated/api";

export default function RoutinesScreen() {
  const routinesData = useQuery(api.routines.listDetailed);
  const exercisesData = useQuery(api.exercises.list);

  const seedDefaults = useMutation(api.routines.seedDefaultsIfEmpty);
  const deleteRoutine = useMutation(api.routines.deleteRoutine);
  const setActive = useMutation(api.routines.setActive);
  const toggleActive = useMutation(api.routines.toggleActive);

  const routines = useMemo(() => routinesData ?? [], [routinesData]);
  const activeRoutine = useMemo(() => routines.find((routine) => routine.isActive) ?? null, [routines]);

  useEffect(() => {
    if (routinesData === undefined || exercisesData === undefined) {
      return;
    }

    if (routinesData.length === 0) {
      seedDefaults().catch(() => {
        // no-op
      });
    }
  }, [routinesData, exercisesData, seedDefaults]);

  function handleDeleteRoutine(routineId: string, routineName: string) {
    Alert.alert("Delete routine", `Delete \"${routineName}\"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteRoutine({ routineId: routineId as never }).catch(() => {
            Alert.alert("Failed", "Could not delete routine.");
          });
        },
      },
    ]);
  }

  if (routinesData === undefined || exercisesData === undefined) {
    return (
      <WorkoutPage title="Routines" subtitle="Loading your routine workspace...">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Syncing routines...</Text>
        </View>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      title="Routines"
      subtitle="Build, activate, and manage routines. Open a routine to edit sessions, exercises, and weekly plan."
    >
      <Animated.View entering={FadeInDown.delay(30)} layout={LinearTransition.springify()} style={styles.heroCard}>
        <Text style={styles.heroLabel}>Active routine</Text>
        <Text style={styles.heroTitle}>{activeRoutine?.name ?? "No active routine"}</Text>
        <Text style={styles.heroMeta}>
          {activeRoutine ? `${activeRoutine.daysPerWeek} training days per week` : "Create and activate one to start"}
        </Text>
      </Animated.View>

      <View style={styles.headerRow}>
        <Text style={styles.sectionHeading}>All routines</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            router.push({ pathname: "/(workout)/routine-editor", params: { routineId: "new" } });
          }}
        >
          <Text style={styles.primaryButtonText}>New routine</Text>
        </Pressable>
      </View>

      {routines.map((routine, index) => (
        <Animated.View
          key={String(routine._id)}
          entering={FadeInUp.delay(40 + index * 40)}
          layout={LinearTransition.springify()}
          style={styles.card}
        >
          <View style={styles.cardTopRow}>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{routine.name}</Text>
              <Text style={styles.cardMeta}>{routine.daysPerWeek} days/week • {routine.sessions.length} sessions</Text>
            </View>
            {routine.isActive ? <Text style={styles.activeTag}>Active</Text> : null}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.inlineBtn}
              onPress={() => {
                router.push({ pathname: "/(workout)/routine-editor", params: { routineId: String(routine._id) } });
              }}
            >
              <Text style={styles.inlineBtnText}>Edit</Text>
            </Pressable>

            {routine.isActive ? (
              <Pressable
                style={styles.inlineBtn}
                onPress={() => {
                  toggleActive({ routineId: routine._id, isActive: false }).catch(() => {
                    Alert.alert("Failed", "Could not deactivate routine.");
                  });
                }}
              >
                <Text style={styles.inlineBtnText}>Deactivate</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.inlineBtn}
                onPress={() => {
                  setActive({ routineId: routine._id }).catch(() => {
                    Alert.alert("Failed", "Could not activate routine.");
                  });
                }}
              >
                <Text style={styles.inlineBtnText}>Activate</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.inlineBtn, styles.dangerBtn]}
              onPress={() => {
                handleDeleteRoutine(String(routine._id), routine.name);
              }}
            >
              <Text style={[styles.inlineBtnText, styles.dangerText]}>Delete</Text>
            </Pressable>
          </View>
        </Animated.View>
      ))}
    </WorkoutPage>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "#151920",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2A3140",
    gap: 5,
  },
  heroLabel: {
    color: "#9AA5B8",
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: "#F8FAFF",
    fontSize: 24,
    fontWeight: "800",
  },
  heroMeta: {
    color: "#AEB7C7",
    fontSize: 13,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  sectionHeading: {
    color: "#E8EBF2",
    fontSize: 16,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#16181D",
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: "#F4F6F8",
    fontSize: 18,
    fontWeight: "700",
  },
  cardMeta: {
    color: "#A9B1BE",
    fontSize: 13,
  },
  activeTag: {
    color: "#0E1117",
    backgroundColor: "#D7E0EE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  inlineBtn: {
    backgroundColor: "#242A34",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineBtnText: {
    color: "#E7ECF6",
    fontSize: 12,
    fontWeight: "700",
  },
  dangerBtn: {
    backgroundColor: "#3A2428",
  },
  dangerText: {
    color: "#FFBFC9",
  },
  primaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  primaryButtonText: {
    color: "#101114",
    fontWeight: "700",
    fontSize: 12,
  },
});
