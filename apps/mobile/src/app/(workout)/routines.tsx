import { api } from "@convex/_generated/api";
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
import GradientCard from "@/components/ui/GradientCard";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { useTheme } from "@/theme";


export default function RoutinesScreen() {
  const { theme } = useTheme();
  const routinesData = useQuery(api.routines.listDetailed);
  const exercisesData = useQuery(api.exercises.list, {});

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
      seedDefaults().catch(() => undefined);
    }
  }, [exercisesData, routinesData, seedDefaults]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        helper: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        heroTitle: {
          color: theme.colors.heroText,
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontSize: theme.tokens.typography.fontSize["4xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        heroBody: {
          color: theme.colors.heroTextMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        heroAction: {
          marginTop: theme.tokens.spacing.xs,
        },
        routineCard: {
          gap: theme.tokens.spacing.md,
        },
        routineHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: theme.tokens.spacing.md,
        },
        routineTitle: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        routineMeta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
        },
        routineMetaRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.xs,
        },
        actionRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.xs,
        },
        sessionPillRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.xs,
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
    if (isDeletingRoutine) return;
    setDeleteTarget({ id: routineId, name: routineName });
  }

  function closeDeleteRoutineModal() {
    if (isDeletingRoutine) return;
    setDeleteTarget(null);
  }

  async function confirmDeleteRoutine() {
    if (!deleteTarget || isDeletingRoutine) return;

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
    <WorkoutPage headerChip={{ icon: "barbell-outline", label: "Routines" }} subtitle={activeRoutine?.name ?? "Routine manager"}>
      <Animated.View entering={FadeInUp.delay(20).springify().damping(18)} layout={LinearTransition.springify()}>
        <GradientCard>
          <AppChip label={activeRoutine ? "Active routine" : "Routine library"} variant="neutral" />
          <Text style={styles.heroTitle}>{activeRoutine?.name ?? "Build your next split"}</Text>
          <Text style={styles.heroBody}>
            {activeRoutine
              ? `${activeRoutine.daysPerWeek} training days each week with ${activeRoutine.sessions.length} sessions ready to go.`
              : "Create multiple routines, activate the one you want, and keep your week structured without friction."}
          </Text>
          <View style={styles.heroAction}>
            <AppButton
              accessibilityLabel="Create a new routine"
              icon={<Ionicons color={theme.colors.text} name="add-circle-outline" size={18} />}
              label="Create routine"
              onPress={() => {
                router.push({ pathname: "/(workout)/routine-editor", params: { routineId: "new" } });
              }}
              size="md"
              variant="secondary"
            />
          </View>
        </GradientCard>
      </Animated.View>

      <SectionHeader
        title="All routines"
        subtitle="Swipe left to delete, or tap actions to edit and activate"
      />

      {routines.map((routine, index) => (
        <Animated.View
          entering={FadeInUp.delay(90 + index * 35).springify().damping(20)}
          key={String(routine._id)}
          layout={LinearTransition.springify().damping(20)}
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
            <AppCard style={styles.routineCard} variant={routine.isActive ? "highlight" : "default"}>
              <View style={styles.routineHeader}>
                <View style={{ flex: 1, gap: theme.tokens.spacing.xs }}>
                  <View style={styles.routineMetaRow}>
                    <AppChip label={routine.isActive ? "Active" : "Inactive"} variant={routine.isActive ? "accent" : "neutral"} />
                    <AppChip label={`${routine.daysPerWeek} days/week`} variant="neutral" />
                  </View>
                  <Text style={styles.routineTitle}>{routine.name}</Text>
                  <Text style={styles.routineMeta}>{routine.sessions.length} sections ready for training</Text>
                </View>
                <Ionicons color={routine.isActive ? theme.colors.accent : theme.colors.textSubtle} name="sparkles-outline" size={18} />
              </View>

              <View style={styles.sessionPillRow}>
                {routine.sessions.slice(0, 3).map((session) => (
                  <AppChip key={String(session._id)} label={session.name} variant={routine.isActive ? "accent" : "neutral"} />
                ))}
                {routine.sessions.length > 3 ? (
                  <AppChip label={`+${routine.sessions.length - 3} more`} variant="neutral" />
                ) : null}
              </View>

              <View style={styles.actionRow}>
                <AppButton
                  accessibilityLabel={`Edit ${routine.name}`}
                  icon={<Ionicons color={theme.colors.text} name="create-outline" size={16} />}
                  label="Edit"
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
                    icon={<Ionicons color={theme.colors.onAccent} name="checkmark-circle-outline" size={16} />}
                    label="Activate"
                    onPress={() => {
                      setActive({ routineId: routine._id }).catch(() => {
                        Alert.alert("Failed", "Could not activate routine.");
                      });
                    }}
                    size="sm"
                    variant="accent"
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
        title="Delete Routine"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"?` : undefined}
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
