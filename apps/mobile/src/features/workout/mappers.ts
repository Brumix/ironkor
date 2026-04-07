import { createProgrammingDraft, parseOptionalNumber } from "./programmingDraft";

import type {
  DraftRoutine,
  DraftSession,
  DraftSessionExercise,
  RoutineDetailed,
  RoutineSaveDraft,
} from "./types";

function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((left, right) => left.order - right.order);
}

function sortWeeklyPlan<T extends { day: number }>(items: T[]) {
  return [...items].sort((left, right) => left.day - right.day);
}

export function cloneDraftRoutine(draft: DraftRoutine): DraftRoutine {
  return {
    routineId: draft.routineId,
    name: draft.name,
    weeklyPlan: sortWeeklyPlan(draft.weeklyPlan).map((entry) => ({ ...entry })),
    sessions: sortByOrder(draft.sessions).map((session) => ({
      ...session,
      exercises: sortByOrder(session.exercises).map((exercise) => ({
        ...exercise,
        exercise: { ...exercise.exercise },
      })),
    })),
  };
}

export function createDraftRoutineFromRoutine(routine: RoutineDetailed): DraftRoutine {
  return {
    routineId: routine._id,
    name: routine.name,
    weeklyPlan: sortWeeklyPlan(routine.weeklyPlan).map((entry) => ({
      day: entry.day,
      type: entry.type,
    })),
    sessions: sortByOrder(routine.sessions).map((session): DraftSession => ({
      key: `session:${String(session._id)}`,
      sessionId: session._id,
      name: session.name,
      order: session.order,
      exercises: sortByOrder(session.exercises).map(
        (exercise): DraftSessionExercise => ({
          key: `session-exercise:${String(exercise._id)}`,
          sessionExerciseId: exercise._id,
          exerciseId: exercise.exerciseId,
          order: exercise.order,
          sets: exercise.sets,
          repsText: exercise.repsText,
          targetWeightKg: exercise.targetWeightKg,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
          tempo: exercise.tempo,
          rir: exercise.rir,
          exercise: { ...exercise.exercise },
        }),
      ),
    })),
  };
}

export function createRoutineSaveDraft(draft: DraftRoutine): RoutineSaveDraft {
  return {
    routineId: draft.routineId,
    name: draft.name,
    weeklyPlan: sortWeeklyPlan(draft.weeklyPlan).map((entry) => ({
      day: entry.day,
      type: entry.type,
    })),
    sessions: sortByOrder(draft.sessions).map((session) => ({
      sessionId: session.sessionId,
      clientKey: session.key,
      name: session.name,
      exercises: sortByOrder(session.exercises).map((exercise) => ({
        sessionExerciseId: exercise.sessionExerciseId,
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
        repsText: exercise.repsText,
        targetWeightKg: exercise.targetWeightKg,
        restSeconds: exercise.restSeconds,
        notes: exercise.notes,
        tempo: exercise.tempo,
        rir: exercise.rir,
      })),
    })),
  };
}

export function createProgrammingDraftFromExercise(
  exercise: DraftSessionExercise,
) {
  return createProgrammingDraft(exercise);
}

export function normalizeProgrammingDraftForSave(
  draft: ReturnType<typeof createProgrammingDraft>,
) {
  return {
    sets: Math.max(1, Math.floor(Number(draft.sets) || 3)),
    repsText: draft.repsText.trim() || "8-12",
    targetWeightKg: parseOptionalNumber(draft.targetWeightKg),
    restSeconds: parseOptionalNumber(draft.restSeconds),
    notes: draft.notes.trim() || undefined,
    tempo: draft.tempo.trim() || undefined,
    rir: parseOptionalNumber(draft.rir),
  };
}
