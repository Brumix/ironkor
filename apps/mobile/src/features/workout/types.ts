import type {
  ExerciseCatalogRecord,
  RoutineDetailedRecord,
} from "@convex/types";

export type RoutineDetailed = RoutineDetailedRecord;
export type RoutineSection = RoutineDetailedRecord["sessions"][number];
export type SessionExercise = RoutineSection["exercises"][number];
export type ExerciseCatalog = ExerciseCatalogRecord;
export type TrainingDayType = RoutineDetailedRecord["weeklyPlan"][number]["type"];
export type ExerciseProgrammingFields = Pick<
  SessionExercise,
  "sets" | "repsText" | "targetWeightKg" | "restSeconds" | "notes" | "tempo" | "rir"
>;

export interface DraftSessionExercise extends ExerciseProgrammingFields {
  key: string;
  exerciseId: ExerciseCatalog["_id"];
  order: number;
  exercise: ExerciseCatalog;
}

export interface DraftSession {
  key: string;
  name: string;
  order: number;
  exercises: DraftSessionExercise[];
}

export interface DraftWeeklyPlanEntry {
  day: number;
  type: TrainingDayType;
}

export interface DraftRoutine {
  name: string;
  sessions: DraftSession[];
  weeklyPlan: DraftWeeklyPlanEntry[];
}

export interface ExerciseLookupItem {
  id: string;
  name: string;
}

export interface WorkoutSessionTemplate {
  id: string;
  name: string;
  exerciseIds: string[];
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  daysPerWeek: number;
  sessions: WorkoutSessionTemplate[];
}

export interface WorkoutPerformedSet {
  reps: number;
  loadKg: number;
}

export interface WorkoutLogEntry {
  exerciseId: string;
  performedSets: WorkoutPerformedSet[];
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  dateISO: string;
  sessionName: string;
  durationMinutes: number;
  entries: WorkoutLogEntry[];
  notes?: string;
}

export interface WeeklyDayPlan {
  dateISO: string;
  type: TrainingDayType;
  sessionId?: RoutineSection["_id"];
  sessionName?: string;
  estimatedDurationMinutes: number;
}

export interface WeeklyPlan {
  weekStartISO: string;
  dayPlans: WeeklyDayPlan[];
}
