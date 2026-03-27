import {
  WeeklyPlanEntry,
  assert,
  sortWeeklyPlan,
  validateWeeklyPlan,
} from "./helpers";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function updateWeeklyPlanHandler(
  ctx: MutationCtx,
  args: {
    routineId: Id<"routines">;
    weeklyPlan: WeeklyPlanEntry[];
  },
) {
  const routine = await ctx.db.get(args.routineId);
  assert(routine, "Routine not found.");

  const normalizedPlan = sortWeeklyPlan(args.weeklyPlan);
  const daysPerWeek = normalizedPlan.filter((entry) => entry.type === "train").length;

  await validateWeeklyPlan(ctx, args.routineId, normalizedPlan, daysPerWeek);

  await ctx.db.patch(args.routineId, {
    weeklyPlan: normalizedPlan,
    daysPerWeek,
    updatedAt: Date.now(),
  });
}
