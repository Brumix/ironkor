import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import type {
  DraftRoutine,
  DraftWeeklyPlanEntry,
  ExerciseCatalog,
  ExerciseProgrammingFields,
} from "@/features/workout/types";

import type { ReactNode } from "react";

const DAYS_PER_WEEK_MAP: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

const DEFAULT_PROGRAMMING: ExerciseProgrammingFields = {
  sets: 3,
  repsText: "8-12",
  targetWeightKg: undefined,
  restSeconds: undefined,
  notes: undefined,
  tempo: undefined,
  rir: undefined,
};

function createDefaultWeeklyPlan(daysPerWeek = 4): DraftWeeklyPlanEntry[] {
  const clamped = Math.max(1, Math.min(7, Math.floor(daysPerWeek)));
  const trainingDays = new Set(DAYS_PER_WEEK_MAP[clamped] ?? DAYS_PER_WEEK_MAP[4]);

  return Array.from({ length: 7 }, (_, day) => ({
    day,
    type: trainingDays.has(day) ? "train" : "rest",
  }));
}

function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

function sortWeeklyPlan(entries: DraftWeeklyPlanEntry[]) {
  return [...entries].sort((a, b) => a.day - b.day);
}

function createDefaultDraftRoutine(): DraftRoutine {
  return {
    name: "",
    sessions: [],
    weeklyPlan: createDefaultWeeklyPlan(4),
  };
}

function areWeeklyPlansEqual(left: DraftWeeklyPlanEntry[], right: DraftWeeklyPlanEntry[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((entry, index) =>
    entry.day === right[index]?.day && entry.type === right[index]?.type,
  );
}

function areDraftRoutinesEqual(left: DraftRoutine | null, right: DraftRoutine) {
  const next = left ?? createDefaultDraftRoutine();
  const nextSessions = sortByOrder(next.sessions);
  const baselineSessions = sortByOrder(right.sessions);

  if (next.name !== right.name) {
    return false;
  }

  if (!areWeeklyPlansEqual(sortWeeklyPlan(next.weeklyPlan), sortWeeklyPlan(right.weeklyPlan))) {
    return false;
  }

  if (nextSessions.length !== baselineSessions.length) {
    return false;
  }

  for (const [sessionIndex, session] of nextSessions.entries()) {
    const baselineSession = baselineSessions[sessionIndex];
    if (session.name !== baselineSession.name || session.order !== baselineSession.order) {
      return false;
    }

    if (session.exercises.length !== baselineSession.exercises.length) {
      return false;
    }

    const nextExercises = sortByOrder(session.exercises);
    const baselineExercises = sortByOrder(baselineSession.exercises);

    for (const [exerciseIndex, exercise] of nextExercises.entries()) {
      const baselineExercise = baselineExercises[exerciseIndex];
      if (
        !(
        exercise.order === baselineExercise.order &&
        exercise.exerciseId === baselineExercise.exerciseId &&
        exercise.sets === baselineExercise.sets &&
        exercise.repsText === baselineExercise.repsText &&
        exercise.targetWeightKg === baselineExercise.targetWeightKg &&
        exercise.restSeconds === baselineExercise.restSeconds &&
        exercise.notes === baselineExercise.notes &&
        exercise.tempo === baselineExercise.tempo &&
        exercise.rir === baselineExercise.rir
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

interface DraftRoutineContextValue {
  draft: DraftRoutine | null;
  hasChanges: boolean;
  ensureDraft: () => void;
  clearDraft: () => void;
  setRoutineName: (name: string) => void;
  setWeeklyPlan: (updater: (current: DraftWeeklyPlanEntry[]) => DraftWeeklyPlanEntry[]) => void;
  addSession: (name: string) => string;
  updateSessionName: (sessionKey: string, name: string) => void;
  moveSession: (sessionKey: string, direction: -1 | 1) => void;
  reorderSessions: (orderedSessionKeys: string[]) => void;
  removeSession: (sessionKey: string) => void;
  addOrReplaceExercise: (
    sessionKey: string,
    exercise: ExerciseCatalog,
    programming?: Partial<ExerciseProgrammingFields>,
    targetExerciseKey?: string,
  ) => string;
  updateExerciseProgramming: (
    sessionKey: string,
    exerciseKey: string,
    updates: Partial<ExerciseProgrammingFields>,
  ) => void;
  moveExercise: (sessionKey: string, exerciseKey: string, direction: -1 | 1) => void;
  reorderExercises: (sessionKey: string, orderedExerciseKeys: string[]) => void;
  removeExercise: (sessionKey: string, exerciseKey: string) => void;
}

const DraftRoutineContext = createContext<DraftRoutineContextValue | null>(null);

export function DraftRoutineProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DraftRoutine | null>(null);
  const sessionCounter = useRef(0);
  const exerciseCounter = useRef(0);

  const ensureDraft = useCallback(() => {
    setDraft((current) => current ?? createDefaultDraftRoutine());
  }, []);

  const clearDraft = useCallback(() => {
    setDraft(null);
  }, []);

  const updateDraft = useCallback((updater: (current: DraftRoutine) => DraftRoutine) => {
    setDraft((current) => {
      const base = current ?? createDefaultDraftRoutine();
      return updater(base);
    });
  }, []);

  const setRoutineName = useCallback((name: string) => {
    updateDraft((current) => ({
      ...current,
      name,
    }));
  }, [updateDraft]);

  const setWeeklyPlan = useCallback((updater: (current: DraftWeeklyPlanEntry[]) => DraftWeeklyPlanEntry[]) => {
    updateDraft((current) => ({
      ...current,
      weeklyPlan: sortWeeklyPlan(updater(current.weeklyPlan)),
    }));
  }, [updateDraft]);

  const addSession = useCallback((name: string) => {
    const sessionKey = `draft-session-${sessionCounter.current}`;
    sessionCounter.current += 1;

    updateDraft((current) => ({
      ...current,
      sessions: [
        ...current.sessions,
        {
          key: sessionKey,
          name,
          order: current.sessions.length,
          exercises: [],
        },
      ],
    }));

    return sessionKey;
  }, [updateDraft]);

  const updateSessionName = useCallback((sessionKey: string, name: string) => {
    updateDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.key === sessionKey ? { ...session, name } : session,
      ),
    }));
  }, [updateDraft]);

  const moveSession = useCallback((sessionKey: string, direction: -1 | 1) => {
    updateDraft((current) => {
      const ordered = sortByOrder(current.sessions);
      const index = ordered.findIndex((session) => session.key === sessionKey);
      if (index < 0) {
        return current;
      }

      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= ordered.length) {
        return current;
      }

      const reordered = [...ordered];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, moved);

      return {
        ...current,
        sessions: reordered.map((session, nextIndex) => ({
          ...session,
          order: nextIndex,
        })),
      };
    });
  }, [updateDraft]);

  const reorderSessions = useCallback((orderedSessionKeys: string[]) => {
    updateDraft((current) => {
      if (orderedSessionKeys.length !== current.sessions.length) {
        return current;
      }

      const sessionMap = new Map(current.sessions.map((session) => [session.key, session] as const));
      const reordered = orderedSessionKeys
        .map((sessionKey) => sessionMap.get(sessionKey))
        .filter((session): session is DraftRoutine["sessions"][number] => Boolean(session));

      if (reordered.length !== current.sessions.length) {
        return current;
      }

      return {
        ...current,
        sessions: reordered.map((session, index) => ({
          ...session,
          order: index,
        })),
      };
    });
  }, [updateDraft]);

  const removeSession = useCallback((sessionKey: string) => {
    updateDraft((current) => ({
      ...current,
      sessions: current.sessions
        .filter((session) => session.key !== sessionKey)
        .map((session, index) => ({
          ...session,
          order: index,
        })),
    }));
  }, [updateDraft]);

  const addOrReplaceExercise = useCallback((
    sessionKey: string,
    exercise: ExerciseCatalog,
    programming?: Partial<ExerciseProgrammingFields>,
    targetExerciseKey?: string,
  ) => {
    const exerciseKey = targetExerciseKey ?? `draft-exercise-${exerciseCounter.current}`;
    if (!targetExerciseKey) {
      exerciseCounter.current += 1;
    }

    updateDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session) => {
        if (session.key !== sessionKey) {
          return session;
        }

        if (targetExerciseKey) {
          return {
            ...session,
            exercises: session.exercises.map((entry) =>
              entry.key === targetExerciseKey
                ? {
                    ...entry,
                    exerciseId: exercise._id,
                    exercise,
                    ...programming,
                  }
                : entry,
            ),
          };
        }

        return {
          ...session,
          exercises: [
            ...session.exercises,
            {
              key: exerciseKey,
              exerciseId: exercise._id,
              exercise,
              order: session.exercises.length,
              ...DEFAULT_PROGRAMMING,
              ...programming,
            },
          ],
        };
      }),
    }));

    return exerciseKey;
  }, [updateDraft]);

  const updateExerciseProgramming = useCallback((
    sessionKey: string,
    exerciseKey: string,
    updates: Partial<ExerciseProgrammingFields>,
  ) => {
    updateDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.key === sessionKey
          ? {
              ...session,
              exercises: session.exercises.map((entry) =>
                entry.key === exerciseKey ? { ...entry, ...updates } : entry,
              ),
            }
          : session,
      ),
    }));
  }, [updateDraft]);

  const moveExercise = useCallback((sessionKey: string, exerciseKey: string, direction: -1 | 1) => {
    updateDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session) => {
        if (session.key !== sessionKey) {
          return session;
        }

        const ordered = sortByOrder(session.exercises);
        const index = ordered.findIndex((entry) => entry.key === exerciseKey);
        if (index < 0) {
          return session;
        }

        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= ordered.length) {
          return session;
        }

        const reordered = [...ordered];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(targetIndex, 0, moved);

        return {
          ...session,
          exercises: reordered.map((entry, nextIndex) => ({
            ...entry,
            order: nextIndex,
          })),
        };
      }),
    }));
  }, [updateDraft]);

  const reorderExercises = useCallback((sessionKey: string, orderedExerciseKeys: string[]) => {
    updateDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session) => {
        if (session.key !== sessionKey) {
          return session;
        }

        if (orderedExerciseKeys.length !== session.exercises.length) {
          return session;
        }

        const exerciseMap = new Map(session.exercises.map((exercise) => [exercise.key, exercise] as const));
        const reordered = orderedExerciseKeys
          .map((exerciseKey) => exerciseMap.get(exerciseKey))
          .filter((exercise): exercise is DraftRoutine["sessions"][number]["exercises"][number] =>
            Boolean(exercise),
          );

        if (reordered.length !== session.exercises.length) {
          return session;
        }

        return {
          ...session,
          exercises: reordered.map((exercise, index) => ({
            ...exercise,
            order: index,
          })),
        };
      }),
    }));
  }, [updateDraft]);

  const removeExercise = useCallback((sessionKey: string, exerciseKey: string) => {
    updateDraft((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.key === sessionKey
          ? {
              ...session,
              exercises: session.exercises
                .filter((entry) => entry.key !== exerciseKey)
                .map((entry, index) => ({
                  ...entry,
                  order: index,
                })),
            }
          : session,
      ),
    }));
  }, [updateDraft]);

  const hasChanges = useMemo(
    () => !areDraftRoutinesEqual(draft, createDefaultDraftRoutine()),
    [draft],
  );

  const value = useMemo<DraftRoutineContextValue>(() => ({
    draft,
    hasChanges,
    ensureDraft,
    clearDraft,
    setRoutineName,
    setWeeklyPlan,
    addSession,
    updateSessionName,
    moveSession,
    reorderSessions,
    removeSession,
    addOrReplaceExercise,
    updateExerciseProgramming,
    moveExercise,
    reorderExercises,
    removeExercise,
  }), [
    addOrReplaceExercise,
    addSession,
    clearDraft,
    draft,
    ensureDraft,
    hasChanges,
    moveExercise,
    moveSession,
    reorderExercises,
    reorderSessions,
    removeExercise,
    removeSession,
    setRoutineName,
    setWeeklyPlan,
    updateExerciseProgramming,
    updateSessionName,
  ]);

  return <DraftRoutineContext.Provider value={value}>{children}</DraftRoutineContext.Provider>;
}

export function useDraftRoutine() {
  const context = useContext(DraftRoutineContext);

  if (!context) {
    throw new Error("useDraftRoutine must be used within DraftRoutineProvider");
  }

  return context;
}
