import type {
  Exercise,
  RoutineDetailed,
  RoutineSessionDetailed,
  SessionExercise,
  WeeklyPlanTemplateEntry,
} from "@/features/workout/types";

import type { Doc } from "@convex/_generated/dataModel";

type DetailedRoutineFromApi = Doc<"routines"> & {
  sessions: {
    _id: string;
    name: string;
    order: number;
    exercises: {
      _id: string;
      order: number;
      exercise: Doc<"exercises">;
    }[];
  }[];
};

export function mapExercise(doc: Doc<"exercises">): Exercise {
  return {
    id: String(doc._id),
    name: doc.name,
    variant: doc.variant,
    setsTarget: doc.setsTarget,
    repsTarget: doc.repsTarget,
    restSeconds: doc.restSeconds,
    primaryMuscles: doc.primaryMuscles,
    secondaryMuscles: doc.secondaryMuscles,
    isCustom: doc.isCustom,
  };
}

export function mapSessionExercise(entry: {
  _id: string;
  order: number;
  exercise: Doc<"exercises">;
}): SessionExercise {
  return {
    id: entry._id,
    order: entry.order,
    exercise: mapExercise(entry.exercise),
  };
}

export function mapRoutineSession(entry: {
  _id: string;
  name: string;
  order: number;
  exercises: {
    _id: string;
    order: number;
    exercise: Doc<"exercises">;
  }[];
}): RoutineSessionDetailed {
  return {
    id: entry._id,
    name: entry.name,
    order: entry.order,
    exercises: entry.exercises
      .sort((a, b) => a.order - b.order)
      .map(mapSessionExercise),
  };
}

export function mapWeeklyPlan(entries: Doc<"routines">["weeklyPlan"]): WeeklyPlanTemplateEntry[] {
  return [...entries]
    .sort((a, b) => a.day - b.day)
    .map((entry) => ({
      day: entry.day,
      type: entry.type,
      assignmentMode: entry.assignmentMode,
      manualSessionId: entry.manualSessionId ? String(entry.manualSessionId) : undefined,
    }));
}

export function mapRoutineDetailed(doc: DetailedRoutineFromApi): RoutineDetailed {
  return {
    id: String(doc._id),
    name: doc.name,
    daysPerWeek: doc.daysPerWeek,
    isActive: doc.isActive,
    sessionOrder: doc.sessionOrder.map((id) => String(id)),
    weeklyPlan: mapWeeklyPlan(doc.weeklyPlan),
    sessions: doc.sessions.sort((a, b) => a.order - b.order).map(mapRoutineSession),
  };
}
