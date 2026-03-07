import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { useTheme } from "@/theme";

import { api } from "@convex/_generated/api";

export default function RoutinesScreen() {
  const { theme } = useTheme();
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
  }, [exercisesData, routinesData, seedDefaults]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        title: {
          color: theme.colors.text,
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
        },
        meta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
        },
        cardTopRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.tokens.spacing.sm,
        },
        cardBody: {
          flex: 1,
        },
        rowTitle: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.xl,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        rowMeta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          marginTop: 1,
        },
        actionRow: {
          flexDirection: "row",
          gap: theme.tokens.spacing.xs,
          flexWrap: "wrap",
        },
        helper: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        swipeActions: {
          justifyContent: "center",
          alignItems: "center",
          marginLeft: theme.tokens.spacing.xs,
        },
      }),
    [theme],
  );

  function handleDeleteRoutine(routineId: string, routineName: string) {
    Alert.alert("Delete routine", `Delete "${routineName}"?`, [
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
        <AppCard variant="muted">
          <Text style={styles.helper}>Syncing routines and exercise library...</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      title="Routines"
      subtitle="Build, activate, and tune your routines with fast actions and swipe controls."
      floatingAction={
        <FloatingActionButton
          label="New routine"
          onPress={() => {
            router.push({ pathname: "/(workout)/routine-editor", params: { routineId: "new" } });
          }}
        />
      }
    >
      <Animated.View entering={FadeInUp.delay(20)} layout={LinearTransition.springify()}>
        <AppCard style={{ backgroundColor: theme.gradients.heroPrimary }}>
          <AppChip label="Active routine" variant="primary" />
          <Text style={styles.title}>{activeRoutine?.name ?? "No active routine"}</Text>
          <Text style={styles.meta}>
            {activeRoutine
              ? `${activeRoutine.daysPerWeek} days/week • ${activeRoutine.sessions.length} sessions`
              : "Create one and activate to start training flow."}
          </Text>
        </AppCard>
      </Animated.View>

      <SectionHeader
        action={
          <AppButton
            label="New routine"
            onPress={() => {
              router.push({ pathname: "/(workout)/routine-editor", params: { routineId: "new" } });
            }}
            size="sm"
          />
        }
        title="All routines"
      />

      {routines.map((routine, index) => (
        <Animated.View
          entering={FadeInUp.delay(40 + index * 40)}
          key={String(routine._id)}
          layout={LinearTransition.springify()}
        >
          <ReanimatedSwipeable
            renderRightActions={() => (
              <View style={styles.swipeActions}>
                <AppButton
                  label="Delete"
                  onPress={() => {
                    handleDeleteRoutine(String(routine._id), routine.name);
                  }}
                  size="sm"
                  variant="danger"
                />
              </View>
            )}
          >
            <AppCard>
              <View style={styles.cardTopRow}>
                <View style={styles.cardBody}>
                  <Text style={styles.rowTitle}>{routine.name}</Text>
                  <Text style={styles.rowMeta}>
                    {routine.daysPerWeek} days/week • {routine.sessions.length} sessions
                  </Text>
                </View>
                {routine.isActive ? <AppChip label="Active" variant="success" /> : null}
              </View>

              <View style={styles.actionRow}>
                <AppButton
                  label="Edit"
                  onPress={() => {
                    router.push({ pathname: "/(workout)/routine-editor", params: { routineId: String(routine._id) } });
                  }}
                  size="sm"
                  variant="secondary"
                />
                {routine.isActive ? (
                  <AppButton
                    label="Deactivate"
                    onPress={() => {
                      toggleActive({ routineId: routine._id, isActive: false }).catch(() => {
                        Alert.alert("Failed", "Could not deactivate routine.");
                      });
                    }}
                    size="sm"
                    variant="ghost"
                  />
                ) : (
                  <AppButton
                    label="Activate"
                    onPress={() => {
                      setActive({ routineId: routine._id }).catch(() => {
                        Alert.alert("Failed", "Could not activate routine.");
                      });
                    }}
                    size="sm"
                  />
                )}
                <AppButton
                  label="Delete"
                  onPress={() => {
                    handleDeleteRoutine(String(routine._id), routine.name);
                  }}
                  size="sm"
                  variant="danger"
                />
              </View>
            </AppCard>
          </ReanimatedSwipeable>
        </Animated.View>
      ))}
    </WorkoutPage>
  );
}
