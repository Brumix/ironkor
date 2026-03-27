import {
  assert,
  buildProgrammingPatch,
  buildProgrammingRecord,
  getSessionExercisesBySession,
  sortByOrder,
} from "./helpers";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function upsertSessionExerciseHandler(
  ctx: MutationCtx,
  args: {
    sessionId: Id<"routineSessions">;
    sessionExerciseId?: Id<"sessionExercises">;
    exerciseId: Id<"exercises">;
    sets?: number;
    repsText?: string;
    targetWeightKg?: number;
    restSeconds?: number;
    notes?: string;
    tempo?: string;
    rir?: number;
  },
) {
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
}

export async function updateSessionExerciseProgrammingHandler(
  ctx: MutationCtx,
  args: {
    sessionId: Id<"routineSessions">;
    sessionExerciseId: Id<"sessionExercises">;
    sets?: number;
    repsText?: string;
    targetWeightKg?: number;
    restSeconds?: number;
    notes?: string;
    tempo?: string;
    rir?: number;
  },
) {
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
}

export async function deleteSessionExerciseHandler(
  ctx: MutationCtx,
  args: {
    sessionId: Id<"routineSessions">;
    sessionExerciseId: Id<"sessionExercises">;
  },
) {
  const entry = await ctx.db.get(args.sessionExerciseId);
  assert(entry, "Section exercise not found.");
  assert(
    entry.sessionId === args.sessionId,
    "Section exercise does not belong to section.",
  );

  await ctx.db.delete(args.sessionExerciseId);

  const remaining = sortByOrder(await getSessionExercisesBySession(ctx, args.sessionId));
  for (let index = 0; index < remaining.length; index += 1) {
    await ctx.db.patch(remaining[index]._id, {
      order: index,
      updatedAt: Date.now(),
    });
  }
}

export async function reorderSessionExercisesHandler(
  ctx: MutationCtx,
  args: {
    sessionId: Id<"routineSessions">;
    orderedSessionExerciseIds: Id<"sessionExercises">[];
  },
) {
  const current = await getSessionExercisesBySession(ctx, args.sessionId);
  assert(
    current.length === args.orderedSessionExerciseIds.length,
    "Section exercise reorder payload size mismatch.",
  );

  const currentIds = new Set(current.map((entry) => entry._id));
  for (const entryId of args.orderedSessionExerciseIds) {
    assert(currentIds.has(entryId), "Invalid section exercise id for this section.");
  }

  for (let index = 0; index < args.orderedSessionExerciseIds.length; index += 1) {
    await ctx.db.patch(args.orderedSessionExerciseIds[index], {
      order: index,
      updatedAt: Date.now(),
    });
  }
}
