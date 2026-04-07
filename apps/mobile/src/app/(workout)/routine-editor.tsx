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
import { captureAnalyticsEvent } from "@/config/posthog";
import { useDraftRoutine } from "@/features/workout/DraftRoutineProvider";
import { createRoutineSaveDraft } from "@/features/workout/mappers";
import type { DraftWeeklyPlanEntry, RoutineSaveDraft } from "@/features/workout/types";
import { useTheme } from "@/theme";

import type { Id } from "@convex/_generated/dataModel";
import type { FunctionReference } from "convex/server";
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

type SaveRoutineMutationArgs = RoutineSaveDraft & Record<string, unknown>;

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

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function RoutineEditorScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert, AlertModal } = useAppAlert();
  const {
    draft,
    currentRoutineId,
    hasChanges,
    ensureDraft,
    hydrateRoutine,
    clearDraft,
    resetDraft,
    markPendingRoutineChanges,
    clearPendingRoutineChanges,
    setRoutineName: setDraftRoutineName,
    setWeeklyPlan,
    addSession,
    reorderSessions: reorderDraftSessions,
    removeSession: removeDraftSession,
  } = useDraftRoutine();

  const routineSummariesData = useQuery(api.routines.listSummaries, { limit: 100 });

  const saveRoutine = useMutation(
    api.routines.saveRoutine as unknown as FunctionReference<
      "mutation",
      "public",
      SaveRoutineMutationArgs,
      Id<"routines">
    >,
  );

  const routineIdParam = typeof params.routineId === "string" ? params.routineId : "new";
  const isNew = routineIdParam === "new";
  const selectedRoutine = useQuery(
    api.routines.getDetailedById,
    !isNew ? { routineId: routineIdParam as Id<"routines"> } : "skip",
  );
  const routines = useMemo(() => routineSummariesData ?? [], [routineSummariesData]);

  const [newSessionName, setNewSessionName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [draggingSessionKey, setDraggingSessionKey] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [sessionPendingDelete, setSessionPendingDelete] = useState<SessionOption | null>(null);
  const draftRef = useRef(draft);
  const trackedExistingRoutineIdRef = useRef<string | null>(null);
  const dragStartIndexRef = useRef<number | null>(null);
  const placeholderIndexRef = useRef<number | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useLayoutEffect(() => {
    if (!isNew && selectedRoutine === null) {
      clearPendingRoutineChanges(routineIdParam);
      router.replace("/(workout)/routines");
    }
  }, [clearPendingRoutineChanges, isNew, router, routineIdParam, selectedRoutine]);

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
    setNewSessionName("");
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
    return sortByOrder(draft?.sessions ?? []).map((session) => ({
      key: session.key,
      name: session.name,
      order: session.order,
      exerciseCount: session.exercises.length,
      persistedId: session.sessionId,
    }));
  }, [draft?.sessions]);

  useEffect(() => {
    if (routineSummariesData === undefined || isNew || selectedRoutine === undefined || !selectedRoutine) {
      return;
    }

    const currentId = String(selectedRoutine._id);
    if (currentRoutineId === currentId && draft) {
      return;
    }

    hydrateRoutine(selectedRoutine);
  }, [currentRoutineId, draft, hydrateRoutine, isNew, routineSummariesData, selectedRoutine]);

  const routineNameValue = draft?.name ?? "";
  const plannerEntries = sortPlanner(draft?.weeklyPlan ?? []);
  const sessionListData = sourceSessionOptions;
  const canAddSession = newSessionName.trim().length > 0;
  const isAtSessionLimit = sessionListData.length >= MAX_SESSIONS_PER_ROUTINE;
  const hasPageChanges = hasChanges;
  const shouldShowSaveAction = hasPageChanges || isSaving;

  useEffect(() => {
    const nextTrackedRoutineId = isNew ? null : routineIdParam;
    const previousTrackedRoutineId = trackedExistingRoutineIdRef.current;

    if (previousTrackedRoutineId && previousTrackedRoutineId !== nextTrackedRoutineId) {
      clearPendingRoutineChanges(previousTrackedRoutineId);
    }

    trackedExistingRoutineIdRef.current = nextTrackedRoutineId;
  }, [clearPendingRoutineChanges, isNew, routineIdParam]);

  useEffect(() => {
    if (isNew) {
      return;
    }

    if (hasChanges) {
      markPendingRoutineChanges(routineIdParam);
      return;
    }

    clearPendingRoutineChanges(routineIdParam);
  }, [
    clearPendingRoutineChanges,
    hasChanges,
    isNew,
    markPendingRoutineChanges,
    routineIdParam,
  ]);

  function navigateToRoutines() {
    router.replace("/(workout)/routines");
  }

  function updatePlannerEntries(updater: (current: DraftWeeklyPlanEntry[]) => DraftWeeklyPlanEntry[]) {
    setWeeklyPlan(updater);
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
      clearPendingRoutineChanges(routineIdParam);
      resetDraft();
      resetExistingRoutineUi();
    }

    setShowDiscardModal(false);
    navigateToRoutines();
  }

  async function handleSaveRoutine() {
    if (isSaving) {
      return;
    }

    const name = routineNameValue.trim() || "Untitled routine";
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
      if (!draft) {
        return;
      }

      const payload = createRoutineSaveDraft({
        ...draft,
        name,
      });
      const savedRoutineId = await saveRoutine(payload as SaveRoutineMutationArgs);

      captureAnalyticsEvent("routine_saved", {
        is_new: isNew,
        session_count: sessionListData.length,
        train_days: payload.weeklyPlan.filter((entry) => entry.type === "train").length,
      });
      payload.sessions.forEach((session, index) => {
        captureAnalyticsEvent("routine_session_saved", {
          routine_id: String(savedRoutineId),
          is_new: session.sessionId === undefined,
          exercise_count: session.exercises.length,
          session_order: index,
        });
      });

      if (!isNew && selectedRoutine) {
        clearPendingRoutineChanges(String(selectedRoutine._id));
        resetExistingRoutineUi();
      }

      clearDraft();

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

    addSession(name);
    setNewSessionName("");
  }

  function handleSessionDragEnd({ data }: DragEndParams<SessionOption>) {
    setDraggingSessionKey(null);
    dragStartIndexRef.current = null;
    placeholderIndexRef.current = null;
    reorderDraftSessions(data.map((session) => session.key));
  }

  function handleSessionRelease() {
    const from = dragStartIndexRef.current;
    const to = placeholderIndexRef.current;

    setDraggingSessionKey(null);

    if (from === null || to === null || from === to) {
      return;
    }

    const reorderedData = reorderSessionOptionsByIndex(sessionListData, from, to);
    reorderDraftSessions(reorderedData.map((session) => session.key));
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

    removeDraftSession(session.key);
  }, [isNew, removeDraftSession, sessionPendingDelete]);

  const closeDeleteSessionModal = useCallback(() => {
    setSessionPendingDelete(null);
  }, []);

  const openSessionEditor = useCallback((session: SessionOption) => {
    router.push({
        pathname: "/(workout)/session-editor",
        params: {
          routineId: isNew
            ? "new"
            : selectedRoutine
              ? String(selectedRoutine._id)
              : routineIdParam,
          draftSessionKey: session.key,
          ...(session.persistedId ? { sessionId: String(session.persistedId) } : {}),
        },
    });
  }, [isNew, router, routineIdParam, selectedRoutine]);

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
        onChangeText={setDraftRoutineName}
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
