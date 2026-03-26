import { api } from "@convex/_generated/api";
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

import {
  BODY_PART_VALUES,
  EQUIPMENT_VALUES,
  MUSCLE_VALUES,
  type BodyPartType,
  type EquipmentType,
  type MuscleType,
} from "@ironkor/shared/constants";

import WorkoutPage from "@/components/workout/WorkoutPage";
import type { RoutineSection } from "@/features/workout/types";
import { useTheme } from "@/theme";


import type { Id } from "@convex/_generated/dataModel";


interface ProgrammingDraft {
  sets: string;
  repsText: string;
  targetWeightKg: string;
  restSeconds: string;
  notes: string;
  tempo: string;
  rir: string;
}

function createProgrammingDraft(
  entry?: Pick<
    RoutineSection["exercises"][number],
    "sets" | "repsText" | "targetWeightKg" | "restSeconds" | "notes" | "tempo" | "rir"
  >,
): ProgrammingDraft {
  return {
    sets: `${entry?.sets ?? 3}`,
    repsText: entry?.repsText ?? "8-12",
    targetWeightKg:
      typeof entry?.targetWeightKg === "number" ? `${entry.targetWeightKg}` : "",
    restSeconds:
      typeof entry?.restSeconds === "number" ? `${entry.restSeconds}` : "",
    notes: entry?.notes ?? "",
    tempo: entry?.tempo ?? "",
    rir: typeof entry?.rir === "number" ? `${entry.rir}` : "",
  };
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function renderMuscleLabel(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatProgrammingSummary(entry: RoutineSection["exercises"][number]) {
  const pieces = [`${entry.sets} sets`, `${entry.repsText} reps`];

  if (typeof entry.targetWeightKg === "number") {
    pieces.push(`${entry.targetWeightKg}kg`);
  }

  if (typeof entry.restSeconds === "number") {
    pieces.push(`${entry.restSeconds}s rest`);
  }

  if (entry.tempo) {
    pieces.push(`Tempo ${entry.tempo}`);
  }

  if (typeof entry.rir === "number") {
    pieces.push(`${entry.rir} RIR`);
  }

  return pieces.join(" • ");
}

export default function SessionEditorScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [searchText, setSearchText] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPartType | undefined>();
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | undefined>();
  const [selectedPrimaryMuscle, setSelectedPrimaryMuscle] = useState<MuscleType | undefined>();

  const routinesData = useQuery(api.routines.listDetailed);
  const exercisesData = useQuery(api.exercises.list, {
    searchText: searchText.trim() || undefined,
    bodyPart: selectedBodyPart,
    equipment: selectedEquipment,
    primaryMuscle: selectedPrimaryMuscle,
  });

  const upsertSession = useMutation(api.routines.upsertSession);
  const upsertSessionExercise = useMutation(api.routines.upsertSessionExercise);
  const updateSessionExerciseProgramming = useMutation(
    api.routines.updateSessionExerciseProgramming,
  );
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
    () =>
      selectedRoutine?.sessions.find((session) => String(session._id) === sessionIdParam) ??
      null,
    [selectedRoutine, sessionIdParam],
  );

  const [sectionDraftName, setSectionDraftName] = useState("");
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [customExerciseVisible, setCustomExerciseVisible] = useState(false);
  const [programmingEditorVisible, setProgrammingEditorVisible] = useState(false);
  const [replaceSessionExerciseId, setReplaceSessionExerciseId] =
    useState<Id<"sessionExercises"> | null>(null);
  const [editingSessionExerciseId, setEditingSessionExerciseId] =
    useState<Id<"sessionExercises"> | null>(null);
  const [programmingDraft, setProgrammingDraft] = useState(
    createProgrammingDraft(),
  );

  const [customName, setCustomName] = useState("");
  const [customBodyPart, setCustomBodyPart] = useState<BodyPartType>("chest");
  const [customEquipment, setCustomEquipment] = useState<EquipmentType>("body weight");
  const [customPrimaryMuscle, setCustomPrimaryMuscle] =
    useState<MuscleType>("pectorals");
  const [customMuscleGroups, setCustomMuscleGroups] = useState<MuscleType[]>(["pectorals"]);
  const [customDescription, setCustomDescription] = useState("");
  const [customProgrammingDraft, setCustomProgrammingDraft] =
    useState(createProgrammingDraft());

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    setSectionDraftName(selectedSession.name);
  }, [selectedSession]);

  useEffect(() => {
    if (!customMuscleGroups.includes(customPrimaryMuscle)) {
      setCustomMuscleGroups((current) => [customPrimaryMuscle, ...current]);
    }
  }, [customMuscleGroups, customPrimaryMuscle]);

  function resetCustomExerciseForm() {
    setCustomName("");
    setCustomBodyPart("chest");
    setCustomEquipment("body weight");
    setCustomPrimaryMuscle("pectorals");
    setCustomMuscleGroups(["pectorals"]);
    setCustomDescription("");
    setCustomProgrammingDraft(createProgrammingDraft());
  }

  function openProgrammingEditor(
    sessionExerciseId: Id<"sessionExercises">,
    entry?: RoutineSection["exercises"][number],
  ) {
    setEditingSessionExerciseId(sessionExerciseId);
    setProgrammingDraft(createProgrammingDraft(entry));
    setProgrammingEditorVisible(true);
  }

  async function moveSessionExercise(
    sessionExerciseId: Id<"sessionExercises">,
    direction: -1 | 1,
  ) {
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
      router.replace({
        pathname: "/(workout)/routine-editor",
        params: { routineId: routineIdParam },
      });
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
        sectionName: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        sectionMeta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
        exerciseRow: {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.tokens.spacing.sm + 2,
          gap: theme.tokens.spacing.sm,
          marginTop: theme.tokens.spacing.sm,
        },
        exerciseRowTop: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.tokens.spacing.sm,
        },
        sessionActions: {
          flexDirection: "row",
          gap: theme.tokens.spacing.xs + 1,
          alignItems: "center",
          flexWrap: "wrap",
        },
        smallBtn: {
          backgroundColor: theme.colors.secondarySoft,
          borderRadius: theme.tokens.radius.xs,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xs + 2,
        },
        smallBtnActive: {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
        },
        smallBtnText: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        smallBtnTextActive: {
          color: theme.colors.onPrimary,
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
          lineHeight:
            theme.tokens.typography.fontSize.md *
            theme.tokens.typography.lineHeight.relaxed,
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
          maxHeight: "86%",
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
          gap: theme.tokens.spacing.md,
        },
        sheetTitle: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          flex: 1,
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
        filterSection: {
          gap: theme.tokens.spacing.xs,
        },
        filterChipRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.xs,
        },
      }),
    [theme],
  );

  if (routinesData === undefined || exercisesData === undefined) {
    return (
      <WorkoutPage headerChip={{ icon: "create-outline", label: "Section" }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Syncing...</Text>
        </View>
      </WorkoutPage>
    );
  }

  if (!selectedRoutine || !selectedSession) {
    return (
      <WorkoutPage headerChip={{ icon: "create-outline", label: "Section" }}>
        <Pressable style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.helperText}>Section not found.</Text>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage headerChip={{ icon: "create-outline", label: "Section" }}>
      <Pressable style={styles.backButton} onPress={handleBackPress}>
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>

      <Text style={styles.fieldLabel}>Section name</Text>
      <TextInput
        style={styles.input}
        value={sectionDraftName}
        onChangeText={setSectionDraftName}
        placeholder="Section name"
        placeholderTextColor={theme.colors.textSubtle}
      />

      <Pressable
        style={styles.primaryButton}
        onPress={async () => {
          await upsertSession({
            routineId: selectedRoutine._id,
            sessionId: selectedSession._id,
            name: sectionDraftName.trim() || selectedSession.name,
          });
        }}
      >
        <Text style={styles.primaryButtonText}>Save section name</Text>
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
          <View style={styles.exerciseRowTop}>
            <View style={styles.flexOne}>
              <Text style={styles.sectionName}>{entry.exercise.name}</Text>
              <Text style={styles.sectionMeta}>{formatProgrammingSummary(entry)}</Text>
              <Text style={styles.sectionMeta}>
                {renderMuscleLabel(entry.exercise.bodyPart)} •{" "}
                {renderMuscleLabel(entry.exercise.primaryMuscle)} •{" "}
                {renderMuscleLabel(entry.exercise.equipment)}
              </Text>
              {entry.notes ? <Text style={styles.sectionMeta}>{entry.notes}</Text> : null}
            </View>
          </View>

          <View style={styles.sessionActions}>
            <Pressable
              style={styles.smallBtn}
              onPress={() => {
                void moveSessionExercise(entry._id, -1);
              }}
            >
              <Text style={styles.smallBtnText}>↑</Text>
            </Pressable>
            <Pressable
              style={styles.smallBtn}
              onPress={() => {
                void moveSessionExercise(entry._id, 1);
              }}
            >
              <Text style={styles.smallBtnText}>↓</Text>
            </Pressable>
            <Pressable
              style={styles.smallBtn}
              onPress={() => {
                openProgrammingEditor(entry._id, entry);
              }}
            >
              <Text style={styles.smallBtnText}>Program</Text>
            </Pressable>
            <Pressable
              style={styles.smallBtn}
              onPress={() => {
                setReplaceSessionExerciseId(entry._id);
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
              <Text style={styles.sheetTitle}>Exercise catalog</Text>
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
              <TextInput
                style={styles.input}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search by name or muscles"
                placeholderTextColor={theme.colors.textSubtle}
              />

              <View style={styles.filterSection}>
                <Text style={styles.fieldLabel}>Body part</Text>
                <View style={styles.filterChipRow}>
                  <Pressable
                    style={[styles.smallBtn, !selectedBodyPart && styles.smallBtnActive]}
                    onPress={() => {
                      setSelectedBodyPart(undefined);
                    }}
                  >
                    <Text
                      style={[
                        styles.smallBtnText,
                        !selectedBodyPart && styles.smallBtnTextActive,
                      ]}
                    >
                      Any
                    </Text>
                  </Pressable>
                  {BODY_PART_VALUES.map((value) => (
                    <Pressable
                      key={`body-part-${value}`}
                      style={[
                        styles.smallBtn,
                        selectedBodyPart === value && styles.smallBtnActive,
                      ]}
                      onPress={() => {
                        setSelectedBodyPart(value);
                      }}
                    >
                      <Text
                        style={[
                          styles.smallBtnText,
                          selectedBodyPart === value && styles.smallBtnTextActive,
                        ]}
                      >
                        {renderMuscleLabel(value)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.fieldLabel}>Primary muscle</Text>
                <View style={styles.filterChipRow}>
                  <Pressable
                    style={[styles.smallBtn, !selectedPrimaryMuscle && styles.smallBtnActive]}
                    onPress={() => {
                      setSelectedPrimaryMuscle(undefined);
                    }}
                  >
                    <Text
                      style={[
                        styles.smallBtnText,
                        !selectedPrimaryMuscle && styles.smallBtnTextActive,
                      ]}
                    >
                      Any
                    </Text>
                  </Pressable>
                  {MUSCLE_VALUES.map((value) => (
                    <Pressable
                      key={`muscle-${value}`}
                      style={[
                        styles.smallBtn,
                        selectedPrimaryMuscle === value && styles.smallBtnActive,
                      ]}
                      onPress={() => {
                        setSelectedPrimaryMuscle(value);
                      }}
                    >
                      <Text
                        style={[
                          styles.smallBtnText,
                          selectedPrimaryMuscle === value && styles.smallBtnTextActive,
                        ]}
                      >
                        {renderMuscleLabel(value)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.fieldLabel}>Equipment</Text>
                <View style={styles.filterChipRow}>
                  <Pressable
                    style={[styles.smallBtn, !selectedEquipment && styles.smallBtnActive]}
                    onPress={() => {
                      setSelectedEquipment(undefined);
                    }}
                  >
                    <Text
                      style={[
                        styles.smallBtnText,
                        !selectedEquipment && styles.smallBtnTextActive,
                      ]}
                    >
                      Any
                    </Text>
                  </Pressable>
                  {EQUIPMENT_VALUES.map((value) => (
                    <Pressable
                      key={`equipment-${value}`}
                      style={[
                        styles.smallBtn,
                        selectedEquipment === value && styles.smallBtnActive,
                      ]}
                      onPress={() => {
                        setSelectedEquipment(value);
                      }}
                    >
                      <Text
                        style={[
                          styles.smallBtnText,
                          selectedEquipment === value && styles.smallBtnTextActive,
                        ]}
                      >
                        {renderMuscleLabel(value)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable
                style={styles.primaryButton}
                onPress={() => {
                  setCustomExerciseVisible(true);
                }}
              >
                <Text style={styles.primaryButtonText}>Create custom exercise</Text>
              </Pressable>

              {exercises.map((exercise) => (
                <Pressable
                  key={String(exercise._id)}
                  style={styles.libraryRow}
                  onPress={async () => {
                    const currentEntry =
                      replaceSessionExerciseId !== null
                        ? selectedSession.exercises.find(
                            (entry) => entry._id === replaceSessionExerciseId,
                          )
                        : undefined;

                    const sessionExerciseId = await upsertSessionExercise({
                      sessionId: selectedSession._id,
                      sessionExerciseId: replaceSessionExerciseId ?? undefined,
                      exerciseId: exercise._id,
                    });

                    setReplaceSessionExerciseId(null);
                    setExercisePickerVisible(false);
                    openProgrammingEditor(sessionExerciseId, currentEntry);
                  }}
                >
                  <Text style={styles.sectionName}>{exercise.name}</Text>
                  <Text style={styles.sectionMeta}>
                    {renderMuscleLabel(exercise.bodyPart)} •{" "}
                    {renderMuscleLabel(exercise.primaryMuscle)} •{" "}
                    {renderMuscleLabel(exercise.equipment)}
                  </Text>
                  <Text style={styles.sectionMeta}>
                    {exercise.isCustom ? "Custom catalog entry" : "Library exercise"}
                  </Text>
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
        onRequestClose={() => {
          setCustomExerciseVisible(false);
        }}
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
                <Pressable
                  onPress={() => {
                    setCustomExerciseVisible(false);
                  }}
                >
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>Catalog</Text>
                <TextInput
                  style={styles.input}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Exercise name"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={customDescription}
                  onChangeText={setCustomDescription}
                  placeholder="Description (optional)"
                  placeholderTextColor={theme.colors.textSubtle}
                />

                <View style={styles.filterSection}>
                  <Text style={styles.fieldLabel}>Body part</Text>
                  <View style={styles.filterChipRow}>
                    {BODY_PART_VALUES.map((value) => (
                      <Pressable
                        key={`custom-body-part-${value}`}
                        style={[
                          styles.smallBtn,
                          customBodyPart === value && styles.smallBtnActive,
                        ]}
                        onPress={() => {
                          setCustomBodyPart(value);
                        }}
                      >
                        <Text
                          style={[
                            styles.smallBtnText,
                            customBodyPart === value && styles.smallBtnTextActive,
                          ]}
                        >
                          {renderMuscleLabel(value)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.fieldLabel}>Equipment</Text>
                  <View style={styles.filterChipRow}>
                    {EQUIPMENT_VALUES.map((value) => (
                      <Pressable
                        key={`custom-equipment-${value}`}
                        style={[
                          styles.smallBtn,
                          customEquipment === value && styles.smallBtnActive,
                        ]}
                        onPress={() => {
                          setCustomEquipment(value);
                        }}
                      >
                        <Text
                          style={[
                            styles.smallBtnText,
                            customEquipment === value && styles.smallBtnTextActive,
                          ]}
                        >
                          {renderMuscleLabel(value)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.fieldLabel}>Primary muscle</Text>
                  <View style={styles.filterChipRow}>
                    {MUSCLE_VALUES.map((value) => (
                      <Pressable
                        key={`custom-primary-muscle-${value}`}
                        style={[
                          styles.smallBtn,
                          customPrimaryMuscle === value && styles.smallBtnActive,
                        ]}
                        onPress={() => {
                          setCustomPrimaryMuscle(value);
                          setCustomMuscleGroups((current) => {
                            const next = current.filter((item) => item !== value);
                            return [value, ...next];
                          });
                        }}
                      >
                        <Text
                          style={[
                            styles.smallBtnText,
                            customPrimaryMuscle === value && styles.smallBtnTextActive,
                          ]}
                        >
                          {renderMuscleLabel(value)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.fieldLabel}>Muscle groups</Text>
                  <View style={styles.filterChipRow}>
                    {MUSCLE_VALUES.map((value) => {
                      const isSelected = customMuscleGroups.includes(value);
                      return (
                        <Pressable
                          key={`custom-muscle-group-${value}`}
                          style={[styles.smallBtn, isSelected && styles.smallBtnActive]}
                          onPress={() => {
                            setCustomMuscleGroups((current) => {
                              if (value === customPrimaryMuscle) {
                                return current.includes(value) ? current : [value, ...current];
                              }

                              return current.includes(value)
                                ? current.filter((item) => item !== value)
                                : [...current, value];
                            });
                          }}
                        >
                          <Text
                            style={[
                              styles.smallBtnText,
                              isSelected && styles.smallBtnTextActive,
                            ]}
                          >
                            {renderMuscleLabel(value)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Programming</Text>
                <TextInput
                  style={styles.input}
                  value={customProgrammingDraft.sets}
                  onChangeText={(value) => {
                    setCustomProgrammingDraft((current) => ({ ...current, sets: value }));
                  }}
                  keyboardType="number-pad"
                  placeholder="Sets"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={customProgrammingDraft.repsText}
                  onChangeText={(value) => {
                    setCustomProgrammingDraft((current) => ({ ...current, repsText: value }));
                  }}
                  placeholder="Reps"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={customProgrammingDraft.targetWeightKg}
                  onChangeText={(value) => {
                    setCustomProgrammingDraft((current) => ({
                      ...current,
                      targetWeightKg: value,
                    }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Target weight (kg)"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={customProgrammingDraft.restSeconds}
                  onChangeText={(value) => {
                    setCustomProgrammingDraft((current) => ({
                      ...current,
                      restSeconds: value,
                    }));
                  }}
                  keyboardType="number-pad"
                  placeholder="Rest seconds"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={customProgrammingDraft.tempo}
                  onChangeText={(value) => {
                    setCustomProgrammingDraft((current) => ({ ...current, tempo: value }));
                  }}
                  placeholder="Tempo (optional)"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={customProgrammingDraft.rir}
                  onChangeText={(value) => {
                    setCustomProgrammingDraft((current) => ({ ...current, rir: value }));
                  }}
                  keyboardType="number-pad"
                  placeholder="RIR (optional)"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={customProgrammingDraft.notes}
                  onChangeText={(value) => {
                    setCustomProgrammingDraft((current) => ({ ...current, notes: value }));
                  }}
                  placeholder="Notes (optional)"
                  placeholderTextColor={theme.colors.textSubtle}
                  multiline
                />

                <Pressable
                  style={styles.primaryButton}
                  onPress={async () => {
                    if (!customName.trim()) {
                      Alert.alert("Missing name", "Add a name for the custom exercise.");
                      return;
                    }

                    const muscleGroups = Array.from(
                      new Set([customPrimaryMuscle, ...customMuscleGroups]),
                    );

                    const exerciseId = await createCustomExercise({
                      name: customName.trim(),
                      bodyPart: customBodyPart,
                      equipment: customEquipment,
                      primaryMuscle: customPrimaryMuscle,
                      muscleGroups,
                      description: customDescription.trim() || undefined,
                    });

                    await upsertSessionExercise({
                      sessionId: selectedSession._id,
                      sessionExerciseId: replaceSessionExerciseId ?? undefined,
                      exerciseId,
                      sets: Math.max(1, Math.floor(Number(customProgrammingDraft.sets) || 3)),
                      repsText: customProgrammingDraft.repsText.trim() || "8-12",
                      targetWeightKg: parseOptionalNumber(
                        customProgrammingDraft.targetWeightKg,
                      ),
                      restSeconds: parseOptionalNumber(customProgrammingDraft.restSeconds),
                      notes: customProgrammingDraft.notes,
                      tempo: customProgrammingDraft.tempo,
                      rir: parseOptionalNumber(customProgrammingDraft.rir),
                    });

                    setReplaceSessionExerciseId(null);
                    setCustomExerciseVisible(false);
                    setExercisePickerVisible(false);
                    resetCustomExerciseForm();
                  }}
                >
                  <Text style={styles.primaryButtonText}>Create and add</Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={programmingEditorVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          setProgrammingEditorVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalRoot}
            behavior={Platform.OS === "ios" ? "padding" : "position"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          >
            <View style={styles.modalCard}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Section programming</Text>
                <Pressable
                  onPress={() => {
                    setProgrammingEditorVisible(false);
                  }}
                >
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
                <TextInput
                  style={styles.input}
                  value={programmingDraft.sets}
                  onChangeText={(value) => {
                    setProgrammingDraft((current) => ({ ...current, sets: value }));
                  }}
                  keyboardType="number-pad"
                  placeholder="Sets"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={programmingDraft.repsText}
                  onChangeText={(value) => {
                    setProgrammingDraft((current) => ({ ...current, repsText: value }));
                  }}
                  placeholder="Reps"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={programmingDraft.targetWeightKg}
                  onChangeText={(value) => {
                    setProgrammingDraft((current) => ({
                      ...current,
                      targetWeightKg: value,
                    }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Target weight (kg)"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={programmingDraft.restSeconds}
                  onChangeText={(value) => {
                    setProgrammingDraft((current) => ({ ...current, restSeconds: value }));
                  }}
                  keyboardType="number-pad"
                  placeholder="Rest seconds"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={programmingDraft.tempo}
                  onChangeText={(value) => {
                    setProgrammingDraft((current) => ({ ...current, tempo: value }));
                  }}
                  placeholder="Tempo (optional)"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={programmingDraft.rir}
                  onChangeText={(value) => {
                    setProgrammingDraft((current) => ({ ...current, rir: value }));
                  }}
                  keyboardType="number-pad"
                  placeholder="RIR (optional)"
                  placeholderTextColor={theme.colors.textSubtle}
                />
                <TextInput
                  style={styles.input}
                  value={programmingDraft.notes}
                  onChangeText={(value) => {
                    setProgrammingDraft((current) => ({ ...current, notes: value }));
                  }}
                  placeholder="Notes (optional)"
                  placeholderTextColor={theme.colors.textSubtle}
                  multiline
                />

                <Pressable
                  style={styles.primaryButton}
                  onPress={async () => {
                    if (!editingSessionExerciseId) {
                      return;
                    }

                    await updateSessionExerciseProgramming({
                      sessionId: selectedSession._id,
                      sessionExerciseId: editingSessionExerciseId,
                      sets: Math.max(1, Math.floor(Number(programmingDraft.sets) || 3)),
                      repsText: programmingDraft.repsText.trim() || "8-12",
                      targetWeightKg: parseOptionalNumber(programmingDraft.targetWeightKg),
                      restSeconds: parseOptionalNumber(programmingDraft.restSeconds),
                      notes: programmingDraft.notes,
                      tempo: programmingDraft.tempo,
                      rir: parseOptionalNumber(programmingDraft.rir),
                    });

                    setProgrammingEditorVisible(false);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Save programming</Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </WorkoutPage>
  );
}
