import { normalizeDisplayNameKey } from "@ironkor/shared/strings";

import {
  MAX_SESSIONS_PER_ROUTINE,
  MAX_SECTION_NAME_LENGTH,
  WeeklyPlanEntry,
  assert,
  ensureUniqueSessionName,
  getSessionExercisesBySession,
  getSessionsByRoutine,
  requireName,
  sortByOrder,
} from "./helpers";
import { requireRoutineOwner, requireSessionOwner } from "../authHelpers";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function upsertSessionHandler(
  ctx: MutationCtx,
  args: {
    routineId: Id<"routines">;
    sessionId?: Id<"routineSessions">;
    name: string;
  },
) {
  const { viewer, routine } = await requireRoutineOwner(ctx, args.routineId);
  const name = requireName(args.name, "Section name", MAX_SECTION_NAME_LENGTH);
  const nameKey = normalizeDisplayNameKey(name);

  if (args.sessionId) {
    const { session } = await requireSessionOwner(ctx, args.sessionId);
    assert(
      session.routineId === args.routineId,
      "Section does not belong to routine.",
    );
    await ensureUniqueSessionName(ctx, viewer._id, args.routineId, name, {
      excludeSessionId: args.sessionId,
    });
    await ctx.db.patch(args.sessionId, {
      name,
      nameKey,
      updatedAt: Date.now(),
    });
    return args.sessionId;
  }

  await ensureUniqueSessionName(ctx, viewer._id, args.routineId, name);

  const sessions = await getSessionsByRoutine(ctx, args.routineId, viewer._id);
  assert(
    sessions.length < MAX_SESSIONS_PER_ROUTINE,
    `Routines can have at most ${MAX_SESSIONS_PER_ROUTINE} sections.`,
  );
  const nextOrder = sessions.length;

  const sessionId = await ctx.db.insert("routineSessions", {
    userId: viewer._id,
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
}

export async function deleteSessionHandler(
  ctx: MutationCtx,
  args: {
    routineId: Id<"routines">;
    sessionId: Id<"routineSessions">;
  },
) {
  const { viewer, routine } = await requireRoutineOwner(ctx, args.routineId);
  const { session } = await requireSessionOwner(ctx, args.sessionId);
  assert(session.routineId === args.routineId, "Section does not belong to routine.");

  const sessionExerciseList = await getSessionExercisesBySession(
    ctx,
    args.sessionId,
    viewer._id,
  );
  for (const sessionExercise of sessionExerciseList) {
    await ctx.db.delete(sessionExercise._id);
  }

  await ctx.db.delete(args.sessionId);

  const remainingSessions = sortByOrder(await getSessionsByRoutine(ctx, args.routineId, viewer._id));
  for (let index = 0; index < remainingSessions.length; index += 1) {
    await ctx.db.patch(remainingSessions[index]._id, {
      order: index,
      updatedAt: Date.now(),
    });
  }

  const nextOrder = remainingSessions.map((item) => item._id);

  const adjustedWeeklyPlan = (routine.weeklyPlan as WeeklyPlanEntry[]).map((entry) => {
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
  });

  await ctx.db.patch(args.routineId, {
    sessionOrder: nextOrder,
    weeklyPlan: adjustedWeeklyPlan,
    updatedAt: Date.now(),
  });
}

export async function reorderSessionsHandler(
  ctx: MutationCtx,
  args: {
    routineId: Id<"routines">;
    orderedSessionIds: Id<"routineSessions">[];
  },
) {
  const { viewer, routine } = await requireRoutineOwner(ctx, args.routineId);

  const sessions = await getSessionsByRoutine(ctx, args.routineId, viewer._id);
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
}
