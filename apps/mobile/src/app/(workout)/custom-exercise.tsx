import { api } from "@convex/_generated/api";
import { normalizeExerciseCatalog } from "@convex/exerciseCatalog";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BODY_PART_VALUES,
  EQUIPMENT_VALUES,
  MUSCLE_VALUES,
  type BodyPartType,
  type EquipmentType,
  type MuscleType,
} from "@ironkor/shared/constants";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import AppTextField from "@/components/ui/AppTextField";
import HeaderBackButton from "@/components/ui/HeaderBackButton";
import { useAppAlert } from "@/components/ui/useAppAlert";
import ExerciseProgrammingForm from "@/components/workout/ExerciseProgrammingForm";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { useDraftRoutine } from "@/features/workout/DraftRoutineProvider";
import {
  createProgrammingDraftFromExercise,
  normalizeProgrammingDraftForSave,
} from "@/features/workout/mappers";
import { createProgrammingDraft } from "@/features/workout/programmingDraft";
import type { ExerciseCatalog } from "@/features/workout/types";
import { useTheme } from "@/theme";

import type { Id } from "@convex/_generated/dataModel";

function renderLabel(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return fallback;
}

function parseFromManageFlag(
  value: string | string[] | undefined,
): boolean {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "1" || v === "true";
}

function normalizeCreatePayload(args: {
  name: string;
  bodyPart: BodyPartType;
  equipment: EquipmentType;
  primaryMuscle: MuscleType;
  muscleGroups: MuscleType[];
  description: string;
}) {
  return {
    name: args.name.trim(),
    bodyPart: args.bodyPart,
    equipment: args.equipment,
    primaryMuscle: args.primaryMuscle,
    muscleGroups: Array.from(new Set([args.primaryMuscle, ...args.muscleGroups])),
    description: args.description.trim() || undefined,
  };
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function CustomExerciseScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert, AlertModal } = useAppAlert();
  const { draft, addOrReplaceExercise } = useDraftRoutine();

  const createCustomExercise = useMutation(api.exercises.createCustom);
  const updateCustomExercise = useMutation(api.exercises.updateCustom);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState<BodyPartType>("chest");
  const [equipment, setEquipment] = useState<EquipmentType>("body weight");
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleType>("pectorals");
  const [muscleGroups, setMuscleGroups] = useState<MuscleType[]>(["pectorals"]);
  const [description, setDescription] = useState("");
  const [programmingDraft, setProgrammingDraft] = useState(createProgrammingDraft());

  const exerciseIdParam =
    typeof params.exerciseId === "string" && params.exerciseId.length > 0
      ? (params.exerciseId as Id<"exercises">)
      : undefined;
  const isEditMode = Boolean(exerciseIdParam);

  const exerciseToEdit = useQuery(
    api.exercises.getCustomById,
    exerciseIdParam ? { exerciseId: exerciseIdParam } : "skip",
  );

  const routineIdParam = typeof params.routineId === "string" ? params.routineId : "";
  const draftSessionKeyParam =
    typeof params.draftSessionKey === "string" ? params.draftSessionKey : "";
  const replaceSessionExerciseIdParam =
    typeof params.replaceSessionExerciseId === "string"
      ? params.replaceSessionExerciseId
      : undefined;
  const selectedDraftSession = useMemo(
    () => draft?.sessions.find((session) => session.key === draftSessionKeyParam) ?? null,
    [draft?.sessions, draftSessionKeyParam],
  );

  /** From session editor: create exercise and attach to section. From My exercises: catalog only. */
  const addToSession = !isEditMode && routineIdParam.length > 0 && draftSessionKeyParam.length > 0;
  const fromManage = parseFromManageFlag(params.fromManage);

  const programmingSourceKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isEditMode || exerciseToEdit === undefined) {
      return;
    }

    if (exerciseToEdit === null) {
      showAlert({
        title: "Exercise not found",
        message: "This exercise is no longer available.",
        variant: "warning",
      });
      router.replace(fromManage ? "/(workout)/my-exercises" : "/(workout)/routines");
      return;
    }

    setName(exerciseToEdit.name);
    setBodyPart(exerciseToEdit.bodyPart);
    setEquipment(exerciseToEdit.equipment);
    setPrimaryMuscle(exerciseToEdit.primaryMuscle);
    setMuscleGroups(exerciseToEdit.muscleGroups);
    setDescription(exerciseToEdit.description ?? "");
  }, [exerciseToEdit, fromManage, isEditMode, router, showAlert]);

  useEffect(() => {
    if (!addToSession) {
      programmingSourceKeyRef.current = null;
      return;
    }

    const sourceKey = `${draftSessionKeyParam}:${replaceSessionExerciseIdParam ?? "new"}`;
    if (programmingSourceKeyRef.current === sourceKey) {
      return;
    }

    if (replaceSessionExerciseIdParam && selectedDraftSession === null) {
      return;
    }

    const currentEntry =
      replaceSessionExerciseIdParam && selectedDraftSession
        ? selectedDraftSession.exercises.find((entry) => entry.key === replaceSessionExerciseIdParam)
        : undefined;

    programmingSourceKeyRef.current = sourceKey;
    setProgrammingDraft(
      currentEntry ? createProgrammingDraftFromExercise(currentEntry) : createProgrammingDraft(),
    );
  }, [
    addToSession,
    draftSessionKeyParam,
    replaceSessionExerciseIdParam,
    selectedDraftSession,
  ]);

  const resetCreateFormState = useCallback(() => {
    setName("");
    setBodyPart("chest");
    setEquipment("body weight");
    setPrimaryMuscle("pectorals");
    setMuscleGroups(["pectorals"]);
    setDescription("");
    setProgrammingDraft(createProgrammingDraft());
  }, []);

  const exitCustomExerciseScreen = useCallback(() => {
    if (!isEditMode) {
      resetCreateFormState();
    }

    if (fromManage) {
      router.replace("/(workout)/my-exercises");
      return;
    }

    router.back();
  }, [fromManage, isEditMode, resetCreateFormState, router]);

  const isWaitingForData = isEditMode && exerciseIdParam !== undefined && exerciseToEdit === undefined;
  const canSubmit = name.trim().length > 0 && !isSubmitting && !isWaitingForData;

  useEffect(() => {
    if (!isEditMode) {
      resetCreateFormState();
    }
  }, [isEditMode, resetCreateFormState]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: {
          gap: theme.tokens.spacing.sm,
        },
        label: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
          textTransform: "uppercase",
        },
        chipWrap: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.xs,
        },
        chip: {
          backgroundColor: theme.colors.secondarySoft,
          borderColor: theme.colors.borderSoft,
          borderRadius: theme.tokens.radius.pill,
          borderWidth: 1,
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xs,
        },
        chipActive: {
          backgroundColor: theme.colors.accentSoft,
          borderColor: theme.colors.borderAccent,
        },
        chipText: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        chipTextActive: {
          color: theme.colors.accent,
        },
        footer: {
          gap: theme.tokens.spacing.sm,
        },
      }),
    [theme],
  );

  async function handleSave() {
    if (isSubmitting) {
      return;
    }
    if (!name.trim()) {
      showAlert({
        title: "Missing name",
        message: "Add a name for the custom exercise.",
        variant: "warning",
      });
      return;
    }

    const payload = normalizeCreatePayload({
      name,
      bodyPart,
      equipment,
      primaryMuscle,
      muscleGroups,
      description,
    });

    if (isEditMode) {
      if (!exerciseIdParam) {
        return;
      }
      setIsSubmitting(true);
      try {
        await updateCustomExercise({
          exerciseId: exerciseIdParam,
          ...payload,
        });
        exitCustomExerciseScreen();
      } catch (error) {
        showAlert({
          title: "Unable to update exercise",
          message: resolveErrorMessage(error, "Please try again."),
          variant: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (routineIdParam.length > 0 && !draftSessionKeyParam) {
      showAlert({
        title: "Missing draft session",
        message: "Open this screen from a draft section to add the exercise.",
        variant: "warning",
      });
      return;
    }

    if (!addToSession) {
      setIsSubmitting(true);
      try {
        await createCustomExercise(payload);
        exitCustomExerciseScreen();
      } catch (error) {
        showAlert({
          title: "Unable to create exercise",
          message: resolveErrorMessage(error, "Please try again."),
          variant: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!selectedDraftSession) {
      showAlert({
        title: "Missing draft session",
        message: "Open this screen from a draft section to add the exercise.",
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const exerciseId = await createCustomExercise(payload);

      const normalized = normalizeExerciseCatalog({
        ...payload,
        isCustom: true,
      });

      const draftExercise: ExerciseCatalog = {
        _id: exerciseId,
        _creationTime: Date.now(),
        ...normalized,
      };

      addOrReplaceExercise(
        selectedDraftSession.key,
        draftExercise,
        normalizeProgrammingDraftForSave(programmingDraft),
        replaceSessionExerciseIdParam,
      );

      resetCreateFormState();
      router.replace({
        pathname: "/(workout)/session-editor",
        params: {
          routineId: routineIdParam,
          draftSessionKey: draftSessionKeyParam,
        },
      });
    } catch (error) {
      showAlert({
        title: "Unable to create exercise",
        message: resolveErrorMessage(error, "Please try again."),
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const chipLabel = isEditMode ? "Edit" : "Create";
  const submitLabel = isEditMode
    ? isSubmitting ? "Saving..." : "Save changes"
    : addToSession
      ? isSubmitting ? "Creating..." : "Create and add"
      : isSubmitting ? "Saving..." : "Save exercise";

  const pageSubtitle = isEditMode
    ? "Edit exercise"
    : addToSession
      ? "Custom exercise"
      : "Save to your catalog";

  return (
    <WorkoutPage
      headerChip={{ icon: "barbell-outline", label: chipLabel }}
      title={null}
      subtitle={pageSubtitle}
      headerAction={<HeaderBackButton onPress={exitCustomExerciseScreen} />}
      headerActionPosition="left"
      scrollProps={{ keyboardShouldPersistTaps: "handled" }}
    >
      <AppCard>
        <View style={styles.section}>
          <AppTextField
            label="Name"
            placeholder="Exercise name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <AppTextField
            label="Description (optional)"
            placeholder="Exercise details"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.section}>
          <Text style={styles.label}>Body part</Text>
          <View style={styles.chipWrap}>
            {BODY_PART_VALUES.map((value) => (
              <Pressable
                key={`body-part-${value}`}
                style={[styles.chip, bodyPart === value && styles.chipActive]}
                onPress={() => {
                  setBodyPart(value);
                }}
              >
                <Text style={[styles.chipText, bodyPart === value && styles.chipTextActive]}>
                  {renderLabel(value)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.section}>
          <Text style={styles.label}>Equipment</Text>
          <View style={styles.chipWrap}>
            {EQUIPMENT_VALUES.map((value) => (
              <Pressable
                key={`equipment-${value}`}
                style={[styles.chip, equipment === value && styles.chipActive]}
                onPress={() => {
                  setEquipment(value);
                }}
              >
                <Text style={[styles.chipText, equipment === value && styles.chipTextActive]}>
                  {renderLabel(value)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.section}>
          <Text style={styles.label}>Primary muscle</Text>
          <View style={styles.chipWrap}>
            {MUSCLE_VALUES.map((value) => (
              <Pressable
                key={`primary-muscle-${value}`}
                style={[styles.chip, primaryMuscle === value && styles.chipActive]}
                onPress={() => {
                  setPrimaryMuscle(value);
                  setMuscleGroups((current) => {
                    const next = current.filter((item) => item !== value);
                    return [value, ...next];
                  });
                }}
              >
                <Text
                  style={[styles.chipText, primaryMuscle === value && styles.chipTextActive]}
                >
                  {renderLabel(value)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.section}>
          <Text style={styles.label}>Muscle groups</Text>
          <View style={styles.chipWrap}>
            {MUSCLE_VALUES.map((value) => {
              const isSelected = muscleGroups.includes(value);
              return (
                <Pressable
                  key={`muscle-group-${value}`}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => {
                    setMuscleGroups((current) => {
                      if (value === primaryMuscle) {
                        return current.includes(value) ? current : [value, ...current];
                      }
                      return current.includes(value)
                        ? current.filter((item) => item !== value)
                        : [...current, value];
                    });
                  }}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {renderLabel(value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </AppCard>

      {!isEditMode && addToSession ? (
        <AppCard>
          <View style={styles.section}>
            <Text style={styles.label}>Programming</Text>
            <ExerciseProgrammingForm draft={programmingDraft} onChange={setProgrammingDraft} />
          </View>
        </AppCard>
      ) : null}

      <View style={styles.footer}>
        <AppButton
          label={submitLabel}
          fullWidth
          onPress={handleSave}
          disabled={!canSubmit}
        />
      </View>
      {AlertModal}
    </WorkoutPage>
  );
}
