import { ConvexError, v } from "convex/values";
import { normalizeDisplayNameKey } from "@ironkor/shared/strings";

import { mutation, query } from "./_generated/server";
import { normalizeExerciseCatalog } from "./exerciseCatalog";
import { weeklyPlanEntry } from "./schemas/routines";

import type { Doc, Id } from "./_generated/dataModel";
import type {
  DatabaseReader,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import type {
  ExerciseCatalogRecord,
  RoutineDetailedRecord,
  RoutineSectionExerciseRecord,
  RoutineSectionRecord,
  RoutineSectionSummaryRecord,
  RoutineSummaryRecord,
} from "./types";

const DAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;
const MAX_ROUTINE_NAME_LENGTH = 80;
const MAX_SECTION_NAME_LENGTH = 80;
const TRAINING_DAY_MAP: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

interface WeeklyPlanEntry {
  day: number;
  type: "train" | "rest";
  assignmentMode: "auto" | "manual";
  manualSessionId?: Id<"routineSessions">;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ConvexError(message);
  }
}

function requireName(
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

function normalizeDaysPerWeek(daysPerWeek: number) {
  return Math.min(7, Math.max(1, Math.floor(daysPerWeek)));
}

function normalizeProgrammingFields(input: {
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

function buildProgrammingRecord(input: {
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

function buildProgrammingPatch(
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

function generateDefaultWeeklyPlan(daysPerWeek: number): WeeklyPlanEntry[] {
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

function ensureContiguousOrder(orderedList: { order: number }[], typeName: string) {
  const sorted = [...orderedList].sort((a, b) => a.order - b.order);
  sorted.forEach((item, index) => {
    assert(item.order === index, `${typeName} order must be contiguous.`);
  });
}

function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

function sortWeeklyPlan(weeklyPlan: WeeklyPlanEntry[]) {
  return [...weeklyPlan].sort((a, b) => a.day - b.day);
}

function toExerciseCatalogRecord(doc: Doc<"exercises">): ExerciseCatalogRecord {
  const normalized = normalizeExerciseCatalog(doc);

  return {
    _id: doc._id,
    _creationTime: doc._creationTime,
    ...normalized,
  };
}

function toSectionExerciseRecord(
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

async function getSessionsByRoutine(
  ctx: { db: DatabaseReader },
  routineId: Id<"routines">,
) {
  return ctx.db
    .query("routineSessions")
    .withIndex("by_routine", (q) => q.eq("routineId", routineId))
    .collect();
}

async function getSessionExercisesBySession(
  ctx: { db: DatabaseReader },
  sessionId: Id<"routineSessions">,
) {
  return ctx.db
    .query("sessionExercises")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
}

async function ensureUniqueRoutineName(
  ctx: { db: DatabaseReader },
  name: string,
  options?: { excludeRoutineId?: Id<"routines"> },
) {
  const normalizedKey = normalizeDisplayNameKey(name);
  const indexedMatches = await ctx.db
    .query("routines")
    .withIndex("by_nameKey", (q) => q.eq("nameKey", normalizedKey))
    .collect();

  const indexedDuplicate = indexedMatches.find((routine) => {
    if (options?.excludeRoutineId && routine._id === options.excludeRoutineId) {
      return false;
    }
    return true;
  });
  if (indexedDuplicate) {
    assert(false, "A routine with this name already exists.");
  }

  // Backward-compatible fallback for legacy documents missing nameKey.
  const routines = await ctx.db
    .query("routines")
    .withIndex("by_updatedAt")
    .collect();

  const duplicateRoutine = routines.find((routine) => {
    if (options?.excludeRoutineId && routine._id === options.excludeRoutineId) {
      return false;
    }
    return normalizeDisplayNameKey(routine.name) === normalizedKey;
  });

  assert(!duplicateRoutine, "A routine with this name already exists.");
}

async function ensureUniqueSessionName(
  ctx: { db: DatabaseReader },
  routineId: Id<"routines">,
  name: string,
  options?: { excludeSessionId?: Id<"routineSessions"> },
) {
  const normalizedKey = normalizeDisplayNameKey(name);
  const indexedMatches = await ctx.db
    .query("routineSessions")
    .withIndex("by_routine_and_nameKey", (q) =>
      q.eq("routineId", routineId).eq("nameKey", normalizedKey),
    )
    .collect();

  const indexedDuplicate = indexedMatches.find((session) => {
    if (options?.excludeSessionId && session._id === options.excludeSessionId) {
      return false;
    }
    return true;
  });
  if (indexedDuplicate) {
    assert(false, "This routine already has a section with this name.");
  }

  const sessions = await getSessionsByRoutine(ctx, routineId);

  const duplicateSession = sessions.find((session) => {
    if (options?.excludeSessionId && session._id === options.excludeSessionId) {
      return false;
    }
    return normalizeDisplayNameKey(session.name) === normalizedKey;
  });

  assert(!duplicateSession, "This routine already has a section with this name.");
}

async function validateWeeklyPlan(
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

async function setRoutineActiveState(
  ctx: MutationCtx,
  routineId: Id<"routines">,
  isActive: boolean,
) {
  const target = await ctx.db.get(routineId);
  assert(target, "Routine not found.");

  if (isActive) {
    const activeRoutines = await ctx.db
      .query("routines")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
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

async function getDetailedRoutine(
  ctx: QueryCtx,
  routine: Doc<"routines">,
): Promise<RoutineDetailedRecord> {
  const sessions = sortByOrder(await getSessionsByRoutine(ctx, routine._id));
  ensureContiguousOrder(sessions, "Section");

  const detailedSessions: RoutineSectionRecord[] = [];

  for (const session of sessions) {
    const sessionExerciseList = sortByOrder(
      await getSessionExercisesBySession(ctx, session._id),
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

export const listSummaries = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RoutineSummaryRecord[]> => {
    const limit = Math.min(Math.max(1, Math.floor(args.limit ?? 30)), 100);
    const routines = await ctx.db
      .query("routines")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(limit);

    const summaries: RoutineSummaryRecord[] = [];
    for (const routine of routines) {
      const sessions = sortByOrder(await getSessionsByRoutine(ctx, routine._id));
      const sessionSummaries: RoutineSectionSummaryRecord[] = [];
      for (const session of sessions) {
        let exerciseCount = 0;
        const sessionExerciseQuery = ctx.db
          .query("sessionExercises")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id));
        for await (const _entry of sessionExerciseQuery) {
          exerciseCount += 1;
        }
        sessionSummaries.push({
          _id: session._id,
          name: session.name,
          order: session.order,
          exerciseCount,
        });
      }

      summaries.push({
        ...routine,
        sessions: sessionSummaries,
      });
    }

    return summaries;
  },
});

export const getDetailedById = query({
  args: {
    routineId: v.id("routines"),
  },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      return null;
    }

    return getDetailedRoutine(ctx, routine);
  },
});

export const listDetailed = query({
  args: {},
  handler: async (ctx) => {
    const routines = await ctx.db
      .query("routines")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();

    const detailed: RoutineDetailedRecord[] = [];
    for (const routine of routines) {
      detailed.push(await getDetailedRoutine(ctx, routine));
    }

    return detailed;
  },
});

export const getActiveDetailed = query({
  args: {},
  handler: async (ctx) => {
    const activeRoutine = await ctx.db
      .query("routines")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();
    if (!activeRoutine) {
      return null;
    }

    return getDetailedRoutine(ctx, activeRoutine);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    daysPerWeek: v.number(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const daysPerWeek = normalizeDaysPerWeek(args.daysPerWeek);
    const name = requireName(args.name, "Routine name", MAX_ROUTINE_NAME_LENGTH);
    const nameKey = normalizeDisplayNameKey(name);

    await ensureUniqueRoutineName(ctx, name);

    const routineId = await ctx.db.insert("routines", {
      name,
      nameKey,
      daysPerWeek,
      isActive: false,
      sessionOrder: [],
      weeklyPlan: generateDefaultWeeklyPlan(daysPerWeek),
      updatedAt: now,
    });

    if (args.isActive !== false) {
      await setRoutineActiveState(ctx, routineId, true);
    }

    return routineId;
  },
});

export const update = mutation({
  args: {
    routineId: v.id("routines"),
    name: v.optional(v.string()),
    daysPerWeek: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.routineId);
    assert(routine, "Routine not found.");

    const patch: Partial<Doc<"routines">> = {
      updatedAt: Date.now(),
    };

    if (typeof args.name === "string") {
      const name = requireName(args.name, "Routine name", MAX_ROUTINE_NAME_LENGTH);
      await ensureUniqueRoutineName(ctx, name, { excludeRoutineId: args.routineId });
      patch.name = name;
      patch.nameKey = normalizeDisplayNameKey(name);
    }

    if (typeof args.daysPerWeek === "number") {
      const normalizedDaysPerWeek = normalizeDaysPerWeek(args.daysPerWeek);
      patch.daysPerWeek = normalizedDaysPerWeek;
      patch.weeklyPlan = generateDefaultWeeklyPlan(normalizedDaysPerWeek);
    }

    await ctx.db.patch(args.routineId, patch);
  },
});

export const deleteRoutine = mutation({
  args: {
    routineId: v.id("routines"),
  },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.routineId);
    assert(routine, "Routine not found.");

    const sessions = await getSessionsByRoutine(ctx, args.routineId);
    for (const session of sessions) {
      const sessionExerciseList = await getSessionExercisesBySession(
        ctx,
        session._id,
      );
      for (const sessionExercise of sessionExerciseList) {
        await ctx.db.delete(sessionExercise._id);
      }
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(args.routineId);

    if (routine.isActive) {
      const remaining = await ctx.db
        .query("routines")
        .withIndex("by_updatedAt")
        .order("desc")
        .collect();
      if (remaining.length > 0) {
        await setRoutineActiveState(ctx, remaining[0]._id, true);
      }
    }
  },
});

export const setActive = mutation({
  args: {
    routineId: v.id("routines"),
  },
  handler: async (ctx, args) => {
    await setRoutineActiveState(ctx, args.routineId, true);
  },
});

export const toggleActive = mutation({
  args: {
    routineId: v.id("routines"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await setRoutineActiveState(ctx, args.routineId, args.isActive);
  },
});

export const upsertSession = mutation({
  args: {
    routineId: v.id("routines"),
    sessionId: v.optional(v.id("routineSessions")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.routineId);
    assert(routine, "Routine not found.");
    const name = requireName(args.name, "Section name", MAX_SECTION_NAME_LENGTH);
    const nameKey = normalizeDisplayNameKey(name);

    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId);
      assert(Boolean(session), "Section not found.");
      assert(
        session?.routineId === args.routineId,
        "Section does not belong to routine.",
      );
      await ensureUniqueSessionName(ctx, args.routineId, name, {
        excludeSessionId: args.sessionId,
      });
      await ctx.db.patch(args.sessionId, {
        name,
        nameKey,
        updatedAt: Date.now(),
      });
      return args.sessionId;
    }

    await ensureUniqueSessionName(ctx, args.routineId, name);

    const sessions = await getSessionsByRoutine(ctx, args.routineId);
    const nextOrder = sessions.length;

    const sessionId = await ctx.db.insert("routineSessions", {
      routineId: args.routineId,
      name,
      nameKey,
      order: nextOrder,
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.routineId, {
      sessionOrder: [...routine.sessionOrder, sessionId],
      updatedAt: Date.now(),
    });

    return sessionId;
  },
});

export const deleteSession = mutation({
  args: {
    routineId: v.id("routines"),
    sessionId: v.id("routineSessions"),
  },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.routineId);
    const session = await ctx.db.get(args.sessionId);
    assert(routine, "Routine not found.");
    assert(session, "Section not found.");
    assert(session.routineId === args.routineId, "Section does not belong to routine.");

    const sessionExerciseList = await getSessionExercisesBySession(
      ctx,
      args.sessionId,
    );
    for (const sessionExercise of sessionExerciseList) {
      await ctx.db.delete(sessionExercise._id);
    }

    await ctx.db.delete(args.sessionId);

    const remainingSessions = sortByOrder(
      await getSessionsByRoutine(ctx, args.routineId),
    );
    for (let index = 0; index < remainingSessions.length; index += 1) {
      await ctx.db.patch(remainingSessions[index]._id, {
        order: index,
        updatedAt: Date.now(),
      });
    }

    const nextOrder = remainingSessions.map((item) => item._id);

    const adjustedWeeklyPlan = (routine.weeklyPlan as WeeklyPlanEntry[]).map(
      (entry) => {
        if (
          entry.assignmentMode === "manual" &&
          entry.manualSessionId === args.sessionId
        ) {
          return {
            day: entry.day,
            type: "train" as const,
            assignmentMode: "auto" as const,
            manualSessionId: undefined,
          };
        }
        return entry;
      },
    );

    await ctx.db.patch(args.routineId, {
      sessionOrder: nextOrder,
      weeklyPlan: adjustedWeeklyPlan,
      updatedAt: Date.now(),
    });
  },
});

export const reorderSessions = mutation({
  args: {
    routineId: v.id("routines"),
    orderedSessionIds: v.array(v.id("routineSessions")),
  },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.routineId);
    assert(routine, "Routine not found.");

    const sessions = await getSessionsByRoutine(ctx, args.routineId);
    assert(
      sessions.length === args.orderedSessionIds.length,
      "Section reorder payload size mismatch.",
    );

    const existingIds = new Set(sessions.map((session) => session._id));
    for (const sessionId of args.orderedSessionIds) {
      assert(existingIds.has(sessionId), "Invalid section id for this routine.");
    }

    for (let index = 0; index < args.orderedSessionIds.length; index += 1) {
      await ctx.db.patch(args.orderedSessionIds[index], {
        order: index,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.routineId, {
      sessionOrder: args.orderedSessionIds,
      updatedAt: Date.now(),
    });
  },
});

export const upsertSessionExercise = mutation({
  args: {
    sessionId: v.id("routineSessions"),
    sessionExerciseId: v.optional(v.id("sessionExercises")),
    exerciseId: v.id("exercises"),
    sets: v.optional(v.number()),
    repsText: v.optional(v.string()),
    targetWeightKg: v.optional(v.number()),
    restSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
    tempo: v.optional(v.string()),
    rir: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    const exercise = await ctx.db.get(args.exerciseId);
    assert(session, "Section not found.");
    assert(exercise, "Exercise not found.");

    if (args.sessionExerciseId) {
      const existing = await ctx.db.get(args.sessionExerciseId);
      assert(existing, "Section exercise not found.");
      assert(
        existing.sessionId === args.sessionId,
        "Section exercise does not belong to section.",
      );

      const nextProgramming = buildProgrammingPatch(existing, args);

      await ctx.db.patch(args.sessionExerciseId, {
        exerciseId: args.exerciseId,
        ...nextProgramming,
        updatedAt: Date.now(),
      });
      return args.sessionExerciseId;
    }

    const current = await getSessionExercisesBySession(ctx, args.sessionId);
    const nextProgramming = buildProgrammingRecord(args);
    return ctx.db.insert("sessionExercises", {
      sessionId: args.sessionId,
      exerciseId: args.exerciseId,
      order: current.length,
      ...nextProgramming,
      updatedAt: Date.now(),
    });
  },
});

export const updateSessionExerciseProgramming = mutation({
  args: {
    sessionId: v.id("routineSessions"),
    sessionExerciseId: v.id("sessionExercises"),
    sets: v.optional(v.number()),
    repsText: v.optional(v.string()),
    targetWeightKg: v.optional(v.number()),
    restSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
    tempo: v.optional(v.string()),
    rir: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.sessionExerciseId);
    assert(entry, "Section exercise not found.");
    assert(
      entry.sessionId === args.sessionId,
      "Section exercise does not belong to section.",
    );

    await ctx.db.patch(args.sessionExerciseId, {
      ...buildProgrammingPatch(entry, args),
      updatedAt: Date.now(),
    });
  },
});

export const deleteSessionExercise = mutation({
  args: {
    sessionId: v.id("routineSessions"),
    sessionExerciseId: v.id("sessionExercises"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.sessionExerciseId);
    assert(entry, "Section exercise not found.");
    assert(
      entry.sessionId === args.sessionId,
      "Section exercise does not belong to section.",
    );

    await ctx.db.delete(args.sessionExerciseId);

    const remaining = sortByOrder(
      await getSessionExercisesBySession(ctx, args.sessionId),
    );
    for (let index = 0; index < remaining.length; index += 1) {
      await ctx.db.patch(remaining[index]._id, {
        order: index,
        updatedAt: Date.now(),
      });
    }
  },
});

export const reorderSessionExercises = mutation({
  args: {
    sessionId: v.id("routineSessions"),
    orderedSessionExerciseIds: v.array(v.id("sessionExercises")),
  },
  handler: async (ctx, args) => {
    const current = await getSessionExercisesBySession(ctx, args.sessionId);
    assert(
      current.length === args.orderedSessionExerciseIds.length,
      "Section exercise reorder payload size mismatch.",
    );

    const currentIds = new Set(current.map((entry) => entry._id));
    for (const entryId of args.orderedSessionExerciseIds) {
      assert(currentIds.has(entryId), "Invalid section exercise id for this section.");
    }

    for (
      let index = 0;
      index < args.orderedSessionExerciseIds.length;
      index += 1
    ) {
      await ctx.db.patch(args.orderedSessionExerciseIds[index], {
        order: index,
        updatedAt: Date.now(),
      });
    }
  },
});

export const updateWeeklyPlan = mutation({
  args: {
    routineId: v.id("routines"),
    weeklyPlan: v.array(weeklyPlanEntry),
  },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.routineId);
    assert(routine, "Routine not found.");

    const normalizedPlan = sortWeeklyPlan(args.weeklyPlan as WeeklyPlanEntry[]);
    const daysPerWeek = normalizedPlan.filter(
      (entry) => entry.type === "train",
    ).length;

    await validateWeeklyPlan(ctx, args.routineId, normalizedPlan, daysPerWeek);

    await ctx.db.patch(args.routineId, {
      weeklyPlan: normalizedPlan,
      daysPerWeek,
      updatedAt: Date.now(),
    });
  },
});

export const seedDefaultsIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    const existingRoutine = await ctx.db.query("routines").first();
    if (existingRoutine) {
      return { seeded: false };
    }

    const now = Date.now();

    const exerciseSeeds = [
      {
        name: "Bench Press",
        bodyPart: "chest" as const,
        equipment: "barbell" as const,
        primaryMuscle: "pectorals" as const,
        muscleGroups: ["pectorals", "triceps", "delts"],
      },
      {
        name: "Back Squat",
        bodyPart: "upper legs" as const,
        equipment: "barbell" as const,
        primaryMuscle: "quads" as const,
        muscleGroups: ["quads", "glutes", "abs"],
      },
      {
        name: "Pull-Up",
        bodyPart: "back" as const,
        equipment: "body weight" as const,
        primaryMuscle: "lats" as const,
        muscleGroups: ["lats", "biceps", "abs"],
      },
      {
        name: "Shoulder Press",
        bodyPart: "shoulders" as const,
        equipment: "leverage machine" as const,
        primaryMuscle: "delts" as const,
        muscleGroups: ["delts", "triceps"],
      },
      {
        name: "Romanian Deadlift",
        bodyPart: "upper legs" as const,
        equipment: "barbell" as const,
        primaryMuscle: "hamstrings" as const,
        muscleGroups: ["hamstrings", "glutes", "spine"],
      },
    ];

    const exerciseIds: Id<"exercises">[] = [];
    for (const exercise of exerciseSeeds) {
      exerciseIds.push(
        await ctx.db.insert(
          "exercises",
          normalizeExerciseCatalog({
            ...exercise,
            isCustom: false,
          }),
        ),
      );
    }

    const routineId = await ctx.db.insert("routines", {
      name: "Push / Pull / Legs",
      nameKey: normalizeDisplayNameKey("Push / Pull / Legs"),
      daysPerWeek: 4,
      isActive: true,
      sessionOrder: [],
      weeklyPlan: generateDefaultWeeklyPlan(4),
      updatedAt: now,
    });

    const sessionNames = ["Push", "Pull", "Legs"];
    const sessionIds: Id<"routineSessions">[] = [];

    for (let index = 0; index < sessionNames.length; index += 1) {
      sessionIds.push(
        await ctx.db.insert("routineSessions", {
          routineId,
          name: sessionNames[index],
          nameKey: normalizeDisplayNameKey(sessionNames[index]),
          order: index,
          updatedAt: now,
        }),
      );
    }

    await ctx.db.patch(routineId, {
      sessionOrder: sessionIds,
      updatedAt: now,
    });

    const sessionExercisePairs: [Id<"routineSessions">, {
      exerciseId: Id<"exercises">;
      sets: number;
      repsText: string;
      restSeconds: number;
    }[]][] = [
      [
        sessionIds[0],
        [
          { exerciseId: exerciseIds[0], sets: 4, repsText: "6-8", restSeconds: 120 },
          { exerciseId: exerciseIds[3], sets: 3, repsText: "8-12", restSeconds: 90 },
        ],
      ],
      [
        sessionIds[1],
        [
          { exerciseId: exerciseIds[2], sets: 4, repsText: "6-10", restSeconds: 120 },
          { exerciseId: exerciseIds[4], sets: 3, repsText: "6-10", restSeconds: 120 },
        ],
      ],
      [
        sessionIds[2],
        [
          { exerciseId: exerciseIds[1], sets: 4, repsText: "5-8", restSeconds: 150 },
          { exerciseId: exerciseIds[4], sets: 3, repsText: "6-10", restSeconds: 120 },
        ],
      ],
    ];

    for (const [sessionId, localExercises] of sessionExercisePairs) {
      for (let index = 0; index < localExercises.length; index += 1) {
        const exercise = localExercises[index];
        await ctx.db.insert("sessionExercises", {
          sessionId,
          exerciseId: exercise.exerciseId,
          order: index,
          sets: exercise.sets,
          repsText: exercise.repsText,
          restSeconds: exercise.restSeconds,
          updatedAt: now,
        });
      }
    }

    return { seeded: true };
  },
});
