export type TrainingDayType = "train" | "rest";
export type AssignmentMode = "auto" | "manual";

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

export interface Exercise {
  id: string;
  name: string;
  variant: string;
  setsTarget: number;
  repsTarget: string;
  restSeconds: number;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  isCustom?: boolean;
}

export interface SessionExercise {
  id: string;
  order: number;
  exercise: Exercise;
}

export interface RoutineSessionDetailed {
  id: string;
  name: string;
  order: number;
  exercises: SessionExercise[];
}

export interface WeeklyPlanTemplateEntry {
  day: number;
  type: TrainingDayType;
  assignmentMode: AssignmentMode;
  manualSessionId?: string;
}

export interface RoutineDetailed {
  id: string;
  name: string;
  daysPerWeek: number;
  isActive: boolean;
  sessionOrder: string[];
  weeklyPlan: WeeklyPlanTemplateEntry[];
  sessions: RoutineSessionDetailed[];
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
  sessionId?: string;
  sessionName?: string;
  estimatedDurationMinutes: number;
}

export interface WeeklyPlan {
  weekStartISO: string;
  dayPlans: WeeklyDayPlan[];
}
