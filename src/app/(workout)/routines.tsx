import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingRoutine, setIsDeletingRoutine] = useState(false);

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

  function openDeleteRoutineModal(routineId: string, routineName: string) {
    if (isDeletingRoutine) {
      return;
    }

    setDeleteTarget({ id: routineId, name: routineName });
  }

  function closeDeleteRoutineModal() {
    if (isDeletingRoutine) {
      return;
    }

    setDeleteTarget(null);
  }

  async function confirmDeleteRoutine() {
    if (!deleteTarget || isDeletingRoutine) {
      return;
    }

    setIsDeletingRoutine(true);

    try {
      await deleteRoutine({ routineId: deleteTarget.id as never });
      setDeleteTarget(null);
    } catch {
      Alert.alert("Failed", "Could not delete routine.");
    } finally {
      setIsDeletingRoutine(false);
    }
  }

  if (routinesData === undefined || exercisesData === undefined) {
    return (
      <WorkoutPage headerChip={{ icon: "barbell-outline", label: "Routines" }}>
        <AppCard variant="muted">
          <Text style={styles.helper}>Syncing routines and exercise library...</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      headerChip={{ icon: "barbell-outline", label: "Routines" }}
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Create routine"
          iconName="add"
          label="Add routine"
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

      <SectionHeader title="All routines" />

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
                  accessibilityLabel={`Delete ${routine.name}`}
                  icon={<Ionicons color={theme.colors.error} name="trash-outline" size={16} />}
                  onPress={() => {
                    openDeleteRoutineModal(String(routine._id), routine.name);
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
                  accessibilityLabel={`Edit ${routine.name}`}
                  icon={<Ionicons color={theme.colors.text} name="create-outline" size={16} />}
                  onPress={() => {
                    router.push({ pathname: "/(workout)/routine-editor", params: { routineId: String(routine._id) } });
                  }}
                  size="sm"
                  variant="secondary"
                />
                {routine.isActive ? (
                  <AppButton
                    accessibilityLabel={`Deactivate ${routine.name}`}
                    icon={<Ionicons color={theme.colors.text} name="pause-circle-outline" size={16} />}
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
                    accessibilityLabel={`Activate ${routine.name}`}
                    icon={<Ionicons color={theme.colors.onPrimary} name="checkmark-circle-outline" size={16} />}
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
                  accessibilityLabel={`Delete ${routine.name}`}
                  icon={<Ionicons color={theme.colors.error} name="trash-outline" size={16} />}
                  onPress={() => {
                    openDeleteRoutineModal(String(routine._id), routine.name);
                  }}
                  size="sm"
                  variant="danger"
                />
              </View>
            </AppCard>
          </ReanimatedSwipeable>
        </Animated.View>
      ))}

      <ConfirmActionModal
        visible={Boolean(deleteTarget)}
        title="Delete routine"
        message={deleteTarget ? `Delete "${deleteTarget.name}"?` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        closeOnBackdropPress
        isSubmitting={isDeletingRoutine}
        onConfirm={confirmDeleteRoutine}
        onCancel={closeDeleteRoutineModal}
      />
    </WorkoutPage>
  );
}
