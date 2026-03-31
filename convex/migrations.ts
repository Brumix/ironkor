import { normalizeDisplayNameKey } from "@ironkor/shared/strings";
import { Migrations } from "@convex-dev/migrations";

import { components, internal } from "./_generated/api";
import {
  countTrainingDays,
  getRoutineWeeklyPlan,
  isValidRoutineWeeklyPlan,
} from "./routines/helpers";
import type { DataModel, Doc } from "./_generated/dataModel";

const migrations = new Migrations<DataModel>(components.migrations);

type RoutineForMigration = Doc<"routines"> & { nameKey?: string };
type RoutineSessionForMigration = Doc<"routineSessions"> & { nameKey?: string };
type RoutineWithOptionalOwner = Doc<"routines"> & { userId?: Doc<"users">["_id"] };
type RoutineSessionWithOptionalOwner = Doc<"routineSessions"> & {
  userId?: Doc<"users">["_id"];
};
type SessionExerciseWithOptionalOwner = Doc<"sessionExercises"> & {
  userId?: Doc<"users">["_id"];
};
type RoutineWithLegacyWeeklyPlan = Omit<Doc<"routines">, "weeklyPlan"> & {
  weeklyPlan?: unknown;
};

export const backfillRoutineNameKeys = migrations.define({
  table: "routines",
  migrateOne: async (_ctx, routine: RoutineForMigration) => {
    if (routine.nameKey === undefined) {
      return {
        nameKey: normalizeDisplayNameKey(routine.name),
      };
    }

    return undefined;
  },
});

export const backfillRoutineSessionNameKeys = migrations.define({
  table: "routineSessions",
  migrateOne: async (_ctx, session: RoutineSessionForMigration) => {
    if (session.nameKey === undefined) {
      return {
        nameKey: normalizeDisplayNameKey(session.name),
      };
    }

    return undefined;
  },
});

export const backfillRoutineUserIds = migrations.define({
  table: "routines",
  migrateOne: async (_ctx, routine: RoutineWithOptionalOwner) => {
    // Older seed data can be unowned. We keep these records unchanged here so they can be
    // reviewed and cleaned explicitly before tightening the schema in a later deploy.
    if (routine.userId === undefined) {
      return undefined;
    }
    return undefined;
  },
});

export const backfillRoutineWeeklyPlans = migrations.define({
  table: "routines",
  migrateOne: async (_ctx, routine: RoutineWithLegacyWeeklyPlan) => {
    const weeklyPlan = getRoutineWeeklyPlan(routine);
    const daysPerWeek = countTrainingDays(weeklyPlan);

    if (
      isValidRoutineWeeklyPlan(routine.weeklyPlan) &&
      routine.daysPerWeek === daysPerWeek
    ) {
      return undefined;
    }

    return {
      weeklyPlan,
      daysPerWeek,
    };
  },
});

export const backfillRoutineSessionUserIds = migrations.define({
  table: "routineSessions",
  migrateOne: async (ctx, session: RoutineSessionWithOptionalOwner) => {
    if (session.userId !== undefined) {
      return undefined;
    }
    const routine = await ctx.db.get(session.routineId);
    if (!routine?.userId) {
      return undefined;
    }
    return {
      userId: routine.userId,
    };
  },
});

export const backfillSessionExerciseUserIds = migrations.define({
  table: "sessionExercises",
  migrateOne: async (ctx, entry: SessionExerciseWithOptionalOwner) => {
    if (entry.userId !== undefined) {
      return undefined;
    }
    const session = await ctx.db.get(entry.sessionId);
    if (!session?.userId) {
      return undefined;
    }
    return {
      userId: session.userId,
    };
  },
});

export const run = migrations.runner();

export const runAll = migrations.runner([
  internal.migrations.backfillRoutineNameKeys,
  internal.migrations.backfillRoutineSessionNameKeys,
  internal.migrations.backfillRoutineUserIds,
  internal.migrations.backfillRoutineWeeklyPlans,
  internal.migrations.backfillRoutineSessionUserIds,
  internal.migrations.backfillSessionExerciseUserIds,
]);
