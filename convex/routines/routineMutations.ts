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
import { requireRoutineOwner, requireViewer } from "../authHelpers";

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
  const { viewer } = await requireViewer(ctx);
  const now = Date.now();
  const daysPerWeek = normalizeDaysPerWeek(args.daysPerWeek);
  const name = requireName(args.name, "Routine name", MAX_ROUTINE_NAME_LENGTH);
  const nameKey = normalizeDisplayNameKey(name);

  await ensureUniqueRoutineName(ctx, viewer._id, name);

  const routineId = await ctx.db.insert("routines", {
    userId: viewer._id,
    name,
    nameKey,
    daysPerWeek,
    isActive: false,
    sessionOrder: [],
    weeklyPlan: generateDefaultWeeklyPlan(daysPerWeek),
    updatedAt: now,
  });

  if (args.isActive !== false) {
    await setRoutineActiveState(ctx, viewer._id, routineId, true);
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
  const { viewer, routine } = await requireRoutineOwner(ctx, args.routineId);

  const patch: Partial<typeof routine> = {
    updatedAt: Date.now(),
  };

  if (typeof args.name === "string") {
    const name = requireName(args.name, "Routine name", MAX_ROUTINE_NAME_LENGTH);
    await ensureUniqueRoutineName(ctx, viewer._id, name, { excludeRoutineId: args.routineId });
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
  const { viewer, routine } = await requireRoutineOwner(ctx, args.routineId);

  const sessions = await getSessionsByRoutine(ctx, args.routineId, viewer._id);
  for (const session of sessions) {
    const sessionExerciseList = await ctx.db
      .query("sessionExercises")
      .withIndex("by_userId_and_session", (q) =>
        q.eq("userId", viewer._id).eq("sessionId", session._id),
      )
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
      .withIndex("by_userId_and_updatedAt", (q) => q.eq("userId", viewer._id))
      .order("desc")
      .take(1);
    if (remaining[0]) {
      await setRoutineActiveState(ctx, viewer._id, remaining[0]._id, true);
    }
  }
}

export async function setActiveHandler(
  ctx: MutationCtx,
  args: { routineId: Id<"routines"> },
) {
  const { viewer } = await requireRoutineOwner(ctx, args.routineId);
  await setRoutineActiveState(ctx, viewer._id, args.routineId, true);
}

export async function toggleActiveHandler(
  ctx: MutationCtx,
  args: { routineId: Id<"routines">; isActive: boolean },
) {
  const { viewer } = await requireRoutineOwner(ctx, args.routineId);
  await setRoutineActiveState(ctx, viewer._id, args.routineId, args.isActive);
}
