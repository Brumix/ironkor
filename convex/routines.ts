import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { weeklyPlanEntry } from "./schemas/routines";

import type { Doc, Id } from "./_generated/dataModel";
import type {
  DatabaseReader,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";


const DAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;
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

function normalizeDaysPerWeek(daysPerWeek: number) {
  return Math.min(7, Math.max(1, Math.floor(daysPerWeek)));
}

function generateDefaultWeeklyPlan(daysPerWeek: number): WeeklyPlanEntry[] {
  const normalizedDays = normalizeDaysPerWeek(daysPerWeek);
  const trainingDays = new Set(TRAINING_DAY_MAP[normalizedDays] ?? TRAINING_DAY_MAP[4]);

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

async function validateWeeklyPlan(
  ctx: QueryCtx,
  routineId: Id<"routines">,
  weeklyPlan: WeeklyPlanEntry[],
  expectedDaysPerWeek?: number,
) {
  assert(weeklyPlan.length === 7, "Weekly plan must include 7 days.");

  const daySet = new Set<number>();
  for (const entry of weeklyPlan) {
    assert(entry.day >= 0 && entry.day <= 6, "Weekly plan day must be between 0 and 6.");
    assert(!daySet.has(entry.day), "Weekly plan cannot repeat days.");
    daySet.add(entry.day);

    if (entry.type === "rest") {
      assert(entry.assignmentMode === "auto", "Rest day must use auto assignment mode.");
      assert(!entry.manualSessionId, "Rest day cannot have manual session assignment.");
    }

    if (entry.type === "train" && entry.assignmentMode === "manual") {
      assert(Boolean(entry.manualSessionId), "Manual train day must define a session.");
      const manualSession = entry.manualSessionId
        ? await ctx.db.get(entry.manualSessionId)
        : null;
      assert(manualSession, "Manual day references a missing session.");
      assert(
        manualSession.routineId === routineId,
        "Manual day session must belong to the same routine.",
      );
    }
  }

  const trainingDays = weeklyPlan.filter((entry) => entry.type === "train").length;
  if (typeof expectedDaysPerWeek === "number") {
    assert(trainingDays === expectedDaysPerWeek, "daysPerWeek must match number of training days in weekly plan.");
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
        await ctx.db.patch(routine._id, { isActive: false, updatedAt: Date.now() });
      }
    }
  }

  await ctx.db.patch(routineId, {
    isActive,
    updatedAt: Date.now(),
  });
}

async function getDetailedRoutine(ctx: QueryCtx, routine: Doc<"routines">) {
  const sessions = sortByOrder(await getSessionsByRoutine(ctx, routine._id));
  ensureContiguousOrder(sessions, "Session");

  const detailedSessions: {
    _id: Id<"routineSessions">;
    name: string;
    order: number;
    exercises: { _id: Id<"sessionExercises">; order: number; exercise: Doc<"exercises"> }[];
  }[] = [];

  for (const session of sessions) {
    const sessionExerciseList = sortByOrder(
      await getSessionExercisesBySession(ctx, session._id),
    );
    ensureContiguousOrder(sessionExerciseList, "Session exercise");

    const detailedExercises: {
      _id: Id<"sessionExercises">;
      order: number;
      exercise: Doc<"exercises">;
    }[] = [];

    for (const entry of sessionExerciseList) {
      const exercise = await ctx.db.get(entry.exerciseId);
      if (exercise) {
        detailedExercises.push({ _id: entry._id, order: entry.order, exercise });
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

export const listDetailed = query({
  args: {},
  handler: async (ctx) => {
    const routines = await ctx.db.query("routines").withIndex("by_updatedAt").order("desc").collect();
    const detailed = [];

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

    const routineId = await ctx.db.insert("routines", {
      name: args.name.trim(),
      daysPerWeek,
      isActive: false,
      sessionOrder: [],
      weeklyPlan: generateDefaultWeeklyPlan(daysPerWeek),
      createdAt: now,
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
      patch.name = args.name.trim();
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
      for (const se of sessionExerciseList) {
        await ctx.db.delete(se._id);
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

    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId);
      assert(Boolean(session), "Session not found.");
      assert(session?.routineId === args.routineId, "Session does not belong to routine.");
      await ctx.db.patch(args.sessionId, {
        name: args.name.trim(),
        updatedAt: Date.now(),
      });
      return args.sessionId;
    }

    const sessions = await getSessionsByRoutine(ctx, args.routineId);
    const nextOrder = sessions.length;

    const sessionId = await ctx.db.insert("routineSessions", {
      routineId: args.routineId,
      name: args.name.trim(),
      order: nextOrder,
      createdAt: Date.now(),
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
    assert(session, "Session not found.");
    assert(session.routineId === args.routineId, "Session does not belong to routine.");

    const sessionExerciseList = await getSessionExercisesBySession(
      ctx,
      args.sessionId,
    );
    for (const se of sessionExerciseList) {
      await ctx.db.delete(se._id);
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
      "Session reorder payload size mismatch.",
    );

    const existingIds = new Set(sessions.map((session) => session._id));
    for (const sessionId of args.orderedSessionIds) {
      assert(existingIds.has(sessionId), "Invalid session id for this routine.");
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
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    const exercise = await ctx.db.get(args.exerciseId);
    assert(session, "Session not found.");
    assert(exercise, "Exercise not found.");

    if (args.sessionExerciseId) {
      const existing = await ctx.db.get(args.sessionExerciseId);
      assert(existing, "Session exercise not found.");
      assert(existing.sessionId === args.sessionId, "Session exercise does not belong to session.");

      await ctx.db.patch(args.sessionExerciseId, {
        exerciseId: args.exerciseId,
        updatedAt: Date.now(),
      });
      return args.sessionExerciseId;
    }

    const current = await getSessionExercisesBySession(ctx, args.sessionId);
    return ctx.db.insert("sessionExercises", {
      sessionId: args.sessionId,
      exerciseId: args.exerciseId,
      order: current.length,
      createdAt: Date.now(),
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
    assert(entry, "Session exercise not found.");
    assert(entry.sessionId === args.sessionId, "Session exercise does not belong to session.");

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
      "Session exercise reorder payload size mismatch.",
    );

    const currentIds = new Set(current.map((entry) => entry._id));
    for (const entryId of args.orderedSessionExerciseIds) {
      assert(currentIds.has(entryId), "Invalid session exercise id for this session.");
    }

    for (let index = 0; index < args.orderedSessionExerciseIds.length; index += 1) {
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
    const daysPerWeek = normalizedPlan.filter((entry) => entry.type === "train").length;

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
        variant: "Barbell",
        setsTarget: 4,
        repsTarget: "6-8",
        restSeconds: 120,
        primaryMuscles: ["Chest"],
        secondaryMuscles: ["Triceps", "Front deltoid"],
      },
      {
        name: "Back Squat",
        variant: "Barbell",
        setsTarget: 4,
        repsTarget: "5-8",
        restSeconds: 150,
        primaryMuscles: ["Quads", "Glutes"],
        secondaryMuscles: ["Core"],
      },
      {
        name: "Pull-Up",
        variant: "Bodyweight",
        setsTarget: 4,
        repsTarget: "6-10",
        restSeconds: 120,
        primaryMuscles: ["Lats"],
        secondaryMuscles: ["Biceps", "Core"],
      },
      {
        name: "Shoulder Press",
        variant: "Machine",
        setsTarget: 3,
        repsTarget: "8-12",
        restSeconds: 90,
        primaryMuscles: ["Deltoids"],
        secondaryMuscles: ["Triceps"],
      },
      {
        name: "Romanian Deadlift",
        variant: "Barbell",
        setsTarget: 3,
        repsTarget: "6-10",
        restSeconds: 120,
        primaryMuscles: ["Hamstrings", "Glutes"],
        secondaryMuscles: ["Lower back"],
      },
    ];

    const exerciseIds: Id<"exercises">[] = [];
    for (const exercise of exerciseSeeds) {
      exerciseIds.push(
        await ctx.db.insert("exercises", {
          ...exercise,
          isCustom: false,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    const routineId = await ctx.db.insert("routines", {
      name: "Push / Pull / Legs",
      daysPerWeek: 4,
      isActive: true,
      sessionOrder: [],
      weeklyPlan: generateDefaultWeeklyPlan(4),
      createdAt: now,
      updatedAt: now,
    });

    const sessionNames = ["Push", "Pull", "Legs"];
    const sessionIds: Id<"routineSessions">[] = [];

    for (let index = 0; index < sessionNames.length; index += 1) {
      sessionIds.push(
        await ctx.db.insert("routineSessions", {
          routineId,
          name: sessionNames[index],
          order: index,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    await ctx.db.patch(routineId, {
      sessionOrder: sessionIds,
      updatedAt: now,
    });

    const sessionExercisePairs: [Id<"routineSessions">, Id<"exercises">[]][] = [
      [sessionIds[0], [exerciseIds[0], exerciseIds[3]]],
      [sessionIds[1], [exerciseIds[2], exerciseIds[4]]],
      [sessionIds[2], [exerciseIds[1], exerciseIds[4]]],
    ];

    for (const [sessionId, localExerciseIds] of sessionExercisePairs) {
      for (let index = 0; index < localExerciseIds.length; index += 1) {
        await ctx.db.insert("sessionExercises", {
          sessionId,
          exerciseId: localExerciseIds[index],
          order: index,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { seeded: true };
  },
});
