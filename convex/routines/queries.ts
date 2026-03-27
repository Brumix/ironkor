import {
  getDetailedRoutine,
  getSessionsByRoutine,
  sortByOrder,
} from "./helpers";
import { requireRoutineOwner, requireViewer } from "../authHelpers";

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
  const { viewer } = await requireViewer(ctx);
  const limit = Math.min(Math.max(1, Math.floor(args.limit ?? 30)), 100);
  const routines = await ctx.db
    .query("routines")
    .withIndex("by_userId_and_updatedAt", (q) => q.eq("userId", viewer._id))
    .order("desc")
    .take(limit);

  const summaries: RoutineSummaryRecord[] = [];
  for (const routine of routines) {
    const sessions = sortByOrder(await getSessionsByRoutine(ctx, routine._id, viewer._id));
    const sessionSummaries: RoutineSectionSummaryRecord[] = [];
    for (const session of sessions) {
      let exerciseCount = 0;
      const sessionExerciseQuery = ctx.db
        .query("sessionExercises")
        .withIndex("by_userId_and_session", (q) =>
          q.eq("userId", viewer._id).eq("sessionId", session._id),
        );
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
  const { routine } = await requireRoutineOwner(ctx, args.routineId);
  return getDetailedRoutine(ctx, routine);
}

export async function listDetailedHandler(
  ctx: QueryCtx,
): Promise<RoutineDetailedRecord[]> {
  const { viewer } = await requireViewer(ctx);
  const routines = await ctx.db
    .query("routines")
    .withIndex("by_userId_and_updatedAt", (q) => q.eq("userId", viewer._id))
    .order("desc")
    .collect();

  const detailed: RoutineDetailedRecord[] = [];
  for (const routine of routines) {
    detailed.push(await getDetailedRoutine(ctx, routine));
  }

  return detailed;
}

export async function getActiveDetailedHandler(ctx: QueryCtx) {
  const { viewer } = await requireViewer(ctx);
  const activeRoutine = await ctx.db
    .query("routines")
    .withIndex("by_userId_and_isActive", (q) =>
      q.eq("userId", viewer._id).eq("isActive", true),
    )
    .first();
  if (!activeRoutine) {
    return null;
  }

  return getDetailedRoutine(ctx, activeRoutine);
}
