import {
  MAX_EXERCISES_PER_SESSION,
  assert,
  buildProgrammingPatch,
  buildProgrammingRecord,
  getSessionExercisesBySession,
  sortByOrder,
} from "./helpers";
import {
  requireSessionExerciseOwner,
  requireSessionOwner,
} from "../authHelpers";

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
  const { viewer, session } = await requireSessionOwner(ctx, args.sessionId);
  const exercise = await ctx.db.get(args.exerciseId);
  assert(session, "Section not found.");
  assert(exercise, "Exercise not found.");
  if (exercise.isCustom) {
    assert(exercise.ownerId === viewer._id, "Unauthorized.");
  }

  if (args.sessionExerciseId) {
    const { sessionExercise: existing } = await requireSessionExerciseOwner(
      ctx,
      args.sessionExerciseId,
    );
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

  const current = await getSessionExercisesBySession(ctx, args.sessionId, viewer._id);
  assert(
    current.length < MAX_EXERCISES_PER_SESSION,
    `Sections can have at most ${MAX_EXERCISES_PER_SESSION} exercises.`,
  );
  const nextProgramming = buildProgrammingRecord(args);
  return ctx.db.insert("sessionExercises", {
    userId: viewer._id,
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
  const { sessionExercise: entry } = await (async () => {
    const ownedSession = await requireSessionOwner(ctx, args.sessionId);
    const ownedExercise = await requireSessionExerciseOwner(ctx, args.sessionExerciseId);
    return {
      sessionExercise: ownedExercise.sessionExercise,
    };
  })();
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
  const { viewer } = await requireSessionOwner(ctx, args.sessionId);
  const { sessionExercise: entry } = await requireSessionExerciseOwner(
    ctx,
    args.sessionExerciseId,
  );
  assert(
    entry.sessionId === args.sessionId,
    "Section exercise does not belong to section.",
  );

  await ctx.db.delete(args.sessionExerciseId);

  const remaining = sortByOrder(
    await getSessionExercisesBySession(ctx, args.sessionId, viewer._id),
  );
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
  const { viewer } = await requireSessionOwner(ctx, args.sessionId);
  const current = await getSessionExercisesBySession(ctx, args.sessionId, viewer._id);
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
