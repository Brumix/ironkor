import { api } from "@convex/_generated/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import HeaderBackButton from "@/components/ui/HeaderBackButton";
import InfoPopoverButton from "@/components/ui/InfoPopoverButton";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { useDraftRoutine } from "@/features/workout/DraftRoutineProvider";
import type { DraftWeeklyPlanEntry } from "@/features/workout/types";
import { useTheme } from "@/theme";

import type { Id } from "@convex/_generated/dataModel";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface SessionOption {
  key: string;
  name: string;
  order: number;
  exerciseCount: number;
  persistedId?: Id<"routineSessions">;
}

function sortPlanner(entries: DraftWeeklyPlanEntry[]) {
  return [...entries].sort((a, b) => a.day - b.day);
}

function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

export default function RoutineEditorScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    draft,
    hasChanges,
    ensureDraft,
    clearDraft,
    setRoutineName: setDraftRoutineName,
    setWeeklyPlan,
    addSession,
    moveSession: moveDraftSession,
    removeSession: removeDraftSession,
  } = useDraftRoutine();

  const routinesData = useQuery(api.routines.listDetailed);

  const createRoutine = useMutation(api.routines.create);
  const updateRoutine = useMutation(api.routines.update);
  const upsertSession = useMutation(api.routines.upsertSession);
  const deleteSession = useMutation(api.routines.deleteSession);
  const reorderSessions = useMutation(api.routines.reorderSessions);
  const upsertSessionExercise = useMutation(api.routines.upsertSessionExercise);
  const updateWeeklyPlan = useMutation(api.routines.updateWeeklyPlan);

  const routines = useMemo(() => routinesData ?? [], [routinesData]);

  const routineIdParam = typeof params.routineId === "string" ? params.routineId : "new";
  const isNew = routineIdParam === "new";

  const selectedRoutine = useMemo(
    () => routines.find((routine) => String(routine._id) === routineIdParam) ?? null,
    [routineIdParam, routines],
  );

  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [plannerDraft, setPlannerDraft] = useState<DraftWeeklyPlanEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const resetNewRoutineUi = useCallback(() => {
    setNewSessionName("");
    setShowDiscardModal(false);
    setIsSaving(false);
  }, []);

  const clearNewRoutineDraft = useCallback(() => {
    draftRef.current = null;
    resetNewRoutineUi();
    clearDraft();
  }, [clearDraft, resetNewRoutineUi]);

  useFocusEffect(
    useCallback(() => {
      if (isNew && !draftRef.current) {
        resetNewRoutineUi();
        ensureDraft();
      }
    }, [ensureDraft, isNew, resetNewRoutineUi]),
  );

  useEffect(() => {
    if (routinesData === undefined || isNew || !selectedRoutine) {
      return;
    }

    const currentId = String(selectedRoutine._id);
    if (hydratedFor === currentId) {
      return;
    }

    setRoutineName(selectedRoutine.name);
    setPlannerDraft(
      sortPlanner(
        selectedRoutine.weeklyPlan.map((entry) => ({
          day: entry.day,
          type: entry.type,
        })),
      ),
    );
    setHydratedFor(currentId);
  }, [hydratedFor, isNew, routinesData, selectedRoutine]);

  const sessionOptions = useMemo<SessionOption[]>(
    () =>
      isNew
        ? sortByOrder(draft?.sessions ?? []).map((session) => ({
            key: session.key,
            name: session.name,
            order: session.order,
            exerciseCount: session.exercises.length,
          }))
        : sortByOrder(selectedRoutine?.sessions ?? []).map((session) => ({
            key: String(session._id),
            name: session.name,
            order: session.order,
            exerciseCount: session.exercises.length,
            persistedId: session._id,
          })),
    [draft?.sessions, isNew, selectedRoutine?.sessions],
  );

  const routineNameValue = isNew ? draft?.name ?? "" : routineName;
  const plannerEntries = isNew ? sortPlanner(draft?.weeklyPlan ?? []) : sortPlanner(plannerDraft);

  function navigateToRoutines() {
    router.replace("/(workout)/routines");
  }

  function updatePlannerEntries(updater: (current: DraftWeeklyPlanEntry[]) => DraftWeeklyPlanEntry[]) {
    if (isNew) {
      setWeeklyPlan(updater);
      return;
    }

    setPlannerDraft((current) => sortPlanner(updater(current)));
  }

  function handleBackPress() {
    if (isNew) {
      if (hasChanges) {
        setShowDiscardModal(true);
        return;
      }

      clearNewRoutineDraft();
    }

    navigateToRoutines();
  }

  function confirmDiscardDraft() {
    clearNewRoutineDraft();
    setShowDiscardModal(false);
    navigateToRoutines();
  }

  function buildWeeklyPlanPayload() {
    return plannerEntries.map((entry) => ({
      day: entry.day,
      type: entry.type,
      assignmentMode: "auto" as const,
    }));
  }

  async function handleSaveRoutine() {
    if (isSaving) {
      return;
    }

    const name = routineNameValue.trim() || "Untitled routine";
    const trainingDays = plannerEntries.filter((entry) => entry.type === "train").length;

    setIsSaving(true);

    try {
      if (selectedRoutine) {
        await updateRoutine({
          routineId: selectedRoutine._id,
          name,
        });

        await updateWeeklyPlan({
          routineId: selectedRoutine._id,
          weeklyPlan: buildWeeklyPlanPayload(),
        });
      } else if (draft) {
        const routineId = await createRoutine({
          name,
          daysPerWeek: Math.max(1, trainingDays),
        });

        for (const session of sortByOrder(draft.sessions)) {
          const sessionId = await upsertSession({
            routineId,
            name: session.name,
          });

          for (const exercise of sortByOrder(session.exercises)) {
            await upsertSessionExercise({
              sessionId,
              exerciseId: exercise.exerciseId,
              sets: exercise.sets,
              repsText: exercise.repsText,
              targetWeightKg: exercise.targetWeightKg,
              restSeconds: exercise.restSeconds,
              notes: exercise.notes,
              tempo: exercise.tempo,
              rir: exercise.rir,
            });
          }
        }

        await updateWeeklyPlan({
          routineId,
          weeklyPlan: buildWeeklyPlanPayload(),
        });

        clearNewRoutineDraft();
      }

      navigateToRoutines();
    } catch {
      Alert.alert("Failed", selectedRoutine ? "Could not save routine changes." : "Could not create routine.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddSession() {
    const name = newSessionName.trim();
    if (!name) {
      return;
    }

    if (isNew) {
      addSession(name);
      setNewSessionName("");
      return;
    }

    if (!selectedRoutine) {
      return;
    }

    try {
      await upsertSession({
        routineId: selectedRoutine._id,
        name,
      });
      setNewSessionName("");
    } catch {
      Alert.alert("Failed", "Could not add section.");
    }
  }

  async function movePersistedSession(sessionId: Id<"routineSessions">, direction: -1 | 1) {
    if (!selectedRoutine) {
      return;
    }

    const sorted = [...selectedRoutine.sessions].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((session) => session._id === sessionId);
    if (index < 0) {
      return;
    }

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) {
      return;
    }

    const reordered = [...sorted];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    await reorderSessions({
      routineId: selectedRoutine._id,
      orderedSessionIds: reordered.map((session) => session._id),
    });
  }

  function handleMoveSession(session: SessionOption, direction: -1 | 1) {
    if (session.persistedId) {
      void movePersistedSession(session.persistedId, direction);
      return;
    }

    moveDraftSession(session.key, direction);
  }

  function handleDeleteSession(session: SessionOption) {
    if (session.persistedId && selectedRoutine) {
      deleteSession({
        routineId: selectedRoutine._id,
        sessionId: session.persistedId,
      }).catch(() => {
        Alert.alert("Failed", "Could not delete session.");
      });
      return;
    }

    removeDraftSession(session.key);
  }

  function openSessionEditor(session: SessionOption) {
    if (session.persistedId && selectedRoutine) {
      router.push({
        pathname: "/(workout)/session-editor",
        params: {
          routineId: String(selectedRoutine._id),
          sessionId: String(session.persistedId),
        },
      });
      return;
    }

    router.push({
      pathname: "/(workout)/session-editor",
      params: {
        routineId: "new",
        draftSessionKey: session.key,
      },
    });
  }

  function cycleDayType(day: number) {
    updatePlannerEntries((current) =>
      current.map((entry) =>
        entry.day === day
          ? {
              day,
              type: entry.type === "train" ? "rest" : "train",
            }
          : entry,
      ),
    );
  }

  function resolvePlannerSummary(entry: DraftWeeklyPlanEntry) {
    return entry.type === "train" ? "Training day" : "Rest and recovery";
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.tokens.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.tokens.spacing.md,
          gap: theme.tokens.spacing.sm,
        },
        cardTitle: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.xl,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        fieldLabel: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          textTransform: "uppercase",
          letterSpacing: 0.7,
          marginTop: theme.tokens.spacing.xs + 2,
        },
        input: {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          color: theme.colors.text,
          paddingHorizontal: theme.tokens.spacing.md,
          paddingVertical: theme.tokens.spacing.sm + 2,
          fontSize: theme.tokens.typography.fontSize.md,
        },
        subHeaderAction: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
        },
        addRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.xs + 2,
        },
        sectionNameInput: {
          minWidth: 120,
          maxWidth: 156,
          paddingVertical: theme.tokens.spacing.sm - 1,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
        sessionRow: {
          gap: theme.tokens.spacing.md,
        },
        sessionHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: theme.tokens.spacing.sm,
        },
        sessionName: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.lg,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        sessionMeta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
        sessionActions: {
          flexDirection: "row",
          gap: theme.tokens.spacing.xs + 1,
          alignItems: "center",
          flexWrap: "wrap",
        },
        emptyState: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        plannerGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.sm,
        },
        plannerDayCard: {
          width: "31%",
          minWidth: 92,
          borderRadius: theme.tokens.radius.md,
          borderWidth: 1,
          paddingVertical: theme.tokens.spacing.md,
          paddingHorizontal: theme.tokens.spacing.sm,
          gap: theme.tokens.spacing.xxs,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceAlt,
        },
        plannerDayCardTrain: {
          backgroundColor: theme.colors.accentSoft,
          borderColor: theme.colors.borderAccent,
        },
        plannerDayCardRest: {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
        plannerDayLabel: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        plannerDayState: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
          textTransform: "uppercase",
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
        },
        saveButton: {
          marginTop: theme.tokens.spacing.sm,
          backgroundColor: theme.colors.primary,
          borderRadius: theme.tokens.radius.md,
          paddingVertical: theme.tokens.spacing.md,
          alignItems: "center",
          borderWidth: 1,
          borderColor: theme.colors.primary,
        },
        saveButtonText: {
          color: theme.colors.onPrimary,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.black,
        },
      }),
    [theme],
  );

  if (routinesData === undefined || (isNew && !draft)) {
    return (
      <WorkoutPage
        headerAction={<HeaderBackButton onPress={handleBackPress} />}
        headerActionPosition="left"
        headerChip={{ icon: "create-outline", label: "Edit" }}
        title={null}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Syncing...</Text>
        </View>
      </WorkoutPage>
    );
  }

  if (!isNew && !selectedRoutine) {
    return (
      <WorkoutPage
        headerAction={<HeaderBackButton onPress={handleBackPress} />}
        headerActionPosition="left"
        headerChip={{ icon: "create-outline", label: "Edit" }}
        title={null}
      >
        <View />
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      headerAction={<HeaderBackButton onPress={handleBackPress} />}
      headerActionPosition="left"
      headerChip={{
        icon: selectedRoutine ? "create-outline" : "add-circle-outline",
        label: selectedRoutine ? "Edit" : "Create",
      }}
      title={null}
    >
      <Text style={styles.fieldLabel}>Routine name</Text>
      <TextInput
        style={styles.input}
        value={routineNameValue}
        onChangeText={(value) => {
          if (isNew) {
            setDraftRoutineName(value);
            return;
          }

          setRoutineName(value);
        }}
        placeholder="Push / Pull / Legs"
        placeholderTextColor={theme.colors.textSubtle}
      />

      <SectionHeader
        title="Sections"
        action={
          <View style={styles.subHeaderAction}>
            <InfoPopoverButton
              accessibilityLabel="Show sections help"
              title="Sections"
              message="Add, reorder, or remove sections here. Open a section to adjust exercises."
            />
          </View>
        }
      />

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, styles.sectionNameInput]}
          value={newSessionName}
          onChangeText={setNewSessionName}
          placeholder="New section"
          placeholderTextColor={theme.colors.textSubtle}
        />
        <AppButton
          accessibilityLabel="Add section"
          label="Add"
          onPress={() => {
            void handleAddSession();
          }}
          size="sm"
        />
      </View>

      {sessionOptions.length > 0 ? (
        sessionOptions.map((session) => (
          <Animated.View key={session.key} layout={LinearTransition.springify()}>
            <AppCard style={styles.sessionRow} variant={session.persistedId ? "default" : "highlight"}>
              <View style={styles.sessionHeader}>
                <View style={{ flex: 1, gap: theme.tokens.spacing.xxs }}>
                  <Text style={styles.sessionName}>{session.name}</Text>
                  <Text style={styles.sessionMeta}>
                    {session.exerciseCount} {session.exerciseCount === 1 ? "exercise" : "exercises"}
                  </Text>
                </View>
                <Ionicons color={theme.colors.accent} name="barbell-outline" size={18} />
              </View>

              <View style={styles.sessionActions}>
                <AppButton
                  accessibilityLabel={`Open ${session.name}`}
                  label="Edit"
                  onPress={() => {
                    openSessionEditor(session);
                  }}
                  size="sm"
                  variant="secondary"
                />
                <AppButton
                  accessibilityLabel={`Move ${session.name} up`}
                  label="Up"
                  onPress={() => {
                    handleMoveSession(session, -1);
                  }}
                  size="sm"
                  variant="ghost"
                />
                <AppButton
                  accessibilityLabel={`Move ${session.name} down`}
                  label="Down"
                  onPress={() => {
                    handleMoveSession(session, 1);
                  }}
                  size="sm"
                  variant="ghost"
                />
                <AppButton
                  accessibilityLabel={`Delete ${session.name}`}
                  label="Delete"
                  onPress={() => {
                    handleDeleteSession(session);
                  }}
                  size="sm"
                  variant="danger"
                />
              </View>
            </AppCard>
          </Animated.View>
        ))
      ) : (
        <Text style={styles.emptyState}>No sections yet. Add the split you want before saving.</Text>
      )}

      <SectionHeader
        title="Weekly planner"
        action={
          <InfoPopoverButton
            accessibilityLabel="Show weekly planner help"
            title="Weekly planner"
            message="Tap a day to switch it between training and rest. Training days rotate through your routine sections automatically."
          />
        }
      />

      <View style={styles.plannerGrid}>
        {plannerEntries.map((entry) => (
          <Pressable
            key={`planner-${entry.day}`}
            onPress={() => {
              cycleDayType(entry.day);
            }}
            style={[
              styles.plannerDayCard,
              entry.type === "train" ? styles.plannerDayCardTrain : styles.plannerDayCardRest,
            ]}
          >
            <Text style={styles.plannerDayLabel}>{DAYS[entry.day]}</Text>
            <Text style={styles.plannerDayState}>{resolvePlannerSummary(entry)}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
        onPress={() => {
          void handleSaveRoutine();
        }}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? "Saving..." : selectedRoutine ? "Save changes" : "Save routine"}
        </Text>
      </Pressable>

      <ConfirmActionModal
        visible={showDiscardModal}
        title="Discard Draft"
        message="Leave this routine and lose the sections, exercises, and planner changes you have not saved yet?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        confirmVariant="danger"
        onConfirm={confirmDiscardDraft}
        onCancel={() => {
          setShowDiscardModal(false);
        }}
      />
    </WorkoutPage>
  );
}
