export const MAX_SESSIONS_PER_ROUTINE = 12;
export const MAX_EXERCISES_PER_SESSION = 40;

export interface RoutineSaveWeeklyPlanEntry {
  day: number;
  type: "train" | "rest";
}

export interface RoutineSaveExerciseInput<
  TExerciseId = string,
  TSessionExerciseId = string,
> {
  sessionExerciseId?: TSessionExerciseId;
  exerciseId: TExerciseId;
  sets: number;
  repsText: string;
  targetWeightKg?: number;
  restSeconds?: number;
  notes?: string;
  tempo?: string;
  rir?: number;
}

export interface RoutineSaveSessionInput<
  TSessionId = string,
  TExerciseId = string,
  TSessionExerciseId = string,
> {
  sessionId?: TSessionId;
  clientKey: string;
  name: string;
  exercises: RoutineSaveExerciseInput<TExerciseId, TSessionExerciseId>[];
}

export interface RoutineSaveInput<
  TRoutineId = string,
  TSessionId = string,
  TExerciseId = string,
  TSessionExerciseId = string,
> {
  routineId?: TRoutineId;
  name: string;
  weeklyPlan: RoutineSaveWeeklyPlanEntry[];
  sessions: RoutineSaveSessionInput<TSessionId, TExerciseId, TSessionExerciseId>[];
}
