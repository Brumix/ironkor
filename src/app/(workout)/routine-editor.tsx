import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import WorkoutPage from "@/components/workout/WorkoutPage";
import { useTheme } from "@/theme";

import { api } from "@convex/_generated/api";

import type { Id } from "@convex/_generated/dataModel";

interface PlannerEntry {
  day: number;
  type: "train" | "rest";
  assignmentMode: "auto" | "manual";
  manualSessionId?: Id<"routineSessions">;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function sortPlanner(entries: PlannerEntry[]) {
  return [...entries].sort((a, b) => a.day - b.day);
}

function defaultPlanner(daysPerWeek = 4): PlannerEntry[] {
  const map: Record<number, number[]> = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 5],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  const clamped = Math.max(1, Math.min(7, Math.floor(daysPerWeek)));
  const trainingDays = new Set(map[clamped] ?? map[4]);

  return DAYS.map((_, day) => ({
    day,
    type: trainingDays.has(day) ? "train" : "rest",
    assignmentMode: "auto",
  }));
}

export default function RoutineEditorScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ routineId?: string }>();

  const routinesData = useQuery(api.routines.listDetailed);

  const createRoutine = useMutation(api.routines.create);
  const updateRoutine = useMutation(api.routines.update);
  const upsertSession = useMutation(api.routines.upsertSession);
  const deleteSession = useMutation(api.routines.deleteSession);
  const reorderSessions = useMutation(api.routines.reorderSessions);
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
  const [plannerDraft, setPlannerDraft] = useState<PlannerEntry[]>(defaultPlanner(4));

  useEffect(() => {
    if (routinesData === undefined) {
      return;
    }

    if (isNew) {
      if (hydratedFor !== "new") {
        setRoutineName("");
        setPlannerDraft(defaultPlanner(4));
        setHydratedFor("new");
      }
      return;
    }

    if (!selectedRoutine) {
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
          assignmentMode: entry.assignmentMode,
          ...(entry.manualSessionId !== undefined && { manualSessionId: entry.manualSessionId }),
        })),
      ),
    );
    setHydratedFor(currentId);
  }, [hydratedFor, isNew, routinesData, selectedRoutine]);

  function navigateToRoutines() {
    router.replace("/(workout)/routines");
  }

  function handleBackPress() {
    navigateToRoutines();
  }

  async function handleSaveRoutine() {
    const name = routineName.trim() || "Untitled routine";
    const trainingDays = plannerDraft.filter((entry) => entry.type === "train").length;

    if (selectedRoutine) {
      await updateRoutine({
        routineId: selectedRoutine._id,
        name,
      });

      await updateWeeklyPlan({
        routineId: selectedRoutine._id,
        weeklyPlan: sortPlanner(plannerDraft).map((entry) => ({
          day: entry.day,
          type: entry.type,
          assignmentMode: entry.assignmentMode,
          ...(entry.manualSessionId !== undefined && { manualSessionId: entry.manualSessionId }),
        })),
      });
    } else {
      const routineId = await createRoutine({
        name,
        daysPerWeek: Math.max(1, trainingDays),
      });

      await updateWeeklyPlan({
        routineId,
        weeklyPlan: sortPlanner(plannerDraft).map((entry) => ({
          day: entry.day,
          type: entry.type,
          assignmentMode: entry.assignmentMode,
          ...(entry.manualSessionId !== undefined && { manualSessionId: entry.manualSessionId }),
        })),
      });
    }

    navigateToRoutines();
  }

  async function moveSession(sessionId: Id<"routineSessions">, direction: -1 | 1) {
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

  function toggleDayType(day: number) {
    setPlannerDraft((current) =>
      sortPlanner(
        current.map((entry) => {
          if (entry.day !== day) {
            return entry;
          }

          if (entry.type === "train") {
            return { day, type: "rest" as const, assignmentMode: "auto" as const };
          }

          return { day, type: "train" as const, assignmentMode: "auto" as const };
        }),
      ),
    );
  }

  function toggleAssignmentMode(day: number) {
    if (!selectedRoutine || selectedRoutine.sessions.length === 0) {
      return;
    }

    const defaultSectionId = selectedRoutine.sessions[0]?._id;
    if (!defaultSectionId) {
      return;
    }

    setPlannerDraft((current) =>
      sortPlanner(
        current.map((entry) => {
          if (entry.day !== day || entry.type === "rest") {
            return entry;
          }

          if (entry.assignmentMode === "auto") {
            return {
              ...entry,
              assignmentMode: "manual" as const,
              manualSessionId: entry.manualSessionId ?? defaultSectionId,
            };
          }

          return {
            day: entry.day,
            type: entry.type,
            assignmentMode: "auto" as const,
          };
        }),
      ),
    );
  }

  function setManualSection(day: number, sectionId: Id<"routineSessions">) {
    setPlannerDraft((current) =>
      sortPlanner(
        current.map((entry) => {
          if (entry.day !== day || entry.type === "rest") {
            return entry;
          }

          return {
            ...entry,
            assignmentMode: "manual" as const,
            manualSessionId: sectionId,
          };
        }),
      ),
    );
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backButton: {
          alignSelf: "flex-start",
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.tokens.spacing.md,
          paddingVertical: theme.tokens.spacing.sm,
        },
        backButtonText: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
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
        subHeaderRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
          marginTop: theme.tokens.spacing.sm,
        },
        subHeader: {
          color: theme.colors.text,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          fontSize: theme.tokens.typography.fontSize.md,
        },
        addRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.xs + 2,
        },
        sessionNameInput: {
          minWidth: 120,
          maxWidth: 156,
          paddingVertical: theme.tokens.spacing.sm - 1,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
        sessionRow: {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.tokens.spacing.sm + 2,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
        },
        flexOne: {
          flex: 1,
        },
        sessionName: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.md,
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
        },
        smallBtn: {
          backgroundColor: theme.colors.secondarySoft,
          borderRadius: theme.tokens.radius.xs,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xs + 2,
        },
        smallBtnText: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        smallDangerBtn: {
          backgroundColor: theme.colors.errorSoft,
          borderColor: theme.colors.error,
        },
        plannerDaysGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.sm,
        },
        dayChip: {
          width: "31%",
          minWidth: 92,
          borderRadius: theme.tokens.radius.sm,
          paddingVertical: theme.tokens.spacing.sm + 2,
          paddingHorizontal: theme.tokens.spacing.sm,
          alignItems: "center",
          gap: theme.tokens.spacing.xxs + 1,
          borderWidth: 1,
        },
        dayChipTrain: {
          backgroundColor: theme.colors.secondarySoft,
          borderColor: theme.colors.secondary,
        },
        dayChipRest: {
          backgroundColor: theme.colors.errorSoft,
          borderColor: theme.colors.error,
        },
        dayChipLabel: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        dayChipState: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
        },
        helperText: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        plannerRow: {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.tokens.spacing.sm + 2,
          gap: theme.tokens.spacing.sm,
        },
        plannerRowHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.tokens.spacing.sm,
        },
        plannerRowTitle: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        plannerModeButton: {
          backgroundColor: theme.colors.secondarySoft,
          borderRadius: theme.tokens.radius.xs,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xs + 2,
        },
        plannerModeButtonActive: {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
        },
        plannerModeButtonText: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        plannerModeButtonTextActive: {
          color: theme.colors.onPrimary,
        },
        plannerSectionRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.xs,
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
        primaryButton: {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.tokens.radius.sm,
          paddingHorizontal: theme.tokens.spacing.md,
          paddingVertical: theme.tokens.spacing.sm,
          alignSelf: "flex-start",
          borderWidth: 1,
          borderColor: theme.colors.primary,
        },
        primaryButtonText: {
          color: theme.colors.onPrimary,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
      }),
    [theme],
  );

  if (routinesData === undefined) {
    return (
      <WorkoutPage headerChip={{ icon: "create-outline", label: "Edit" }}>
        <View style={styles.card}><Text style={styles.cardTitle}>Syncing...</Text></View>
      </WorkoutPage>
    );
  }

  if (!isNew && !selectedRoutine) {
    return (
      <WorkoutPage headerChip={{ icon: "create-outline", label: "Edit" }}>
        <Pressable style={styles.primaryButton} onPress={handleBackPress}>
          <Text style={styles.primaryButtonText}>Back</Text>
        </Pressable>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      headerChip={{
        icon: selectedRoutine ? "create-outline" : "add-circle-outline",
        label: selectedRoutine ? "Edit" : "Create",
      }}
    >
      <Pressable style={styles.backButton} onPress={handleBackPress}>
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>

      <Text style={styles.fieldLabel}>Routine name</Text>
      <TextInput
        style={styles.input}
        value={routineName}
        onChangeText={setRoutineName}
        placeholder="Push / Pull / Legs"
        placeholderTextColor={theme.colors.textSubtle}
      />

      {selectedRoutine ? (
        <>
          <View style={styles.subHeaderRow}>
            <Text style={styles.subHeader}>Sections</Text>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, styles.sessionNameInput]}
                value={newSessionName}
                onChangeText={setNewSessionName}
                placeholder="New section"
                placeholderTextColor={theme.colors.textSubtle}
              />
              <Pressable
                style={styles.primaryButton}
                onPress={async () => {
                  const name = newSessionName.trim();
                  if (!name) {
                    return;
                  }

                  await upsertSession({
                    routineId: selectedRoutine._id,
                    name,
                  });
                  setNewSessionName("");
                }}
              >
                <Text style={styles.primaryButtonText}>Add</Text>
              </Pressable>
            </View>
          </View>

          {[...selectedRoutine.sessions].sort((a, b) => a.order - b.order).map((session) => (
            <Animated.View key={String(session._id)} layout={LinearTransition.springify()} style={styles.sessionRow}>
              <View style={styles.flexOne}>
                <Text style={styles.sessionName}>{session.name}</Text>
                <Text style={styles.sessionMeta}>{session.exercises.length} exercises</Text>
              </View>

              <View style={styles.sessionActions}>
                <Pressable style={styles.smallBtn} onPress={() => { void moveSession(session._id, -1); }}>
                  <Text style={styles.smallBtnText}>↑</Text>
                </Pressable>
                <Pressable style={styles.smallBtn} onPress={() => { void moveSession(session._id, 1); }}>
                  <Text style={styles.smallBtnText}>↓</Text>
                </Pressable>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => {
                    router.push({
                      pathname: "/(workout)/session-editor",
                      params: {
                        routineId: String(selectedRoutine._id),
                        sessionId: String(session._id),
                      },
                    });
                  }}
                >
                  <Text style={styles.smallBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, styles.smallDangerBtn]}
                  onPress={() => {
                    deleteSession({
                      routineId: selectedRoutine._id,
                      sessionId: session._id,
                    }).catch(() => {
                      Alert.alert("Failed", "Could not delete session.");
                    });
                  }}
                >
                  <Text style={styles.smallBtnText}>Del</Text>
                </Pressable>
              </View>
            </Animated.View>
          ))}
        </>
      ) : (
        <Text style={styles.helperText}>Save the routine first, then add sections and exercises.</Text>
      )}

      <Text style={[styles.subHeader, { marginTop: 14 }]}>Weekly planner</Text>
      <Text style={styles.helperText}>Tap days to mark them as rest days. Training days can stay on auto rotation or be manually assigned to a section.</Text>
      <View style={styles.plannerDaysGrid}>
        {sortPlanner(plannerDraft).map((entry) => (
          <Pressable
            key={entry.day}
            onPress={() => { toggleDayType(entry.day); }}
            style={[styles.dayChip, entry.type === "rest" ? styles.dayChipRest : styles.dayChipTrain]}
          >
            <Text style={styles.dayChipLabel}>{DAYS[entry.day]}</Text>
            <Text style={styles.dayChipState}>{entry.type === "rest" ? "Rest" : "Train"}</Text>
          </Pressable>
        ))}
      </View>

      {plannerDraft.some((entry) => entry.type === "train") ? (
        <View style={{ gap: theme.tokens.spacing.sm }}>
          {sortPlanner(plannerDraft)
            .filter((entry) => entry.type === "train")
            .map((entry) => (
              <View key={`planner-${entry.day}`} style={styles.plannerRow}>
                <View style={styles.plannerRowHeader}>
                  <View style={styles.flexOne}>
                    <Text style={styles.plannerRowTitle}>{DAYS[entry.day]}</Text>
                    <Text style={styles.sessionMeta}>
                      {entry.assignmentMode === "manual" ? "Manual section assignment" : "Auto rotation"}
                    </Text>
                  </View>

                  <Pressable
                    disabled={!selectedRoutine || selectedRoutine.sessions.length === 0}
                    onPress={() => {
                      toggleAssignmentMode(entry.day);
                    }}
                    style={[
                      styles.plannerModeButton,
                      entry.assignmentMode === "manual" && styles.plannerModeButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.plannerModeButtonText,
                        entry.assignmentMode === "manual" && styles.plannerModeButtonTextActive,
                      ]}
                    >
                      {entry.assignmentMode === "manual" ? "Manual" : "Auto"}
                    </Text>
                  </Pressable>
                </View>

                {entry.assignmentMode === "manual" ? (
                  selectedRoutine && selectedRoutine.sessions.length > 0 ? (
                    <View style={styles.plannerSectionRow}>
                      {selectedRoutine.sessions
                        .slice()
                        .sort((a, b) => a.order - b.order)
                        .map((session) => (
                          <Pressable
                            key={`manual-${entry.day}-${String(session._id)}`}
                            onPress={() => {
                              setManualSection(entry.day, session._id);
                            }}
                            style={[
                              styles.smallBtn,
                              entry.manualSessionId === session._id && styles.plannerModeButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.smallBtnText,
                                entry.manualSessionId === session._id && styles.plannerModeButtonTextActive,
                              ]}
                            >
                              {session.name}
                            </Text>
                          </Pressable>
                        ))}
                    </View>
                  ) : (
                    <Text style={styles.helperText}>Add sections to unlock manual day assignment.</Text>
                  )
                ) : null}
              </View>
            ))}
        </View>
      ) : null}

      <Pressable style={styles.saveButton} onPress={() => { void handleSaveRoutine(); }}>
        <Text style={styles.saveButtonText}>{selectedRoutine ? "Save changes" : "Create routine"}</Text>
      </Pressable>
    </WorkoutPage>
  );
}
