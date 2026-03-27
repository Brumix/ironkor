import { api } from "@convex/_generated/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
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
  type BodyPartType,
  type EquipmentType,
  type MuscleType,
} from "@ironkor/shared/constants";
import { normalizeDisplayNameKey } from "@ironkor/shared/strings";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import ExerciseFilterRow from "@/components/ui/ExerciseFilterRow";
import HeaderBackButton from "@/components/ui/HeaderBackButton";
import PressableScale from "@/components/ui/PressableScale";
import { useAppAlert } from "@/components/ui/useAppAlert";
import ExerciseProgrammingForm from "@/components/workout/ExerciseProgrammingForm";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { useDraftRoutine } from "@/features/workout/DraftRoutineProvider";
import {
  createProgrammingDraft,
  formatProgrammingSummary,
  parseOptionalNumber,
  type ProgrammingSource,
} from "@/features/workout/programmingDraft";
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

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

function renderMuscleLabel(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type ExerciseSourceFilter = "all" | "preset" | "custom";


export default function SessionEditorScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert, AlertModal } = useAppAlert();
  const {
    draft,
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

  const upsertSession = useMutation(api.routines.upsertSession);
  const upsertSessionExercise = useMutation(api.routines.upsertSessionExercise);
  const updateSessionExerciseProgramming = useMutation(
    api.routines.updateSessionExerciseProgramming,
  );
  const deleteSessionExercise = useMutation(api.routines.deleteSessionExercise);
  const reorderSessionExercises = useMutation(api.routines.reorderSessionExercises);

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

  const selectedSession = useMemo(
    () =>
      selectedRoutine?.sessions.find((session) => String(session._id) === sessionIdParam) ??
      null,
    [selectedRoutine, sessionIdParam],
  );
  const selectedDraftSession = useMemo(
    () => draft?.sessions.find((session) => session.key === draftSessionKey) ?? null,
    [draft?.sessions, draftSessionKey],
  );

  const [sectionDraftName, setSectionDraftName] = useState("");
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

  const programmingEditorScrollRef = useRef<ScrollView | null>(null);

  const onProgrammingNotesFocus = useCallback(() => {
    scheduleScrollToEndForNotes(programmingEditorScrollRef);
  }, []);

  useEffect(() => {
    const nextSession = isDraftMode ? selectedDraftSession : selectedSession;
    if (!nextSession) {
      return;
    }

    setSectionDraftName(nextSession.name);
  }, [isDraftMode, selectedDraftSession, selectedSession]);

  const openProgrammingEditor = useCallback((
    sessionExerciseId: string,
    entry?: ProgrammingSource,
  ) => {
    setEditingSessionExerciseId(sessionExerciseId);
    setProgrammingDraft(createProgrammingDraft(entry));
    setProgrammingFormMountKey((key) => key + 1);
    setProgrammingEditorVisible(true);
  }, []);

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
    () => (isDraftMode ? selectedDraftSession?.exercises ?? [] : selectedSession?.exercises ?? []),
    [isDraftMode, selectedDraftSession?.exercises, selectedSession?.exercises],
  );
  const sortedCurrentExercises = useMemo(
    () => [...currentExercises].sort((a, b) => a.order - b.order),
    [currentExercises],
  );
  const resolveExerciseKey = useCallback(
    (entry: (typeof sortedCurrentExercises)[number]) =>
      "key" in entry ? entry.key : String(entry._id),
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

  const applyExerciseOrder = useCallback(
    async (orderedKeys: string[]) => {
      if (isDraftMode) {
        if (!selectedDraftSession) {
          return;
        }

        reorderDraftExercises(selectedDraftSession.key, orderedKeys);
        return;
      }

      if (!selectedSession) {
        return;
      }

      const idByKey = new Map(
        sortedCurrentExercises.map((entry) => [
          resolveExerciseKey(entry),
          "key" in entry ? null : entry._id,
        ]),
      );
      const orderedSessionExerciseIds = orderedKeys
        .map((key) => idByKey.get(key))
        .filter((id): id is Id<"sessionExercises"> => Boolean(id));

      if (orderedSessionExerciseIds.length !== sortedCurrentExercises.length) {
        return;
      }

      await reorderSessionExercises({
        sessionId: selectedSession._id,
        orderedSessionExerciseIds,
      });
    },
    [
      isDraftMode,
      reorderDraftExercises,
      reorderSessionExercises,
      resolveExerciseKey,
      selectedDraftSession,
      selectedSession,
      sortedCurrentExercises,
    ],
  );

  const handleExerciseDragEnd = useCallback(
    ({ data }: DragEndParams<{ key: string; entry: (typeof sortedCurrentExercises)[number] }>) => {
      const orderedKeys = data.map((item) => item.key);
      setExerciseOrderKeys(orderedKeys);
      applyExerciseOrder(orderedKeys).catch(() => {
        showAlert({ title: "Failed", message: "Could not reorder exercises.", variant: "error" });
        setExerciseOrderKeys(
          sortedCurrentExercises.map((entry) => resolveExerciseKey(entry)),
        );
      });
    },
    [applyExerciseOrder, resolveExerciseKey, showAlert, sortedCurrentExercises],
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
                  if (isDraftMode && selectedDraftSession) {
                    removeDraftExercise(selectedDraftSession.key, exerciseKey);
                    return;
                  }

                  if (!selectedSession || "key" in entry) {
                    return;
                  }

                  deleteSessionExercise({
                    sessionId: selectedSession._id,
                    sessionExerciseId: entry._id,
                  }).catch(() => {
                    showAlert({ title: "Failed", message: "Could not remove exercise.", variant: "error" });
                  });
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
      deleteSessionExercise,
      isDraftMode,
      openProgrammingEditor,
      removeDraftExercise,
      selectedDraftSession,
      selectedSession,
      showAlert,
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

  if (
    (isDraftMode && !selectedDraftSession) ||
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
        value={sectionDraftName}
        onChangeText={(value) => {
          setSectionDraftName(value);

          if (isDraftMode && selectedDraftSession) {
            updateDraftSessionName(selectedDraftSession.key, value);
          }
        }}
        placeholder="Section name"
        placeholderTextColor={theme.colors.textSubtle}
      />

      {!isDraftMode && selectedRoutine && selectedSession ? (
        <Pressable
          style={styles.primaryButton}
          onPress={async () => {
            const nextSectionName = sectionDraftName.trim() || selectedSession.name;
            const normalizedSectionName = normalizeDisplayNameKey(nextSectionName);
            const duplicateSection = selectedRoutine.sessions.some((session) => {
              if (session._id === selectedSession._id) {
                return false;
              }
              return normalizeDisplayNameKey(session.name) === normalizedSectionName;
            });

            if (duplicateSection) {
              showAlert({ title: "Duplicate section name", message: "This routine already has a section with this name.", variant: "warning" });
              return;
            }

            try {
              await upsertSession({
                routineId: selectedRoutine._id,
                sessionId: selectedSession._id,
                name: nextSectionName,
              });
            } catch (error) {
              showAlert({ title: "Failed", message: resolveErrorMessage(error, "Could not save section name."), variant: "error" });
            }
          }}
        >
          <Text style={styles.primaryButtonText}>Save section name</Text>
        </Pressable>
      ) : null}

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

            <View style={styles.pickerSearchArea}>
              <TextInput
                style={styles.input}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search exercises by name..."
                placeholderTextColor={theme.colors.textSubtle}
              />

              <ExerciseFilterRow
                bodyPart={selectedBodyPart}
                equipment={selectedEquipment}
                primaryMuscle={selectedPrimaryMuscle}
                onBodyPartChange={setSelectedBodyPart}
                onEquipmentChange={setSelectedEquipment}
                onPrimaryMuscleChange={setSelectedPrimaryMuscle}
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
                    onPress={async () => {
                      if (isDraftMode && selectedDraftSession) {
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

                        setReplaceSessionExerciseId(null);
                        setExercisePickerVisible(false);
                        openProgrammingEditor(sessionExerciseId, currentEntry);
                        return;
                      }

                      if (!selectedSession) {
                        return;
                      }

                      const currentEntry =
                        replaceSessionExerciseId !== null
                          ? selectedSession.exercises.find(
                              (entry) => String(entry._id) === replaceSessionExerciseId,
                            )
                          : undefined;

                      const sessionExerciseId = await upsertSessionExercise({
                        sessionId: selectedSession._id,
                        sessionExerciseId:
                          replaceSessionExerciseId !== null
                            ? (replaceSessionExerciseId as Id<"sessionExercises">)
                            : undefined,
                        exerciseId: exercise._id,
                      });

                      setReplaceSessionExerciseId(null);
                      setExercisePickerVisible(false);
                      openProgrammingEditor(String(sessionExerciseId), currentEntry);
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
                  setExercisePickerVisible(false);
                  router.push({
                    pathname: "/(workout)/custom-exercise",
                    params: {
                      routineId: routineIdParam,
                      ...(isDraftMode
                        ? { draftSessionKey }
                        : { sessionId: sessionIdParam }),
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
                  onPress={async () => {
                    if (!editingSessionExerciseId) {
                      return;
                    }

                    if (isDraftMode && selectedDraftSession) {
                      updateDraftExerciseProgramming(selectedDraftSession.key, editingSessionExerciseId, {
                        sets: Math.max(1, Math.floor(Number(programmingDraft.sets) || 3)),
                        repsText: programmingDraft.repsText.trim() || "8-12",
                        targetWeightKg: parseOptionalNumber(programmingDraft.targetWeightKg),
                        restSeconds: parseOptionalNumber(programmingDraft.restSeconds),
                        notes: programmingDraft.notes,
                        tempo: programmingDraft.tempo,
                        rir: parseOptionalNumber(programmingDraft.rir),
                      });
                    } else if (selectedSession) {
                      await updateSessionExerciseProgramming({
                        sessionId: selectedSession._id,
                        sessionExerciseId: editingSessionExerciseId as Id<"sessionExercises">,
                        sets: Math.max(1, Math.floor(Number(programmingDraft.sets) || 3)),
                        repsText: programmingDraft.repsText.trim() || "8-12",
                        targetWeightKg: parseOptionalNumber(programmingDraft.targetWeightKg),
                        restSeconds: parseOptionalNumber(programmingDraft.restSeconds),
                        notes: programmingDraft.notes,
                        tempo: programmingDraft.tempo,
                        rir: parseOptionalNumber(programmingDraft.rir),
                      });
                    }

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

      {AlertModal}
    </WorkoutPage>
  );
}
