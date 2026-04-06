import { api } from "@convex/_generated/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  type DragEndParams,
  type RenderItemParams,
} from "react-native-draggable-flatlist";

import { MAX_SESSIONS_PER_ROUTINE } from "@ironkor/shared/routines";
import { normalizeDisplayNameKey } from "@ironkor/shared/strings";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import HeaderBackButton from "@/components/ui/HeaderBackButton";
import InfoPopoverButton from "@/components/ui/InfoPopoverButton";
import PressableScale from "@/components/ui/PressableScale";
import SectionHeader from "@/components/ui/SectionHeader";
import { useAppAlert } from "@/components/ui/useAppAlert";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { useDraftRoutine } from "@/features/workout/DraftRoutineProvider";
import type { DraftRoutine, DraftWeeklyPlanEntry, RoutineDetailed } from "@/features/workout/types";
import { useTheme } from "@/theme";

import type { Id } from "@convex/_generated/dataModel";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface SessionOption {
  key: string;
  name: string;
  order: number;
  exerciseCount: number;
  persistedId?: Id<"routineSessions">;
}

interface SessionRowStyles {
  sessionActions: StyleProp<ViewStyle>;
  sessionCell: StyleProp<ViewStyle>;
  sessionHeader: StyleProp<ViewStyle>;
  sessionMeta: StyleProp<TextStyle>;
  sessionName: StyleProp<TextStyle>;
  sessionRow: StyleProp<ViewStyle>;
  sessionRowActive: StyleProp<ViewStyle>;
  sessionTitleBlock: StyleProp<ViewStyle>;
  dragHandle: StyleProp<ViewStyle>;
  dragHandleActive: StyleProp<ViewStyle>;
}

interface RoutineSessionRowProps {
  accentColor: string;
  drag: () => void;
  errorColor: string;
  isDragging: boolean;
  item: SessionOption;
  onDeleteSession: (session: SessionOption) => void;
  onOpenSession: (session: SessionOption) => void;
  onPrimaryColor: string;
  styles: SessionRowStyles;
  textColor: string;
}

const RoutineSessionRow = memo(function RoutineSessionRow({
  accentColor,
  drag,
  errorColor,
  isDragging,
  item,
  onDeleteSession,
  onOpenSession,
  onPrimaryColor,
  styles,
  textColor,
}: RoutineSessionRowProps) {
  return (
    <View
      renderToHardwareTextureAndroid={isDragging}
      shouldRasterizeIOS={isDragging}
      style={styles.sessionCell}
    >
      <AppCard
        style={[styles.sessionRow, isDragging && styles.sessionRowActive]}
        variant={item.persistedId ? "default" : "highlight"}
      >
        <View style={styles.sessionHeader}>
          <View style={styles.sessionTitleBlock}>
            <Text style={styles.sessionName}>{item.name}</Text>
            <Text style={styles.sessionMeta}>
              {item.exerciseCount} {item.exerciseCount === 1 ? "exercise" : "exercises"}
            </Text>
          </View>
          <PressableScale
            accessibilityHint="Long press and drag to reorder this section"
            accessibilityLabel={`Reorder ${item.name}`}
            hitSlop={12}
            onPressIn={() => {
              drag();
            }}
            pressedOpacity={1}
            pressedScale={0.97}
            style={[styles.dragHandle, isDragging && styles.dragHandleActive]}
          >
            <Ionicons
              color={isDragging ? onPrimaryColor : accentColor}
              name="reorder-four-outline"
              size={18}
            />
          </PressableScale>
        </View>

        <View style={styles.sessionActions}>
          <AppButton
            accessibilityLabel={`Edit ${item.name}`}
            icon={<Ionicons color={textColor} name="create-outline" size={16} />}
            label="Edit"
            onPress={() => {
              onOpenSession(item);
            }}
            size="sm"
            variant="secondary"
          />
          <AppButton
            accessibilityLabel={`Delete ${item.name}`}
            icon={<Ionicons color={errorColor} name="trash-outline" size={16} />}
            label="Delete"
            onPress={() => {
              onDeleteSession(item);
            }}
            size="sm"
            variant="danger"
          />
        </View>
      </AppCard>
    </View>
  );
});

function sortPlanner(entries: DraftWeeklyPlanEntry[]) {
  return [...entries].sort((a, b) => a.day - b.day);
}

function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

function hasDuplicateDisplayNames(names: string[]) {
  const normalizedNames = names
    .map((name) => normalizeDisplayNameKey(name))
    .filter((name) => name.length > 0);
  return new Set(normalizedNames).size !== normalizedNames.length;
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

function reorderSessionOptionsByIndex(
  sessions: SessionOption[],
  from: number,
  to: number,
) {
  if (from === to || from < 0 || to < 0 || from >= sessions.length || to >= sessions.length) {
    return sessions;
  }

  const reordered = [...sessions];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered;
}

function arePlannerEntriesEqual(left: DraftWeeklyPlanEntry[], right: DraftWeeklyPlanEntry[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((entry, index) =>
    entry.day === right[index]?.day && entry.type === right[index]?.type,
  );
}

function buildSessionSnapshot(sessions: SessionOption[]) {
  return sessions.map((session, index) => ({
    id: session.persistedId ? String(session.persistedId) : `local:${session.key}`,
    name: session.name,
    order: index,
  }));
}

function areSessionSnapshotsEqual(
  left: ReturnType<typeof buildSessionSnapshot>,
  right: ReturnType<typeof buildSessionSnapshot>,
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((session, index) =>
    session.id === right[index]?.id &&
    session.name === right[index]?.name &&
    session.order === right[index]?.order,
  );
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function RoutineEditorScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert, AlertModal } = useAppAlert();
  const {
    draft,
    hasChanges,
    ensureDraft,
    clearDraft,
    setRoutineName: setDraftRoutineName,
    setWeeklyPlan,
    addSession,
    reorderSessions: reorderDraftSessions,
    removeSession: removeDraftSession,
  } = useDraftRoutine();

  const routineSummariesData = useQuery(api.routines.listSummaries, { limit: 100 });

  const createRoutine = useMutation(api.routines.create);
  const updateRoutine = useMutation(api.routines.update);
  const upsertSession = useMutation(api.routines.upsertSession);
  const deleteSession = useMutation(api.routines.deleteSession);
  const reorderPersistedSessions = useMutation(api.routines.reorderSessions);
  const upsertSessionExercise = useMutation(api.routines.upsertSessionExercise);
  const updateWeeklyPlan = useMutation(api.routines.updateWeeklyPlan);

  const routineIdParam = typeof params.routineId === "string" ? params.routineId : "new";
  const isNew = routineIdParam === "new";
  const selectedRoutine = useQuery(
    api.routines.getDetailedById,
    !isNew ? { routineId: routineIdParam as Id<"routines"> } : "skip",
  );
  const routines = useMemo(() => routineSummariesData ?? [], [routineSummariesData]);

  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [plannerDraft, setPlannerDraft] = useState<DraftWeeklyPlanEntry[]>([]);
  const [sessionListData, setSessionListData] = useState<SessionOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingSessionKey, setDraggingSessionKey] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [sessionPendingDelete, setSessionPendingDelete] = useState<SessionOption | null>(null);
  const draftRef = useRef(draft);
  const dragStartIndexRef = useRef<number | null>(null);
  const placeholderIndexRef = useRef<number | null>(null);
  const localSessionCounterRef = useRef(0);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useLayoutEffect(() => {
    if (!isNew && selectedRoutine === null) {
      router.replace("/(workout)/routines");
    }
  }, [isNew, router, selectedRoutine]);

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

  const resetExistingRoutineUi = useCallback(() => {
    setHydratedFor(null);
    setRoutineName("");
    setNewSessionName("");
    setPlannerDraft([]);
    setSessionListData([]);
    setDraggingSessionKey(null);
    dragStartIndexRef.current = null;
    placeholderIndexRef.current = null;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isNew && !draftRef.current) {
        resetNewRoutineUi();
        ensureDraft();
      }
    }, [ensureDraft, isNew, resetNewRoutineUi]),
  );

  const sourceSessionOptions = useMemo<SessionOption[]>(() => {
    if (isNew) {
      return sortByOrder(draft?.sessions ?? []).map((session: DraftRoutine["sessions"][number]) => ({
        key: session.key,
        name: session.name,
        order: session.order,
        exerciseCount: session.exercises.length,
      }));
    }

    return sortByOrder(selectedRoutine?.sessions ?? []).map((session) => ({
      key: String(session._id),
      name: session.name,
      order: session.order,
      exerciseCount: session.exercises.length,
      persistedId: session._id,
    }));
  }, [draft?.sessions, isNew, selectedRoutine?.sessions]);

  useEffect(() => {
    if (routineSummariesData === undefined || (!isNew && selectedRoutine === undefined)) {
      return;
    }

    if (isNew || !selectedRoutine) {
      return;
    }

    const currentId = String(selectedRoutine._id);
    if (hydratedFor === currentId) {
      return;
    }

    setRoutineName(selectedRoutine.name);
    setPlannerDraft(
      sortPlanner(
        selectedRoutine.weeklyPlan.map((entry: RoutineDetailed["weeklyPlan"][number]) => ({
          day: entry.day,
          type: entry.type,
        })),
      ),
    );
    setSessionListData(sourceSessionOptions);
    setHydratedFor(currentId);
  }, [
    hydratedFor,
    isNew,
    routineSummariesData,
    selectedRoutine,
    sourceSessionOptions,
  ]);

  useEffect(() => {
    if (isNew) {
      setSessionListData(sourceSessionOptions);
    }
  }, [isNew, sourceSessionOptions]);

  const routineNameValue = isNew ? draft?.name ?? "" : routineName;
  const plannerEntries = isNew ? sortPlanner(draft?.weeklyPlan ?? []) : sortPlanner(plannerDraft);
  const canAddSession = newSessionName.trim().length > 0;
  const isAtSessionLimit = sessionListData.length >= MAX_SESSIONS_PER_ROUTINE;
  const persistedPlannerEntries = useMemo(
    () =>
      sortPlanner(
        selectedRoutine?.weeklyPlan.map((entry: RoutineDetailed["weeklyPlan"][number]) => ({
          day: entry.day,
          type: entry.type,
        })) ?? [],
      ),
    [selectedRoutine?.weeklyPlan],
  );
  const persistedSessionSnapshot = useMemo(
    () =>
      buildSessionSnapshot(
        sortByOrder(selectedRoutine?.sessions ?? []).map((session) => ({
          key: String(session._id),
          name: session.name,
          order: session.order,
          exerciseCount: session.exercises.length,
          persistedId: session._id,
        })),
      ),
    [selectedRoutine?.sessions],
  );
  const currentSessionSnapshot = useMemo(
    () => buildSessionSnapshot(sessionListData),
    [sessionListData],
  );
  const hasExistingRoutineChanges = useMemo(() => {
    if (isNew || !selectedRoutine) {
      return false;
    }

    return (
      routineNameValue !== selectedRoutine.name ||
      !arePlannerEntriesEqual(plannerEntries, persistedPlannerEntries) ||
      !areSessionSnapshotsEqual(currentSessionSnapshot, persistedSessionSnapshot)
    );
  }, [
    currentSessionSnapshot,
    isNew,
    persistedPlannerEntries,
    persistedSessionSnapshot,
    plannerEntries,
    routineNameValue,
    selectedRoutine,
  ]);
  const hasPageChanges = isNew ? hasChanges : hasExistingRoutineChanges;
  const shouldShowSaveAction = hasPageChanges || isSaving;

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
      if (hasPageChanges) {
        setShowDiscardModal(true);
        return;
      }

      clearNewRoutineDraft();
    } else {
      if (hasPageChanges) {
        setShowDiscardModal(true);
        return;
      }

      resetExistingRoutineUi();
    }

    navigateToRoutines();
  }

  function confirmDiscardChanges() {
    if (isNew) {
      clearNewRoutineDraft();
    } else {
      resetExistingRoutineUi();
    }

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

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async function handleSaveRoutine() {
    if (isSaving) {
      return;
    }

    const name = routineNameValue.trim() || "Untitled routine";
    const trainingDays = plannerEntries.filter((entry) => entry.type === "train").length;
    const normalizedRoutineName = normalizeDisplayNameKey(name);

    const duplicateRoutine = routines.some((routine: (typeof routines)[number]) => {
      if (routine._id === selectedRoutine?._id) {
        return false;
      }
      return normalizeDisplayNameKey(routine.name) === normalizedRoutineName;
    });
    if (duplicateRoutine) {
      showAlert({ title: "Duplicate routine name", message: "A routine with this name already exists.", variant: "warning" });
      return;
    }

    if (hasDuplicateDisplayNames(sessionListData.map((session) => session.name))) {
      showAlert({ title: "Duplicate section name", message: "This routine already has a section with this name.", variant: "warning" });
      return;
    }

    if (sessionListData.length > MAX_SESSIONS_PER_ROUTINE) {
      showAlert({
        title: "Too many sections",
        message: `Routines can have at most ${MAX_SESSIONS_PER_ROUTINE} sections.`,
        variant: "warning",
      });
      return;
    }

    setIsSaving(true);

    try {
      if (selectedRoutine) {
        const currentPersistedSessionIds = new Set(
          selectedRoutine.sessions.map((session) => String(session._id)),
        );
        const nextPersistedSessionIds = new Set(
          sessionListData
            .map((session) => session.persistedId)
            .filter((sessionId): sessionId is Id<"routineSessions"> => Boolean(sessionId))
            .map((sessionId) => String(sessionId)),
        );

        await updateRoutine({
          routineId: selectedRoutine._id,
          name,
        });

        await updateWeeklyPlan({
          routineId: selectedRoutine._id,
          weeklyPlan: buildWeeklyPlanPayload(),
        });

        for (const session of selectedRoutine.sessions) {
          if (!nextPersistedSessionIds.has(String(session._id))) {
            await deleteSession({
              routineId: selectedRoutine._id,
              sessionId: session._id,
            });
          }
        }

        const createdSessionIdByKey = new Map<string, Id<"routineSessions">>();
        for (const session of sessionListData) {
          if (!session.persistedId) {
            const sessionId = await upsertSession({
              routineId: selectedRoutine._id,
              name: session.name,
            });
            createdSessionIdByKey.set(session.key, sessionId);
          }
        }

        const orderedSessionIds = sessionListData
          .map((session) => session.persistedId ?? createdSessionIdByKey.get(session.key))
          .filter((sessionId): sessionId is Id<"routineSessions"> => Boolean(sessionId));

        if (
          orderedSessionIds.length > 0 ||
          currentPersistedSessionIds.size > 0
        ) {
          await reorderPersistedSessions({
            routineId: selectedRoutine._id,
            orderedSessionIds,
          });
        }

        resetExistingRoutineUi();
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
    } catch (error) {
      showAlert({
        title: "Failed",
        message: resolveErrorMessage(
          error,
          selectedRoutine ? "Could not save routine changes." : "Could not create routine.",
        ),
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddSession() {
    const name = newSessionName.trim();
    if (!name) {
      return;
    }

    if (isAtSessionLimit) {
      showAlert({
        title: "Section limit reached",
        message: `Routines can have at most ${MAX_SESSIONS_PER_ROUTINE} sections.`,
        variant: "info",
      });
      return;
    }

    const normalizedSessionName = normalizeDisplayNameKey(name);
    const duplicateSession = sessionListData.some(
      (session) => normalizeDisplayNameKey(session.name) === normalizedSessionName,
    );
    if (duplicateSession) {
      showAlert({ title: "Duplicate section name", message: "This routine already has a section with this name.", variant: "warning" });
      return;
    }

    Keyboard.dismiss();

    if (isNew) {
      addSession(name);
      setNewSessionName("");
      return;
    }

    const nextSessionKey = `local-session-${localSessionCounterRef.current}`;
    localSessionCounterRef.current += 1;
    setSessionListData((current) => [
      ...current,
      {
        key: nextSessionKey,
        name,
        order: current.length,
        exerciseCount: 0,
      },
    ]);
    setNewSessionName("");
  }

  function handleSessionDragEnd({ data }: DragEndParams<SessionOption>) {
    setSessionListData(data);
    setDraggingSessionKey(null);
    dragStartIndexRef.current = null;
    placeholderIndexRef.current = null;

    if (isNew) {
      reorderDraftSessions(data.map((session) => session.key));
    }
  }

  function handleSessionRelease() {
    const from = dragStartIndexRef.current;
    const to = placeholderIndexRef.current;

    setDraggingSessionKey(null);

    if (from === null || to === null || from === to) {
      return;
    }

    const reorderedData = reorderSessionOptionsByIndex(sessionListData, from, to);
    setSessionListData(reorderedData);

    if (isNew) {
      reorderDraftSessions(reorderedData.map((session) => session.key));
    }
  }

  const requestDeleteSession = useCallback((session: SessionOption) => {
    setSessionPendingDelete(session);
  }, []);

  const confirmDeleteSession = useCallback(() => {
    if (!sessionPendingDelete) {
      return;
    }
    const session = sessionPendingDelete;
    setSessionPendingDelete(null);
    if (isNew) {
      removeDraftSession(session.key);
      return;
    }

    setSessionListData((current) => current.filter((entry) => entry.key !== session.key));
  }, [isNew, removeDraftSession, sessionPendingDelete]);

  const closeDeleteSessionModal = useCallback(() => {
    setSessionPendingDelete(null);
  }, []);

  const openSessionEditor = useCallback((session: SessionOption) => {
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

    if (!isNew) {
      showAlert({ title: "Save first", message: "Save the routine before editing exercises for a new section.", variant: "info" });
      return;
    }

    router.push({
      pathname: "/(workout)/session-editor",
      params: {
        routineId: "new",
        draftSessionKey: session.key,
      },
    });
  }, [isNew, router, selectedRoutine, showAlert]);

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
        sessionCell: {
          paddingBottom: theme.tokens.spacing.md,
        },
        sectionNameInput: {
          minWidth: 120,
          maxWidth: 156,
          paddingVertical: theme.tokens.spacing.sm - 1,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
        sessionRow: {
          gap: theme.tokens.spacing.xs + 2,
          shadowColor: "transparent",
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
          padding: theme.tokens.spacing.md,
        },
        sessionRowActive: {
          borderColor: theme.colors.borderAccent,
          backgroundColor: theme.colors.accentSoft,
        },
        sessionHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: theme.tokens.spacing.sm,
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
        sessionTitleBlock: {
          flex: 1,
          gap: theme.tokens.spacing.xxs,
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
          gap: theme.tokens.spacing.xs,
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
        headerSaveButton: {
          alignSelf: "flex-start",
          minHeight: 0,
          borderRadius: theme.tokens.radius.pill,
          borderWidth: 1,
          borderColor: theme.colors.primary,
          backgroundColor: theme.colors.primary,
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xs,
          justifyContent: "center",
          alignItems: "center",
        },
        headerSaveButtonText: {
          color: theme.colors.onPrimary,
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
        },
      }),
    [theme],
  );

  const saveAction = shouldShowSaveAction ? (
    <PressableScale
      accessibilityLabel={selectedRoutine ? "Save routine changes" : "Save routine"}
      accessibilityRole="button"
      disabled={isSaving}
      onPress={() => {
        void handleSaveRoutine();
      }}
      pressedOpacity={0.95}
      pressedScale={0.98}
      style={styles.headerSaveButton}
    >
      {isSaving ? (
        <ActivityIndicator color={theme.colors.onPrimary} size="small" />
      ) : (
        <Text style={styles.headerSaveButtonText}>
          {selectedRoutine ? "Save changes" : "Save routine"}
        </Text>
      )}
    </PressableScale>
  ) : null;

  const renderSessionItem = useCallback(({ item, drag }: RenderItemParams<SessionOption>) => (
    <RoutineSessionRow
      accentColor={theme.colors.accent}
      drag={drag}
      errorColor={theme.colors.error}
      isDragging={draggingSessionKey === item.key}
      item={item}
      onDeleteSession={requestDeleteSession}
      onOpenSession={openSessionEditor}
      onPrimaryColor={theme.colors.onPrimary}
      styles={styles}
      textColor={theme.colors.text}
    />
  ), [
    draggingSessionKey,
    requestDeleteSession,
    openSessionEditor,
    styles,
    theme.colors.accent,
    theme.colors.error,
    theme.colors.onPrimary,
    theme.colors.text,
  ]);

  if (
    routineSummariesData === undefined ||
    (!isNew && selectedRoutine === undefined) ||
    (isNew && !draft)
  ) {
    return (
      <WorkoutPage
        headerLeftAction={<HeaderBackButton onPress={handleBackPress} />}
        headerChip={{ icon: "create-outline", label: "Edit" }}
        stickyHeader
        title={null}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Syncing...</Text>
        </View>
      </WorkoutPage>
    );
  }

  if (!isNew && selectedRoutine === null) {
    return (
      <WorkoutPage
        headerLeftAction={<HeaderBackButton onPress={handleBackPress} />}
        headerChip={{ icon: "create-outline", label: "Edit" }}
        stickyHeader
        title={null}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Leaving editor…</Text>
        </View>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      headerLeftAction={<HeaderBackButton onPress={handleBackPress} />}
      headerChip={{
        icon: selectedRoutine ? "create-outline" : "add-circle-outline",
        label: selectedRoutine ? "Edit" : "Create",
      }}
      headerRightAction={saveAction}
      scrollComponent={NestableScrollContainer}
      stickyHeader
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
          onSubmitEditing={() => {
            handleAddSession();
          }}
          placeholder="New section"
          placeholderTextColor={theme.colors.textSubtle}
          returnKeyType="done"
        />
        <AppButton
          accessibilityLabel="Add section"
          disabled={!canAddSession || isAtSessionLimit}
          icon={<Ionicons color={theme.colors.onPrimary} name="add-outline" size={16} />}
          label="Add"
          onPress={() => {
            handleAddSession();
          }}
          size="sm"
        />
      </View>

      {isAtSessionLimit ? (
        <Text style={styles.emptyState}>
          {`Section limit reached. Each routine supports up to ${MAX_SESSIONS_PER_ROUTINE} sections.`}
        </Text>
      ) : null}

      {sessionListData.length > 0 ? (
        <NestableDraggableFlatList
          activateAfterLongPress={220}
          containerStyle={{ flexGrow: 0 }}
          data={sessionListData}
          keyExtractor={(item) => item.key}
          onDragBegin={(index) => {
            dragStartIndexRef.current = index;
            placeholderIndexRef.current = index;
            setDraggingSessionKey(sessionListData[index]?.key ?? null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          }}
          onDragEnd={handleSessionDragEnd}
          onPlaceholderIndexChange={(index) => {
            placeholderIndexRef.current = index;
          }}
          onRelease={() => {
            handleSessionRelease();
          }}
          renderItem={renderSessionItem}
          scrollEnabled={false}
        />
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

      <ConfirmActionModal
        visible={showDiscardModal}
        title={isNew ? "Discard Draft" : "Discard Changes"}
        message={
          isNew
            ? "Leave this routine and lose the sections, exercises, and planner changes you have not saved yet?"
            : "Leave this routine and lose the page-level changes you have not saved yet?"
        }
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        confirmVariant="danger"
        onConfirm={confirmDiscardChanges}
        onCancel={() => {
          setShowDiscardModal(false);
        }}
      />

      <ConfirmActionModal
        visible={Boolean(sessionPendingDelete)}
        title="Delete section"
        message={
          sessionPendingDelete
            ? `Remove "${sessionPendingDelete.name}" from this routine? You can undo by leaving without saving.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={confirmDeleteSession}
        onCancel={closeDeleteSessionModal}
      />

      {AlertModal}
    </WorkoutPage>
  );
}
