import {
  getDetailedRoutine,
  getSessionsByRoutine,
  sortByOrder,
} from "./helpers";

import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type {
  RoutineDetailedRecord,
  RoutineSectionSummaryRecord,
  RoutineSummaryRecord,
} from "../types";

export async function listSummariesHandler(
  ctx: QueryCtx,
  args: { limit?: number },
): Promise<RoutineSummaryRecord[]> {
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
}

export async function getDetailedByIdHandler(
  ctx: QueryCtx,
  args: { routineId: Id<"routines"> },
) {
  const routine = await ctx.db.get(args.routineId);
  if (!routine) {
    return null;
  }

  return getDetailedRoutine(ctx, routine);
}

export async function listDetailedHandler(
  ctx: QueryCtx,
): Promise<RoutineDetailedRecord[]> {
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
}

export async function getActiveDetailedHandler(ctx: QueryCtx) {
  const activeRoutine = await ctx.db
    .query("routines")
    .withIndex("by_isActive", (q) => q.eq("isActive", true))
    .first();
  if (!activeRoutine) {
    return null;
  }

  return getDetailedRoutine(ctx, activeRoutine);
}
