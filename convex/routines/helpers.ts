import { ConvexError } from "convex/values";
import { normalizeDisplayNameKey } from "@ironkor/shared/strings";
import {
  MAX_EXERCISES_PER_SESSION as SHARED_MAX_EXERCISES_PER_SESSION,
  MAX_SESSIONS_PER_ROUTINE as SHARED_MAX_SESSIONS_PER_ROUTINE,
} from "@ironkor/shared/routines";

import { normalizeExerciseCatalog } from "../exerciseCatalog";

import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader, MutationCtx, QueryCtx } from "../_generated/server";
import type {
  ExerciseCatalogRecord,
  RoutineDetailedRecord,
  RoutineSectionExerciseRecord,
  RoutineSectionRecord,
} from "../types";

export const DAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;
export const MAX_ROUTINE_NAME_LENGTH = 80;
export const MAX_SECTION_NAME_LENGTH = 80;
export const MAX_SESSIONS_PER_ROUTINE = SHARED_MAX_SESSIONS_PER_ROUTINE;
export const MAX_EXERCISES_PER_SESSION = SHARED_MAX_EXERCISES_PER_SESSION;
export const TRAINING_DAY_MAP: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export interface WeeklyPlanEntry {
  day: number;
  type: "train" | "rest";
  assignmentMode: "auto" | "manual";
  manualSessionId?: Id<"routineSessions">;
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ConvexError(message);
  }
}

export function requireName(
  value: string,
  fieldLabel: string,
  maxLength: number,
): string {
  const trimmed = value.trim();
  assert(trimmed.length > 0, `${fieldLabel} is required.`);
  assert(
    trimmed.length <= maxLength,
    `${fieldLabel} must be ${maxLength} characters or fewer.`,
  );
  return trimmed;
}

export function normalizeDaysPerWeek(daysPerWeek: number) {
  return Math.min(7, Math.max(1, Math.floor(daysPerWeek)));
}

export function normalizeProgrammingFields(input: {
  sets?: number;
  repsText?: string;
  targetWeightKg?: number;
  restSeconds?: number;
  notes?: string;
  tempo?: string;
  rir?: number;
}) {
  const sets = Math.max(1, Math.floor(input.sets ?? 3));
  const repsText = input.repsText?.trim() ?? "8-12";
  const restSeconds =
    typeof input.restSeconds === "number"
      ? Math.max(0, Math.floor(input.restSeconds))
      : undefined;
  const targetWeightKg =
    typeof input.targetWeightKg === "number" &&
    Number.isFinite(input.targetWeightKg)
      ? input.targetWeightKg
      : undefined;
  const rir =
    typeof input.rir === "number" && Number.isFinite(input.rir)
      ? Math.max(0, Math.floor(input.rir))
      : undefined;

  return {
    sets,
    repsText,
    targetWeightKg,
    restSeconds,
    notes: input.notes?.trim() ?? undefined,
    tempo: input.tempo?.trim() ?? undefined,
    rir,
  };
}

function hasOwn(object: object, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function buildProgrammingRecord(input: {
  sets?: number;
  repsText?: string;
  targetWeightKg?: number;
  restSeconds?: number;
  notes?: string;
  tempo?: string;
  rir?: number;
}) {
  return normalizeProgrammingFields(input);
}

export function buildProgrammingPatch(
  existing: Pick<
    Doc<"sessionExercises">,
    "sets" | "repsText" | "targetWeightKg" | "restSeconds" | "notes" | "tempo" | "rir"
  >,
  updates: {
    sets?: number;
    repsText?: string;
    targetWeightKg?: number;
    restSeconds?: number;
    notes?: string;
    tempo?: string;
    rir?: number;
  },
) {
  return normalizeProgrammingFields({
    sets: hasOwn(updates, "sets") ? updates.sets : existing.sets,
    repsText: hasOwn(updates, "repsText") ? updates.repsText : existing.repsText,
    targetWeightKg: hasOwn(updates, "targetWeightKg")
      ? updates.targetWeightKg
      : existing.targetWeightKg,
    restSeconds: hasOwn(updates, "restSeconds")
      ? updates.restSeconds
      : existing.restSeconds,
    notes: hasOwn(updates, "notes") ? updates.notes : existing.notes,
    tempo: hasOwn(updates, "tempo") ? updates.tempo : existing.tempo,
    rir: hasOwn(updates, "rir") ? updates.rir : existing.rir,
  });
}

export function generateDefaultWeeklyPlan(daysPerWeek: number): WeeklyPlanEntry[] {
  const normalizedDays = normalizeDaysPerWeek(daysPerWeek);
  const trainingDays = new Set(
    TRAINING_DAY_MAP[normalizedDays] ?? TRAINING_DAY_MAP[4],
  );

  return DAY_INDEXES.map((day) => ({
    day,
    type: trainingDays.has(day) ? "train" : "rest",
    assignmentMode: "auto",
  }));
}

export function ensureContiguousOrder(
  orderedList: { order: number }[],
  typeName: string,
) {
  const sorted = [...orderedList].sort((a, b) => a.order - b.order);
  sorted.forEach((item, index) => {
    assert(item.order === index, `${typeName} order must be contiguous.`);
  });
}

export function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

export function sortWeeklyPlan(weeklyPlan: WeeklyPlanEntry[]) {
  return [...weeklyPlan].sort((a, b) => a.day - b.day);
}

export function toExerciseCatalogRecord(
  doc: Doc<"exercises">,
): ExerciseCatalogRecord {
  const normalized = normalizeExerciseCatalog(doc);

  return {
    _id: doc._id,
    _creationTime: doc._creationTime,
    ...normalized,
  };
}

export function toSectionExerciseRecord(
  entry: Doc<"sessionExercises">,
  exercise: Doc<"exercises">,
): RoutineSectionExerciseRecord {
  return {
    _id: entry._id,
    sessionId: entry.sessionId,
    exerciseId: entry.exerciseId,
    order: entry.order,
    sets: entry.sets,
    repsText: entry.repsText,
    targetWeightKg: entry.targetWeightKg,
    restSeconds: entry.restSeconds,
    notes: entry.notes,
    tempo: entry.tempo,
    rir: entry.rir,
    updatedAt: entry.updatedAt,
    exercise: toExerciseCatalogRecord(exercise),
  };
}

export async function getSessionsByRoutine(
  ctx: { db: DatabaseReader },
  routineId: Id<"routines">,
  userId: Id<"users">,
) {
  return ctx.db
    .query("routineSessions")
    .withIndex("by_userId_and_routine_order", (q) =>
      q.eq("userId", userId).eq("routineId", routineId),
    )
    .collect();
}

export async function getSessionExercisesBySession(
  ctx: { db: DatabaseReader },
  sessionId: Id<"routineSessions">,
  userId: Id<"users">,
) {
  return ctx.db
    .query("sessionExercises")
    .withIndex("by_userId_and_session_order", (q) =>
      q.eq("userId", userId).eq("sessionId", sessionId),
    )
    .collect();
}

export async function ensureUniqueRoutineName(
  ctx: { db: DatabaseReader },
  userId: Id<"users">,
  name: string,
  options?: { excludeRoutineId?: Id<"routines"> },
) {
  const normalizedKey = normalizeDisplayNameKey(name);
  const indexedMatches = await ctx.db
    .query("routines")
    .withIndex("by_userId_and_nameKey", (q) =>
      q.eq("userId", userId).eq("nameKey", normalizedKey),
    )
    .take(2);

  const indexedDuplicate = indexedMatches.find((routine) => {
    if (options?.excludeRoutineId && routine._id === options.excludeRoutineId) {
      return false;
    }
    return true;
  });
  if (indexedDuplicate) {
    assert(false, "A routine with this name already exists.");
  }

}

export async function ensureUniqueSessionName(
  ctx: { db: DatabaseReader },
  userId: Id<"users">,
  routineId: Id<"routines">,
  name: string,
  options?: { excludeSessionId?: Id<"routineSessions"> },
) {
  const normalizedKey = normalizeDisplayNameKey(name);
  const indexedMatches = await ctx.db
    .query("routineSessions")
    .withIndex("by_userId_and_routine_and_nameKey", (q) =>
      q.eq("userId", userId)
        .eq("routineId", routineId)
        .eq("nameKey", normalizedKey),
    )
    .take(2);

  const indexedDuplicate = indexedMatches.find((session) => {
    if (options?.excludeSessionId && session._id === options.excludeSessionId) {
      return false;
    }
    return true;
  });
  if (indexedDuplicate) {
    assert(false, "This routine already has a section with this name.");
  }

}

export async function validateWeeklyPlan(
  ctx: { db: DatabaseReader },
  routineId: Id<"routines">,
  weeklyPlan: WeeklyPlanEntry[],
  expectedDaysPerWeek?: number,
) {
  assert(weeklyPlan.length === 7, "Weekly plan must include 7 days.");

  const daySet = new Set<number>();
  for (const entry of weeklyPlan) {
    assert(
      entry.day >= 0 && entry.day <= 6,
      "Weekly plan day must be between 0 and 6.",
    );
    assert(!daySet.has(entry.day), "Weekly plan cannot repeat days.");
    daySet.add(entry.day);

    if (entry.type === "rest") {
      assert(
        entry.assignmentMode === "auto",
        "Rest day must use auto assignment mode.",
      );
      assert(
        !entry.manualSessionId,
        "Rest day cannot have manual section assignment.",
      );
    }

    if (entry.type === "train" && entry.assignmentMode === "manual") {
      assert(Boolean(entry.manualSessionId), "Manual train day must define a section.");
      const manualSession = entry.manualSessionId
        ? await ctx.db.get(entry.manualSessionId)
        : null;
      assert(manualSession, "Manual day references a missing section.");
      assert(
        manualSession.routineId === routineId,
        "Manual day section must belong to the same routine.",
      );
    }
  }

  const trainingDays = weeklyPlan.filter((entry) => entry.type === "train").length;
  if (typeof expectedDaysPerWeek === "number") {
    assert(
      trainingDays === expectedDaysPerWeek,
      "daysPerWeek must match number of training days in weekly plan.",
    );
  }
}

export async function setRoutineActiveState(
  ctx: MutationCtx,
  userId: Id<"users">,
  routineId: Id<"routines">,
  isActive: boolean,
) {
  const target = await ctx.db.get(routineId);
  assert(target, "Routine not found.");
  assert(target.userId === userId, "Unauthorized.");

  if (isActive) {
    const activeRoutines = await ctx.db
      .query("routines")
      .withIndex("by_userId_and_isActive", (q) =>
        q.eq("userId", userId).eq("isActive", true),
      )
      .take(MAX_SESSIONS_PER_ROUTINE + 1);
    for (const routine of activeRoutines) {
      if (routine._id !== routineId) {
        await ctx.db.patch(routine._id, {
          isActive: false,
          updatedAt: Date.now(),
        });
      }
    }
  }

  await ctx.db.patch(routineId, {
    isActive,
    updatedAt: Date.now(),
  });
}

export async function getDetailedRoutine(
  ctx: QueryCtx,
  routine: Doc<"routines">,
): Promise<RoutineDetailedRecord> {
  assert(routine.userId, "Routine owner missing.");
  const sessions = sortByOrder(await getSessionsByRoutine(ctx, routine._id, routine.userId));
  ensureContiguousOrder(sessions, "Section");

  const detailedSessions: RoutineSectionRecord[] = [];

  for (const session of sessions) {
    const sessionExerciseList = sortByOrder(
      await getSessionExercisesBySession(ctx, session._id, routine.userId),
    );
    ensureContiguousOrder(sessionExerciseList, "Section exercise");

    const detailedExercises: RoutineSectionExerciseRecord[] = [];

    for (const entry of sessionExerciseList) {
      const exercise = await ctx.db.get(entry.exerciseId);
      if (exercise) {
        detailedExercises.push(toSectionExerciseRecord(entry, exercise));
      }
    }

    detailedSessions.push({
      _id: session._id,
      name: session.name,
      order: session.order,
      exercises: detailedExercises,
    });
  }

  return {
    ...routine,
    weeklyPlan: sortWeeklyPlan(routine.weeklyPlan as WeeklyPlanEntry[]),
    sessions: detailedSessions,
  };
}
