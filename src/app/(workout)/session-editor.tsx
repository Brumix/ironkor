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

import WorkoutPage from "@/components/workout/WorkoutPage";
import { useTheme } from "@/theme";

import { api } from "@convex/_generated/api";

import type { Id } from "@convex/_generated/dataModel";

export default function SessionEditorScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ routineId?: string; sessionId?: string }>();

  const routinesData = useQuery(api.routines.listDetailed);
  const exercisesData = useQuery(api.exercises.list);

  const upsertSession = useMutation(api.routines.upsertSession);
  const upsertSessionExercise = useMutation(api.routines.upsertSessionExercise);
  const deleteSessionExercise = useMutation(api.routines.deleteSessionExercise);
  const reorderSessionExercises = useMutation(api.routines.reorderSessionExercises);
  const createCustomExercise = useMutation(api.exercises.createCustom);

  const routines = useMemo(() => routinesData ?? [], [routinesData]);
  const exercises = useMemo(() => exercisesData ?? [], [exercisesData]);
  const routineIdParam = typeof params.routineId === "string" ? params.routineId : "";
  const sessionIdParam = typeof params.sessionId === "string" ? params.sessionId : "";

  const selectedRoutine = useMemo(
    () => routines.find((routine) => String(routine._id) === routineIdParam) ?? null,
    [routineIdParam, routines],
  );
  const selectedSession = useMemo(
    () => selectedRoutine?.sessions.find((session) => String(session._id) === sessionIdParam) ?? null,
    [selectedRoutine, sessionIdParam],
  );

  const [sessionDraftName, setSessionDraftName] = useState("");
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [customExerciseVisible, setCustomExerciseVisible] = useState(false);
  const [replaceSessionExerciseId, setReplaceSessionExerciseId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [customVariant, setCustomVariant] = useState("Bodyweight");
  const [customSets, setCustomSets] = useState("3");
  const [customReps, setCustomReps] = useState("8-12");
  const [customRest, setCustomRest] = useState("90");
  const [customPrimary, setCustomPrimary] = useState("Chest");
  const [customSecondary, setCustomSecondary] = useState("Triceps");

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    setSessionDraftName(selectedSession.name);
  }, [selectedSession]);

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

  function handleBackPress() {
    if (routineIdParam) {
      router.replace({ pathname: "/(workout)/routine-editor", params: { routineId: routineIdParam } });
      return;
    }

    router.replace("/(workout)/routines");
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
        sessionName: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        sessionMeta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
        exerciseRow: {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.tokens.spacing.sm + 2,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
          marginTop: theme.tokens.spacing.sm,
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
        flexOne: {
          flex: 1,
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
        helperText: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        modalRoot: {
          flex: 1,
          justifyContent: "center",
          alignItems: "stretch",
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: theme.colors.overlay,
          justifyContent: "center",
          alignItems: "stretch",
          paddingHorizontal: theme.tokens.spacing.sm + 2,
        },
        modalCard: {
          width: "100%",
          maxHeight: "82%",
          backgroundColor: theme.colors.backgroundElevated,
          borderRadius: theme.tokens.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.tokens.spacing.lg,
        },
        sheetHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: theme.tokens.spacing.sm,
        },
        sheetTitle: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
        },
        closeText: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        sheetContent: {
          paddingBottom: theme.tokens.spacing["4xl"],
          gap: theme.tokens.spacing.sm,
        },
        libraryRow: {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.tokens.spacing.sm + 2,
          gap: theme.tokens.spacing.xxs + 1,
        },
      }),
    [theme],
  );

  if (routinesData === undefined || exercisesData === undefined) {
    return (
      <WorkoutPage headerChip={{ icon: "create-outline", label: "Session" }}>
        <View style={styles.card}><Text style={styles.cardTitle}>Syncing...</Text></View>
      </WorkoutPage>
    );
  }

  if (!selectedRoutine || !selectedSession) {
    return (
      <WorkoutPage headerChip={{ icon: "create-outline", label: "Session" }}>
        <Pressable style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.helperText}>Session not found.</Text>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage headerChip={{ icon: "create-outline", label: "Session" }}>
      <Pressable style={styles.backButton} onPress={handleBackPress}>
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>

      <Text style={styles.fieldLabel}>Session name</Text>
      <TextInput
        style={styles.input}
        value={sessionDraftName}
        onChangeText={setSessionDraftName}
        placeholder="Session name"
        placeholderTextColor={theme.colors.textSubtle}
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

              {exercises.map((exercise) => (
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
              ))}
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
                <TextInput style={styles.input} value={customName} onChangeText={setCustomName} placeholder="Name" placeholderTextColor={theme.colors.textSubtle} />
                <TextInput style={styles.input} value={customVariant} onChangeText={setCustomVariant} placeholder="Variant" placeholderTextColor={theme.colors.textSubtle} />
                <TextInput style={styles.input} value={customSets} onChangeText={setCustomSets} keyboardType="number-pad" placeholder="Sets" placeholderTextColor={theme.colors.textSubtle} />
                <TextInput style={styles.input} value={customReps} onChangeText={setCustomReps} placeholder="Reps" placeholderTextColor={theme.colors.textSubtle} />
                <TextInput style={styles.input} value={customRest} onChangeText={setCustomRest} keyboardType="number-pad" placeholder="Rest seconds" placeholderTextColor={theme.colors.textSubtle} />
                <TextInput style={styles.input} value={customPrimary} onChangeText={setCustomPrimary} placeholder="Primary muscles (comma separated)" placeholderTextColor={theme.colors.textSubtle} />
                <TextInput style={styles.input} value={customSecondary} onChangeText={setCustomSecondary} placeholder="Secondary muscles (comma separated)" placeholderTextColor={theme.colors.textSubtle} />

                <Pressable
                  style={styles.primaryButton}
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

                    await upsertSessionExercise({
                      sessionId: selectedSession._id,
                      sessionExerciseId: replaceSessionExerciseId
                        ? (replaceSessionExerciseId as Id<"sessionExercises">)
                        : undefined,
                      exerciseId,
                    });

                    setReplaceSessionExerciseId(null);
                    setCustomExerciseVisible(false);
                    setExercisePickerVisible(false);
                    setCustomName("");
                  }}
                >
                  <Text style={styles.primaryButtonText}>Create and add</Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </WorkoutPage>
  );
}
