import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import WorkoutPage from "@/components/workout/WorkoutPage";

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
  const router = useRouter();
  const params = useLocalSearchParams<{ routineId?: string }>();

  const routinesData = useQuery(api.routines.listDetailed);
  const exercisesData = useQuery(api.exercises.list);

  const createRoutine = useMutation(api.routines.create);
  const updateRoutine = useMutation(api.routines.update);
  const upsertSession = useMutation(api.routines.upsertSession);
  const deleteSession = useMutation(api.routines.deleteSession);
  const reorderSessions = useMutation(api.routines.reorderSessions);
  const upsertSessionExercise = useMutation(api.routines.upsertSessionExercise);
  const deleteSessionExercise = useMutation(api.routines.deleteSessionExercise);
  const reorderSessionExercises = useMutation(api.routines.reorderSessionExercises);
  const updateWeeklyPlan = useMutation(api.routines.updateWeeklyPlan);
  const createCustomExercise = useMutation(api.exercises.createCustom);

  const routines = useMemo(() => routinesData ?? [], [routinesData]);
  const exercises = useMemo(() => exercisesData ?? [], [exercisesData]);

  const routineIdParam = typeof params.routineId === "string" ? params.routineId : "new";
  const isNew = routineIdParam === "new";

  const selectedRoutine = useMemo(
    () => routines.find((routine) => String(routine._id) === routineIdParam) ?? null,
    [routineIdParam, routines],
  );

  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const [routineName, setRoutineName] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [plannerDraft, setPlannerDraft] = useState<PlannerEntry[]>(defaultPlanner(4));

  const [sessionEditorVisible, setSessionEditorVisible] = useState(false);
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [customExerciseVisible, setCustomExerciseVisible] = useState(false);
  const [replaceSessionExerciseId, setReplaceSessionExerciseId] = useState<string | null>(null);
  const [sessionDraftName, setSessionDraftName] = useState("");

  const [customName, setCustomName] = useState("");
  const [customVariant, setCustomVariant] = useState("Bodyweight");
  const [customSets, setCustomSets] = useState("3");
  const [customReps, setCustomReps] = useState("8-12");
  const [customRest, setCustomRest] = useState("90");
  const [customPrimary, setCustomPrimary] = useState("Chest");
  const [customSecondary, setCustomSecondary] = useState("Triceps");

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
          assignmentMode: entry.assignmentMode ?? "auto",
          ...(entry.manualSessionId != null && { manualSessionId: entry.manualSessionId }),
        })),
      ),
    );
    setHydratedFor(currentId);
  }, [hydratedFor, isNew, routinesData, selectedRoutine]);

  const selectedSession = useMemo(() => {
    if (!selectedRoutine || !selectedSessionId) {
      return null;
    }

    return selectedRoutine.sessions.find((session) => String(session._id) === selectedSessionId) ?? null;
  }, [selectedRoutine, selectedSessionId]);

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
          ...(entry.manualSessionId != null && { manualSessionId: entry.manualSessionId }),
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
          ...(entry.manualSessionId != null && { manualSessionId: entry.manualSessionId }),
        })),
      });
    }

    router.back();
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

  async function moveSessionExercise(sessionExerciseId: Id<"sessionExercises">, direction: -1 | 1) {
    if (!selectedSession) {
      return;
    }

    const sorted = [...selectedSession.exercises].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((entry) => entry._id === sessionExerciseId);
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

    await reorderSessionExercises({
      sessionId: selectedSession._id,
      orderedSessionExerciseIds: reordered.map((entry) => entry._id),
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

  if (routinesData === undefined || exercisesData === undefined) {
    return (
      <WorkoutPage title="Routine Editor" subtitle="Loading routine...">
        <View style={styles.card}><Text style={styles.cardTitle}>Syncing...</Text></View>
      </WorkoutPage>
    );
  }

  if (!isNew && !selectedRoutine) {
    return (
      <WorkoutPage title="Routine Editor" subtitle="Routine not found.">
        <Pressable style={styles.primaryButton} onPress={() => { router.back(); }}>
          <Text style={styles.primaryButtonText}>Back</Text>
        </Pressable>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      title={selectedRoutine ? `Edit ${selectedRoutine.name}` : "Create Routine"}
      subtitle="Manage sessions, exercises, and weekly plan."
    >
      <Pressable style={styles.backButton} onPress={() => { router.back(); }}>
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>

      <Text style={styles.fieldLabel}>Routine name</Text>
      <TextInput
        style={styles.input}
        value={routineName}
        onChangeText={setRoutineName}
        placeholder="Push / Pull / Legs"
        placeholderTextColor="#77808C"
      />

      {selectedRoutine ? (
        <>
          <View style={styles.subHeaderRow}>
            <Text style={styles.subHeader}>Sessions</Text>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, styles.sessionNameInput]}
                value={newSessionName}
                onChangeText={setNewSessionName}
                placeholder="New session"
                placeholderTextColor="#77808C"
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
                    setSelectedSessionId(String(session._id));
                    setSessionDraftName(session.name);
                    setReplaceSessionExerciseId(null);
                    setSessionEditorVisible(true);
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
        <Text style={styles.helperText}>Save the routine first, then add sessions and exercises.</Text>
      )}

      <Text style={[styles.subHeader, { marginTop: 14 }]}>Weekly planner</Text>
      <Text style={styles.helperText}>Tap days to mark them as rest days.</Text>
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

      <Pressable style={styles.saveButton} onPress={() => { void handleSaveRoutine(); }}>
        <Text style={styles.saveButtonText}>{selectedRoutine ? "Save changes" : "Create routine"}</Text>
      </Pressable>

      <Modal
        visible={sessionEditorVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => { setSessionEditorVisible(false); }}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalRoot}
            behavior={Platform.OS === "ios" ? "padding" : "position"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          >
            <View style={styles.modalCard}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Session editor</Text>
                <Pressable onPress={() => { setSessionEditorVisible(false); }}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>

              {selectedRoutine && selectedSession ? (
                <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
                  <TextInput
                    style={styles.input}
                    value={sessionDraftName}
                    onChangeText={setSessionDraftName}
                    placeholder="Session name"
                    placeholderTextColor="#77808C"
                  />

                  <Pressable
                    style={styles.primaryButton}
                    onPress={async () => {
                      await upsertSession({
                        routineId: selectedRoutine._id,
                        sessionId: selectedSession._id,
                        name: sessionDraftName.trim() || selectedSession.name,
                      });
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Save session name</Text>
                  </Pressable>

                  <View style={styles.subHeaderRow}>
                    <Text style={styles.subHeader}>Exercises</Text>
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => {
                        setReplaceSessionExerciseId(null);
                        setExercisePickerVisible(true);
                      }}
                    >
                      <Text style={styles.primaryButtonText}>Add exercise</Text>
                    </Pressable>
                  </View>

                  {[...selectedSession.exercises].sort((a, b) => a.order - b.order).map((entry) => (
                    <View key={String(entry._id)} style={styles.exerciseRow}>
                      <View style={styles.flexOne}>
                        <Text style={styles.sessionName}>{entry.exercise.name}</Text>
                        <Text style={styles.sessionMeta}>
                          {entry.exercise.setsTarget} sets • {entry.exercise.repsTarget} reps • {entry.exercise.restSeconds}s
                        </Text>
                      </View>

                      <View style={styles.sessionActions}>
                        <Pressable style={styles.smallBtn} onPress={() => { void moveSessionExercise(entry._id, -1); }}>
                          <Text style={styles.smallBtnText}>↑</Text>
                        </Pressable>
                        <Pressable style={styles.smallBtn} onPress={() => { void moveSessionExercise(entry._id, 1); }}>
                          <Text style={styles.smallBtnText}>↓</Text>
                        </Pressable>
                        <Pressable
                          style={styles.smallBtn}
                          onPress={() => {
                            setReplaceSessionExerciseId(String(entry._id));
                            setExercisePickerVisible(true);
                          }}
                        >
                          <Text style={styles.smallBtnText}>Replace</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.smallBtn, styles.smallDangerBtn]}
                          onPress={() => {
                            deleteSessionExercise({
                              sessionId: selectedSession._id,
                              sessionExerciseId: entry._id,
                            }).catch(() => {
                              Alert.alert("Failed", "Could not remove exercise.");
                            });
                          }}
                        >
                          <Text style={styles.smallBtnText}>Del</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={exercisePickerVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          setReplaceSessionExerciseId(null);
          setExercisePickerVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Exercise library</Text>
              <Pressable
                onPress={() => {
                  setReplaceSessionExerciseId(null);
                  setExercisePickerVisible(false);
                }}
              >
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.sheetContent}>
              <Pressable style={styles.primaryButton} onPress={() => { setCustomExerciseVisible(true); }}>
                <Text style={styles.primaryButtonText}>Create custom exercise</Text>
              </Pressable>

              {selectedSession
                ? exercises.map((exercise) => (
                  <Pressable
                    key={String(exercise._id)}
                    style={styles.libraryRow}
                    onPress={async () => {
                      await upsertSessionExercise({
                        sessionId: selectedSession._id,
                        sessionExerciseId: replaceSessionExerciseId
                          ? (replaceSessionExerciseId as Id<"sessionExercises">)
                          : undefined,
                        exerciseId: exercise._id,
                      });
                      setReplaceSessionExerciseId(null);
                      setExercisePickerVisible(false);
                    }}
                  >
                    <Text style={styles.sessionName}>{exercise.name}</Text>
                    <Text style={styles.sessionMeta}>{exercise.variant} • {exercise.setsTarget} x {exercise.repsTarget}</Text>
                  </Pressable>
                ))
                : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={customExerciseVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => { setCustomExerciseVisible(false); }}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalRoot}
            behavior={Platform.OS === "ios" ? "padding" : "position"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          >
            <View style={styles.modalCard}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Custom exercise</Text>
                <Pressable onPress={() => { setCustomExerciseVisible(false); }}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
                <TextInput style={styles.input} value={customName} onChangeText={setCustomName} placeholder="Name" placeholderTextColor="#77808C" />
                <TextInput style={styles.input} value={customVariant} onChangeText={setCustomVariant} placeholder="Variant" placeholderTextColor="#77808C" />
                <TextInput style={styles.input} value={customSets} onChangeText={setCustomSets} keyboardType="number-pad" placeholder="Sets" placeholderTextColor="#77808C" />
                <TextInput style={styles.input} value={customReps} onChangeText={setCustomReps} placeholder="Reps" placeholderTextColor="#77808C" />
                <TextInput style={styles.input} value={customRest} onChangeText={setCustomRest} keyboardType="number-pad" placeholder="Rest seconds" placeholderTextColor="#77808C" />
                <TextInput style={styles.input} value={customPrimary} onChangeText={setCustomPrimary} placeholder="Primary muscles (comma separated)" placeholderTextColor="#77808C" />
                <TextInput style={styles.input} value={customSecondary} onChangeText={setCustomSecondary} placeholder="Secondary muscles (comma separated)" placeholderTextColor="#77808C" />

                <Pressable
                  style={styles.saveButton}
                  onPress={async () => {
                    if (!customName.trim()) {
                      return;
                    }

                    const exerciseId = await createCustomExercise({
                      name: customName.trim(),
                      variant: customVariant.trim() || "Custom",
                      setsTarget: Math.max(1, Number(customSets) || 3),
                      repsTarget: customReps.trim() || "8-12",
                      restSeconds: Math.max(15, Number(customRest) || 90),
                      primaryMuscles: customPrimary
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                      secondaryMuscles: customSecondary
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    });

                    if (selectedSession) {
                      await upsertSessionExercise({
                        sessionId: selectedSession._id,
                        sessionExerciseId: replaceSessionExerciseId
                          ? (replaceSessionExerciseId as Id<"sessionExercises">)
                          : undefined,
                        exerciseId,
                      });
                    }

                    setReplaceSessionExerciseId(null);
                    setCustomExerciseVisible(false);
                    setExercisePickerVisible(false);
                    setCustomName("");
                  }}
                >
                  <Text style={styles.saveButtonText}>Create and add</Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </WorkoutPage>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "#202630",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    color: "#DDE5F2",
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#16181D",
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: "#F4F6F8",
    fontSize: 18,
    fontWeight: "700",
  },
  fieldLabel: {
    color: "#D1D9E6",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#1B212C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2C3342",
    color: "#F6F8FC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  subHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  subHeader: {
    color: "#E8EDF6",
    fontWeight: "700",
    fontSize: 14,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sessionNameInput: {
    minWidth: 120,
    maxWidth: 150,
    paddingVertical: 7,
    fontSize: 12,
  },
  sessionRow: {
    backgroundColor: "#1A212D",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flexOne: {
    flex: 1,
  },
  sessionName: {
    color: "#F2F6FF",
    fontSize: 14,
    fontWeight: "700",
  },
  sessionMeta: {
    color: "#9EAABF",
    fontSize: 12,
  },
  sessionActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  smallBtn: {
    backgroundColor: "#243043",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  smallBtnText: {
    color: "#E9F0FC",
    fontSize: 11,
    fontWeight: "700",
  },
  smallDangerBtn: {
    backgroundColor: "#4A2930",
  },
  plannerDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    width: "31%",
    minWidth: 92,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
  },
  dayChipTrain: {
    backgroundColor: "#1E2A3B",
    borderWidth: 1,
    borderColor: "#2D405B",
  },
  dayChipRest: {
    backgroundColor: "#3A2428",
    borderWidth: 1,
    borderColor: "#5A343A",
  },
  dayChipLabel: {
    color: "#EAF0FB",
    fontSize: 12,
    fontWeight: "700",
  },
  dayChipState: {
    color: "#B8C4D8",
    fontSize: 11,
    fontWeight: "600",
  },
  helperText: {
    color: "#9EA9BB",
    fontSize: 13,
    lineHeight: 19,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#101114",
    fontSize: 14,
    fontWeight: "800",
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
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "stretch",
    paddingHorizontal: 10,
  },
  modalCard: {
    width: "100%",
    maxHeight: "82%",
    backgroundColor: "#0F131A",
    borderRadius: 24,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sheetTitle: {
    color: "#F5F7FB",
    fontSize: 18,
    fontWeight: "800",
  },
  closeText: {
    color: "#AAB4C4",
    fontSize: 13,
    fontWeight: "700",
  },
  sheetContent: {
    paddingBottom: 30,
    gap: 10,
  },
  exerciseRow: {
    backgroundColor: "#1A212D",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  libraryRow: {
    backgroundColor: "#171E28",
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
});
