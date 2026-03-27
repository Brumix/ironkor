import type { Doc, Id } from "./_generated/dataModel";
import type {
  BodyPartType,
  EquipmentType,
  MuscleType,
} from "@ironkor/shared/constants";

export interface ExerciseCatalogRecord {
  _id: Id<"exercises">;
  _creationTime: number;
  name: string;
  bodyPart: BodyPartType;
  equipment: EquipmentType;
  primaryMuscle: MuscleType;
  muscleGroups: MuscleType[];
  description?: string;
  nameText: string;
  musclesText: string;
  isCustom: boolean;
}

export interface RoutineSectionExerciseRecord {
  _id: Id<"sessionExercises">;
  sessionId: Id<"routineSessions">;
  exerciseId: Id<"exercises">;
  order: number;
  sets: number;
  repsText: string;
  targetWeightKg?: number;
  restSeconds?: number;
  notes?: string;
  tempo?: string;
  rir?: number;
  updatedAt: number;
  exercise: ExerciseCatalogRecord;
}

export interface RoutineSectionRecord {
  _id: Id<"routineSessions">;
  name: string;
  order: number;
  exercises: RoutineSectionExerciseRecord[];
}

export interface RoutineSectionSummaryRecord {
  _id: Id<"routineSessions">;
  name: string;
  order: number;
  exerciseCount: number;
}

export type WeeklyPlanEntryRecord = Doc<"routines">["weeklyPlan"][number];

export interface RoutineDetailedRecord extends Doc<"routines"> {
  sessions: RoutineSectionRecord[];
}

export interface RoutineSummaryRecord extends Doc<"routines"> {
  sessions: RoutineSectionSummaryRecord[];
}
