import { normalizeDisplayNameKey } from "@ironkor/shared/strings";
import { Migrations } from "@convex-dev/migrations";

import { components, internal } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";

const migrations = new Migrations<DataModel>(components.migrations);

type RoutineForMigration = Doc<"routines"> & { nameKey?: string };
type RoutineSessionForMigration = Doc<"routineSessions"> & { nameKey?: string };

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

export const run = migrations.runner();

export const runAll = migrations.runner([
  internal.migrations.backfillRoutineNameKeys,
  internal.migrations.backfillRoutineSessionNameKeys,
]);
