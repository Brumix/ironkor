import { api } from "@convex/_generated/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
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
  NestableDraggableFlatList,
  NestableScrollContainer,
  type DragEndParams,
  type RenderItemParams,
} from "react-native-draggable-flatlist";

import {
  BODY_PART_VALUES,
  EQUIPMENT_VALUES,
  MUSCLE_VALUES,
  getUniqueBodyPartForMuscle,
  type BodyPartType,
  type EquipmentType,
  type MuscleType,
} from "@ironkor/shared/constants";
import { MAX_EXERCISES_PER_SESSION } from "@ironkor/shared/routines";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import ExerciseFilterRow from "@/components/ui/ExerciseFilterRow";
import HeaderBackButton from "@/components/ui/HeaderBackButton";
import PressableScale from "@/components/ui/PressableScale";
import { useAppAlert } from "@/components/ui/useAppAlert";
import ExerciseProgrammingForm from "@/components/workout/ExerciseProgrammingForm";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { captureAnalyticsEvent } from "@/config/posthog";
import { useDraftRoutine } from "@/features/workout/DraftRoutineProvider";
import {
  createProgrammingDraftFromExercise,
  normalizeProgrammingDraftForSave,
} from "@/features/workout/mappers";
import {
  createProgrammingDraft,
  formatProgrammingSummary,
  type ProgrammingDraft,
} from "@/features/workout/programmingDraft";
import type { DraftSessionExercise, RoutineSection } from "@/features/workout/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { tokens, useTheme } from "@/theme";

import type { Id } from "@convex/_generated/dataModel";

function scheduleScrollToEndForNotes(scrollRef: RefObject<ScrollView | null>) {
  const scroll = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  scroll();
  requestAnimationFrame(() => {
    requestAnimationFrame(scroll);
  });
  setTimeout(scroll, tokens.motion.quick);
  setTimeout(scroll, tokens.motion.keyboardScrollRetry);
  setTimeout(scroll, tokens.motion.keyboardScrollRetryLong);

  const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
  const sub = Keyboard.addListener(showEvent, () => {
    scroll();
    sub.remove();
  });

  if (Platform.OS === "ios") {
    const subDid = Keyboard.addListener("keyboardDidShow", () => {
      scroll();
      subDid.remove();
    });
  }
}

function renderMuscleLabel(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function areProgrammingDraftsEqual(a: ProgrammingDraft, b: ProgrammingDraft) {
  return (
    a.sets === b.sets &&
    a.repsText === b.repsText &&
    a.targetWeightKg === b.targetWeightKg &&
    a.restSeconds === b.restSeconds &&
    a.notes === b.notes &&
    a.tempo === b.tempo &&
    a.rir === b.rir
  );
}

type ExerciseSourceFilter = "all" | "preset" | "custom";

function resolveAnalyticsRoutineId(args: {
  currentRoutineId: string | null;
  draftRoutineId?: Id<"routines">;
  routeRoutineId: string;
}) {
  if (args.draftRoutineId) {
    return String(args.draftRoutineId);
  }

  if (args.currentRoutineId && args.currentRoutineId !== "new") {
    return args.currentRoutineId;
  }

  if (args.routeRoutineId && args.routeRoutineId !== "new") {
    return args.routeRoutineId;
  }

  return "draft:new";
}

function resolveAnalyticsSessionId(session: { key: string; sessionId?: Id<"routineSessions"> } | null) {
  if (!session) {
    return null;
  }

  return session.sessionId ? String(session.sessionId) : session.key;
}


// eslint-disable-next-line sonarjs/cognitive-complexity
export default function SessionEditorScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert, AlertModal } = useAppAlert();
  const {
    draft,
    currentRoutineId,
    hydrateRoutine,
    updateSessionName: updateDraftSessionName,
    addOrReplaceExercise,
    updateExerciseProgramming: updateDraftExerciseProgramming,
    reorderExercises: reorderDraftExercises,
    removeExercise: removeDraftExercise,
  } = useDraftRoutine();

  const [searchText, setSearchText] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPartType | undefined>();
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | undefined>();
  const [selectedPrimaryMuscle, setSelectedPrimaryMuscle] = useState<MuscleType | undefined>();
  const [sourceFilter, setSourceFilter] = useState<ExerciseSourceFilter>("all");
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);

  const debouncedSearch = useDebouncedValue(searchText, tokens.motion.searchDebounce);

  const exercisesData = useQuery(
    api.exercises.listPreview,
    exercisePickerVisible
      ? {
          searchText: debouncedSearch.trim() || undefined,
          bodyPart: selectedBodyPart,
          equipment: selectedEquipment,
          primaryMuscle: selectedPrimaryMuscle,
          isCustom:
            sourceFilter === "all" ? undefined : sourceFilter === "custom",
          limit: 50,
        }
      : "skip",
  );
  const availableFilterOptions = useQuery(
    api.exercises.getAvailableFilterOptions,
    exercisePickerVisible
      ? {
          bodyPart: selectedBodyPart,
          equipment: selectedEquipment,
          primaryMuscle: selectedPrimaryMuscle,
        }
      : "skip",
  );

  const staleExercisesRef = useRef<typeof exercisesData>([]);
  if (exercisesData !== undefined) {
    staleExercisesRef.current = exercisesData;
  }
  const exercises = exercisesData ?? staleExercisesRef.current ?? [];
  const isExercisesFirstLoad =
    exercisePickerVisible && exercisesData === undefined && staleExercisesRef.current?.length === 0;
  const routineIdParam = typeof params.routineId === "string" ? params.routineId : "";
  const sessionIdParam = typeof params.sessionId === "string" ? params.sessionId : "";
  const draftSessionKey = typeof params.draftSessionKey === "string" ? params.draftSessionKey : "";
  const isDraftMode = routineIdParam === "new";
  const selectedRoutine = useQuery(
    api.routines.getDetailedById,
    !isDraftMode && routineIdParam
      ? { routineId: routineIdParam as Id<"routines"> }
      : "skip",
  );

  useLayoutEffect(() => {
    if (!isDraftMode && selectedRoutine === null) {
      router.replace("/(workout)/routines");
    }
  }, [isDraftMode, router, selectedRoutine]);

  useEffect(() => {
    if (isDraftMode || selectedRoutine === undefined || selectedRoutine === null) {
      return;
    }

    const routineId = String(selectedRoutine._id);
    if (currentRoutineId === routineId && draft) {
      return;
    }

    hydrateRoutine(selectedRoutine);
  }, [currentRoutineId, draft, hydrateRoutine, isDraftMode, selectedRoutine]);

  const selectedSession = useMemo(
    () =>
      selectedRoutine?.sessions.find(
        (session: RoutineSection) => String(session._id) === sessionIdParam,
      ) ??
      null,
    [selectedRoutine, sessionIdParam],
  );
  const selectedDraftSession = useMemo(
    () =>
      draft?.sessions.find(
        (session) =>
          session.key === draftSessionKey ||
          (sessionIdParam.length > 0 && String(session.sessionId) === sessionIdParam),
      ) ?? null,
    [draft?.sessions, draftSessionKey, sessionIdParam],
  );

  const [programmingFormMountKey, setProgrammingFormMountKey] = useState(0);
  const [programmingEditorVisible, setProgrammingEditorVisible] = useState(false);
  const [exerciseOrderKeys, setExerciseOrderKeys] = useState<string[]>([]);
  const [replaceSessionExerciseId, setReplaceSessionExerciseId] =
    useState<string | null>(null);
  const [editingSessionExerciseId, setEditingSessionExerciseId] =
    useState<string | null>(null);
  const [programmingDraft, setProgrammingDraft] = useState(
    createProgrammingDraft(),
  );
  const [initialProgrammingDraft, setInitialProgrammingDraft] = useState(
    createProgrammingDraft(),
  );
  const [showDiscardProgrammingModal, setShowDiscardProgrammingModal] = useState(false);

  const programmingEditorScrollRef = useRef<ScrollView | null>(null);
  const analyticsRoutineId = useMemo(
    () =>
      resolveAnalyticsRoutineId({
        currentRoutineId,
        draftRoutineId: draft?.routineId,
        routeRoutineId: routineIdParam,
      }),
    [currentRoutineId, draft?.routineId, routineIdParam],
  );
  const analyticsSessionId = useMemo(
    () => resolveAnalyticsSessionId(selectedDraftSession),
    [selectedDraftSession],
  );

  const onProgrammingNotesFocus = useCallback(() => {
    scheduleScrollToEndForNotes(programmingEditorScrollRef);
  }, []);

  const handleBodyPartFilterChange = useCallback((value: BodyPartType | undefined) => {
    setSelectedBodyPart(value);
  }, []);

  const handleEquipmentFilterChange = useCallback((value: EquipmentType | undefined) => {
    setSelectedEquipment(value);
  }, []);

  const handlePrimaryMuscleFilterChange = useCallback((value: MuscleType | undefined) => {
    setSelectedPrimaryMuscle(value);
    if (!value) {
      return;
    }

    const nextBodyPart = getUniqueBodyPartForMuscle(value);
    if (nextBodyPart) {
      setSelectedBodyPart(nextBodyPart);
    }
  }, []);

  useEffect(() => {
    if (!exercisePickerVisible || !availableFilterOptions) {
      return;
    }

    if (
      selectedBodyPart !== undefined &&
      !availableFilterOptions.bodyParts.includes(selectedBodyPart)
    ) {
      setSelectedBodyPart(undefined);
    }

    if (
      selectedPrimaryMuscle !== undefined &&
      !availableFilterOptions.muscles.includes(selectedPrimaryMuscle)
    ) {
      setSelectedPrimaryMuscle(undefined);
    }

    if (
      selectedEquipment !== undefined &&
      !availableFilterOptions.equipment.includes(selectedEquipment)
    ) {
      setSelectedEquipment(undefined);
    }
  }, [
    availableFilterOptions,
    exercisePickerVisible,
    selectedBodyPart,
    selectedEquipment,
    selectedPrimaryMuscle,
  ]);

  const effectiveAvailableFilterOptions = useMemo(
    () =>
      availableFilterOptions ?? {
        bodyParts: [...BODY_PART_VALUES],
        muscles: [...MUSCLE_VALUES],
        equipment: [...EQUIPMENT_VALUES],
      },
    [availableFilterOptions],
  );

  const openProgrammingEditor = useCallback((
    sessionExerciseId: string,
    entry?: DraftSessionExercise,
  ) => {
    const nextDraft = entry
      ? createProgrammingDraftFromExercise(entry)
      : createProgrammingDraft();
    setEditingSessionExerciseId(sessionExerciseId);
    setProgrammingDraft(nextDraft);
    setInitialProgrammingDraft(nextDraft);
    setProgrammingFormMountKey((key) => key + 1);
    setProgrammingEditorVisible(true);
  }, []);

  const hasUnsavedProgrammingChanges = useMemo(
    () => !areProgrammingDraftsEqual(programmingDraft, initialProgrammingDraft),
    [initialProgrammingDraft, programmingDraft],
  );

  const closeProgrammingEditor = useCallback(() => {
    const nextDraft = createProgrammingDraft();
    setShowDiscardProgrammingModal(false);
    setEditingSessionExerciseId(null);
    setProgrammingDraft(nextDraft);
    setInitialProgrammingDraft(nextDraft);
    setProgrammingFormMountKey((key) => key + 1);
    setProgrammingEditorVisible(false);
  }, []);

  const closeExercisePicker = useCallback(() => {
    staleExercisesRef.current = [];
    setSearchText("");
    setSelectedBodyPart(undefined);
    setSelectedEquipment(undefined);
    setSelectedPrimaryMuscle(undefined);
    setSourceFilter("all");
    setReplaceSessionExerciseId(null);
    setExercisePickerVisible(false);
  }, []);

  const requestCloseProgrammingEditor = useCallback(() => {
    if (hasUnsavedProgrammingChanges) {
      setShowDiscardProgrammingModal(true);
      return;
    }

    closeProgrammingEditor();
  }, [closeProgrammingEditor, hasUnsavedProgrammingChanges]);

  function handleBackPress() {
    if (isDraftMode) {
      router.replace({
        pathname: "/(workout)/routine-editor",
        params: { routineId: "new" },
      });
      return;
    }

    if (routineIdParam) {
      router.replace({
        pathname: "/(workout)/routine-editor",
        params: { routineId: routineIdParam },
      });
      return;
    }

    router.replace("/(workout)/routines");
  }

  const currentExercises = useMemo(
    () => selectedDraftSession?.exercises ?? [],
    [selectedDraftSession?.exercises],
  );
  const isAtExerciseLimit = currentExercises.length >= MAX_EXERCISES_PER_SESSION;
  const sortedCurrentExercises = useMemo(
    () => [...currentExercises].sort((a, b) => a.order - b.order),
    [currentExercises],
  );
  const resolveExerciseKey = useCallback(
    (entry: (typeof sortedCurrentExercises)[number]) => entry.key,
    [],
  );
  const exerciseByKey = useMemo(
    () =>
      new Map(
        sortedCurrentExercises.map((entry) => [resolveExerciseKey(entry), entry] as const),
      ),
    [resolveExerciseKey, sortedCurrentExercises],
  );
  const exerciseListData = useMemo(
    () =>
      exerciseOrderKeys
        .map((key) => {
          const entry = exerciseByKey.get(key);
          return entry ? { key, entry } : null;
        })
        .filter(
          (
            item,
          ): item is { key: string; entry: (typeof sortedCurrentExercises)[number] } =>
            Boolean(item),
        ),
    [exerciseByKey, exerciseOrderKeys],
  );

  useEffect(() => {
    setExerciseOrderKeys(sortedCurrentExercises.map((entry) => resolveExerciseKey(entry)));
  }, [resolveExerciseKey, sortedCurrentExercises]);

  const applyExerciseOrder = useCallback((orderedKeys: string[]) => {
    if (!selectedDraftSession) {
      return;
    }

    reorderDraftExercises(selectedDraftSession.key, orderedKeys);
  }, [reorderDraftExercises, selectedDraftSession]);

  const handleExerciseDragEnd = useCallback(
    ({ data }: DragEndParams<{ key: string; entry: (typeof sortedCurrentExercises)[number] }>) => {
      const orderedKeys = data.map((item) => item.key);
      setExerciseOrderKeys(orderedKeys);
      applyExerciseOrder(orderedKeys);
    },
    [applyExerciseOrder],
  );

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
          gap: theme.tokens.spacing.sm,
          shadowColor: "transparent",
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        },
        exerciseCell: {
          paddingBottom: theme.tokens.spacing.md,
        },
        exerciseRowActive: {
          borderColor: theme.colors.borderAccent,
          backgroundColor: theme.colors.accentSoft,
        },
        exerciseRowTop: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.tokens.spacing.sm,
        },
        exerciseTitleBlock: {
          flex: 1,
          gap: theme.tokens.spacing.xxs,
        },
        dragHandle: {
          width: 36,
          height: 36,
          borderRadius: theme.tokens.radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.accentSoft,
          borderWidth: 1,
          borderColor: theme.colors.borderAccent,
          flexShrink: 0,
        },
        dragHandleActive: {
          backgroundColor: theme.colors.accent,
          borderColor: theme.colors.accent,
        },
        sessionActions: {
          flexDirection: "row",
          gap: theme.tokens.spacing.xs + 1,
          alignItems: "center",
          flexWrap: "wrap",
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
        pickerSearchArea: {
          gap: theme.tokens.spacing.sm,
          marginBottom: theme.tokens.spacing.sm,
        },
        sourceFilterRow: {
          flexDirection: "row",
          gap: theme.tokens.spacing.xs,
          flexWrap: "wrap",
        },
        sourceFilterPill: {
          backgroundColor: theme.colors.secondarySoft,
          borderRadius: theme.tokens.radius.pill,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xs + 1,
        },
        sourceFilterPillActive: {
          backgroundColor: theme.colors.accentSoft,
          borderColor: theme.colors.borderAccent,
        },
        sourceFilterText: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        sourceFilterTextActive: {
          color: theme.colors.accent,
        },
        pickerLoading: {
          paddingVertical: theme.tokens.spacing["2xl"],
          alignItems: "center",
        },
        pickerEmptyText: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          textAlign: "center",
          paddingVertical: theme.tokens.spacing.lg,
        },
        pickerStickyFooter: {
          flexDirection: "column",
          gap: theme.tokens.spacing.xs,
          paddingTop: theme.tokens.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderSoft,
        },
      }),
    [theme],
  );

  const renderExerciseItem = useCallback(
    ({
      item,
      drag,
      isActive,
    }: RenderItemParams<{ key: string; entry: (typeof sortedCurrentExercises)[number] }>) => {
      const { entry, key: exerciseKey } = item;

      return (
        <View
          renderToHardwareTextureAndroid={isActive}
          shouldRasterizeIOS={isActive}
          style={styles.exerciseCell}
        >
          <AppCard
            style={[styles.exerciseRow, isActive && styles.exerciseRowActive]}
            variant="default"
          >
            <View style={styles.exerciseRowTop}>
              <View style={styles.exerciseTitleBlock}>
                <Text style={styles.sectionName}>{entry.exercise.name}</Text>
                <Text style={styles.sectionMeta}>{formatProgrammingSummary(entry)}</Text>
                <Text style={styles.sectionMeta}>
                  {renderMuscleLabel(entry.exercise.bodyPart)} •{" "}
                  {renderMuscleLabel(entry.exercise.primaryMuscle)} •{" "}
                  {renderMuscleLabel(entry.exercise.equipment)}
                </Text>
                {entry.notes ? <Text style={styles.sectionMeta}>{entry.notes}</Text> : null}
              </View>
              <PressableScale
                accessibilityHint="Long press and drag to reorder this exercise"
                accessibilityLabel={`Reorder ${entry.exercise.name}`}
                hitSlop={12}
                onPressIn={() => {
                  drag();
                }}
                pressedOpacity={1}
                pressedScale={0.97}
                style={[styles.dragHandle, isActive && styles.dragHandleActive]}
              >
                <Ionicons
                  color={isActive ? theme.colors.onPrimary : theme.colors.accent}
                  name="reorder-four-outline"
                  size={18}
                />
              </PressableScale>
            </View>

            <View style={styles.sessionActions}>
              <AppButton
                accessibilityLabel={`Program ${entry.exercise.name}`}
                icon={<Ionicons color={theme.colors.text} name="options-outline" size={16} />}
                label="Program"
                onPress={() => {
                  openProgrammingEditor(exerciseKey, entry);
                }}
                size="sm"
                variant="secondary"
              />
              <AppButton
                accessibilityLabel={`Replace ${entry.exercise.name}`}
                icon={<Ionicons color={theme.colors.text} name="swap-horizontal-outline" size={16} />}
                label="Replace"
                onPress={() => {
                  setReplaceSessionExerciseId(exerciseKey);
                  setExercisePickerVisible(true);
                }}
                size="sm"
                variant="secondary"
              />
              <AppButton
                accessibilityLabel={`Delete ${entry.exercise.name}`}
                icon={<Ionicons color={theme.colors.error} name="trash-outline" size={16} />}
                onPress={() => {
                  if (!selectedDraftSession) {
                    return;
                  }

                  removeDraftExercise(selectedDraftSession.key, exerciseKey);
                }}
                size="sm"
                variant="danger"
              />
            </View>
          </AppCard>
        </View>
      );
    },
    [
      openProgrammingEditor,
      removeDraftExercise,
      selectedDraftSession,
      styles,
      theme.colors.accent,
      theme.colors.error,
      theme.colors.onPrimary,
      theme.colors.text,
    ],
  );

  if (!isDraftMode && selectedRoutine === undefined) {
    return (
      <WorkoutPage
        headerAction={<HeaderBackButton onPress={handleBackPress} />}
        headerActionPosition="left"
        headerChip={{ icon: "create-outline", label: "Section" }}
        title={null}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Syncing...</Text>
        </View>
      </WorkoutPage>
    );
  }

  if (!isDraftMode && selectedRoutine === null) {
    return (
      <WorkoutPage
        headerAction={<HeaderBackButton onPress={handleBackPress} />}
        headerActionPosition="left"
        headerChip={{ icon: "create-outline", label: "Section" }}
        title={null}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Leaving editor…</Text>
        </View>
      </WorkoutPage>
    );
  }

  if (
    (isDraftMode && !selectedDraftSession) ||
    (!isDraftMode && selectedRoutine && selectedSession && !selectedDraftSession) ||
    (!isDraftMode && (!selectedRoutine || !selectedSession))
  ) {
    return (
      <WorkoutPage
        headerAction={<HeaderBackButton onPress={handleBackPress} />}
        headerActionPosition="left"
        headerChip={{ icon: "create-outline", label: "Section" }}
        title={null}
      >
        <Text style={styles.helperText}>Section not found.</Text>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      headerAction={<HeaderBackButton onPress={handleBackPress} />}
      headerActionPosition="left"
      headerChip={{ icon: "create-outline", label: "Section" }}
      scrollComponent={NestableScrollContainer}
      title={null}
    >
      <Text style={styles.fieldLabel}>Section name</Text>
      <TextInput
        style={styles.input}
        value={selectedDraftSession?.name ?? selectedSession?.name ?? ""}
        onChangeText={(value) => {
          if (selectedDraftSession) {
            updateDraftSessionName(selectedDraftSession.key, value);
          }
        }}
        placeholder="Section name"
        placeholderTextColor={theme.colors.textSubtle}
      />

      <View style={styles.subHeaderRow}>
        <Text style={styles.subHeader}>Exercises</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            if (isAtExerciseLimit) {
              showAlert({
                title: "Exercise limit reached",
                message: `Sections can have at most ${MAX_EXERCISES_PER_SESSION} exercises.`,
                variant: "info",
              });
              return;
            }
            setReplaceSessionExerciseId(null);
            setExercisePickerVisible(true);
          }}
        >
          <Text style={styles.primaryButtonText}>Add exercise</Text>
        </Pressable>
      </View>

      {isAtExerciseLimit ? (
        <Text style={styles.helperText}>
          {`Exercise limit reached. Each section supports up to ${MAX_EXERCISES_PER_SESSION} exercises.`}
        </Text>
      ) : null}

      {exerciseListData.length > 0 ? (
        <NestableDraggableFlatList
          activateAfterLongPress={220}
          containerStyle={{ flexGrow: 0 }}
          data={exerciseListData}
          keyExtractor={(item) => item.key}
          onDragBegin={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          }}
          onDragEnd={handleExerciseDragEnd}
          renderItem={renderExerciseItem}
          scrollEnabled={false}
        />
      ) : (
        <Text style={styles.helperText}>No exercises yet. Add one to start this section.</Text>
      )}

      <Modal
        visible={exercisePickerVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeExercisePicker}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Exercise catalog</Text>
              <Pressable
                onPress={closeExercisePicker}
              >
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.pickerSearchArea}>
              <TextInput
                style={styles.input}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search exercises by name..."
                placeholderTextColor={theme.colors.textSubtle}
              />

              <ExerciseFilterRow
                availableBodyParts={effectiveAvailableFilterOptions.bodyParts}
                availableEquipment={effectiveAvailableFilterOptions.equipment}
                availablePrimaryMuscles={effectiveAvailableFilterOptions.muscles}
                bodyPart={selectedBodyPart}
                equipment={selectedEquipment}
                primaryMuscle={selectedPrimaryMuscle}
                onBodyPartChange={handleBodyPartFilterChange}
                onEquipmentChange={handleEquipmentFilterChange}
                onPrimaryMuscleChange={handlePrimaryMuscleFilterChange}
              />
              <View style={styles.sourceFilterRow}>
                {(
                  [
                    { value: "all", label: "All" },
                    { value: "preset", label: "Preset" },
                    { value: "custom", label: "Custom" },
                  ] as const
                ).map((option) => {
                  const isActive = sourceFilter === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.sourceFilterPill,
                        isActive && styles.sourceFilterPillActive,
                      ]}
                      onPress={() => {
                        setSourceFilter(option.value);
                      }}
                    >
                      <Text
                        style={[
                          styles.sourceFilterText,
                          isActive && styles.sourceFilterTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {isExercisesFirstLoad ? (
              <View style={styles.pickerLoading}>
                <ActivityIndicator color={theme.colors.textMuted} />
              </View>
            ) : (
              <FlatList
                data={exercises}
                keyExtractor={(item) => String(item._id)}
                contentContainerStyle={styles.sheetContent}
                ListEmptyComponent={
                  <Text style={styles.pickerEmptyText}>No exercises match your search.</Text>
                }
                renderItem={({ item: exercise }) => (
                  <Pressable
                    style={styles.libraryRow}
                    onPress={() => {
                      if (replaceSessionExerciseId === null && isAtExerciseLimit) {
                        showAlert({
                          title: "Exercise limit reached",
                          message: `Sections can have at most ${MAX_EXERCISES_PER_SESSION} exercises.`,
                          variant: "info",
                        });
                        return;
                      }

                      if (!selectedDraftSession) {
                        return;
                      }

                      const currentEntry =
                        replaceSessionExerciseId !== null
                          ? selectedDraftSession.exercises.find(
                              (entry) => entry.key === replaceSessionExerciseId,
                            )
                          : undefined;

                      const sessionExerciseId = addOrReplaceExercise(
                        selectedDraftSession.key,
                        exercise,
                        undefined,
                        replaceSessionExerciseId ?? undefined,
                      );

                      if (!sessionExerciseId) {
                        return;
                      }

                      if (replaceSessionExerciseId === null && analyticsSessionId) {
                        captureAnalyticsEvent("session_exercise_added", {
                          routine_id: analyticsRoutineId,
                          session_id: analyticsSessionId,
                          source: exercise.isCustom ? "custom" : "catalog",
                          body_part: exercise.bodyPart,
                          equipment: exercise.equipment,
                        });
                      }

                      closeExercisePicker();
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
                )}
              />
            )}

            <View style={styles.pickerStickyFooter}>
              <AppButton
                fullWidth
                label="Create custom exercise"
                icon={<Ionicons name="add-circle-outline" size={16} color={theme.colors.text} />}
                variant="secondary"
                size="sm"
                onPress={() => {
                  closeExercisePicker();
                  router.push({
                    pathname: "/(workout)/custom-exercise",
                    params: {
                      routineId: routineIdParam,
                      draftSessionKey: selectedDraftSession?.key ?? draftSessionKey,
                      ...(replaceSessionExerciseId
                        ? { replaceSessionExerciseId }
                        : {}),
                    },
                  });
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={programmingEditorVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={requestCloseProgrammingEditor}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={requestCloseProgrammingEditor}
          />
          <KeyboardAvoidingView
            style={styles.modalRoot}
            behavior={Platform.OS === "ios" ? "padding" : "position"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
            pointerEvents="box-none"
          >
            <View style={styles.modalCard}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Section programming</Text>
                <Pressable
                  onPress={requestCloseProgrammingEditor}
                >
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>

              <ScrollView
                ref={programmingEditorScrollRef}
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
              >
                <ExerciseProgrammingForm
                  key={programmingFormMountKey}
                  draft={programmingDraft}
                  onChange={setProgrammingDraft}
                  onNotesFocus={onProgrammingNotesFocus}
                />

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    if (!editingSessionExerciseId || !selectedDraftSession) {
                      return;
                    }

                    const normalizedProgramming = normalizeProgrammingDraftForSave(programmingDraft);

                    updateDraftExerciseProgramming(
                      selectedDraftSession.key,
                      editingSessionExerciseId,
                      normalizedProgramming,
                    );
                    if (analyticsSessionId) {
                      captureAnalyticsEvent("session_exercise_programming_saved", {
                        routine_id: analyticsRoutineId,
                        session_id: analyticsSessionId,
                        set_count: normalizedProgramming.sets,
                        has_load: normalizedProgramming.targetWeightKg !== undefined,
                      });
                    }

                    closeProgrammingEditor();
                  }}
                >
                  <Text style={styles.primaryButtonText}>Save programming</Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ConfirmActionModal
        visible={showDiscardProgrammingModal}
        title="Discard Programming Changes"
        message="Close this programming sheet and lose the changes you have not saved yet?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        confirmVariant="danger"
        onConfirm={closeProgrammingEditor}
        onCancel={() => {
          setShowDiscardProgrammingModal(false);
        }}
      />

      {AlertModal}
    </WorkoutPage>
  );
}
