import { normalizeDisplayNameKey } from "@ironkor/shared/strings";

import {
  MAX_ROUTINE_NAME_LENGTH,
  assert,
  ensureUniqueRoutineName,
  generateDefaultWeeklyPlan,
  getSessionsByRoutine,
  normalizeDaysPerWeek,
  requireName,
  setRoutineActiveState,
} from "./helpers";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function createHandler(
  ctx: MutationCtx,
  args: {
    name: string;
    daysPerWeek: number;
    isActive?: boolean;
  },
) {
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
}

export async function updateHandler(
  ctx: MutationCtx,
  args: {
    routineId: Id<"routines">;
    name?: string;
    daysPerWeek?: number;
  },
) {
  const routine = await ctx.db.get(args.routineId);
  assert(routine, "Routine not found.");

  const patch: Partial<typeof routine> = {
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
}

export async function deleteRoutineHandler(
  ctx: MutationCtx,
  args: {
    routineId: Id<"routines">;
  },
) {
  const routine = await ctx.db.get(args.routineId);
  assert(routine, "Routine not found.");

  const sessions = await getSessionsByRoutine(ctx, args.routineId);
  for (const session of sessions) {
    const sessionExerciseList = await ctx.db
      .query("sessionExercises")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
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
}

export async function setActiveHandler(
  ctx: MutationCtx,
  args: { routineId: Id<"routines"> },
) {
  await setRoutineActiveState(ctx, args.routineId, true);
}

export async function toggleActiveHandler(
  ctx: MutationCtx,
  args: { routineId: Id<"routines">; isActive: boolean },
) {
  await setRoutineActiveState(ctx, args.routineId, args.isActive);
}
