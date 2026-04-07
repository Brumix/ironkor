import { normalizeDisplayNameKey } from "@ironkor/shared/strings";
import { Migrations } from "@convex-dev/migrations";

import { components, internal } from "./_generated/api";
import { ACCOUNT_RESTORE_WINDOW_MS, isDeletedUser } from "./authHelpers";
import { ONBOARDING_VERSION } from "./profileHelpers";
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
type UserWithOptionalAccountLifecycle = Doc<"users"> & {
  accountStatus?: "active" | "deleted";
  deletedAt?: number;
  restoreEligibleUntil?: number;
  restoreDecision?: "pending" | "declined";
};
type AccountDeletionJobWithOptionalRestorationStatus = Doc<"accountDeletionJobs"> & {
  restorationStatus?: "not_restored" | "restored";
};
type AccountDeletionJobWithOptionalPurgeStatus = Doc<"accountDeletionJobs"> & {
  purgeStatus?: "scheduled" | "purging" | "purged" | "canceled" | "failed";
  purgeScheduledAt?: number;
  purgedAt?: number;
};
type RoutineSessionWithOptionalExerciseCount = Doc<"routineSessions"> & {
  exerciseCount?: number;
};
type UserProfileDoc = Doc<"userProfiles">;

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

export const backfillRoutineSessionExerciseCounts = migrations.define({
  table: "routineSessions",
  migrateOne: async (ctx, session: RoutineSessionWithOptionalExerciseCount) => {
    if (session.userId === undefined) {
      return undefined;
    }

    const exercises = await ctx.db
      .query("sessionExercises")
      .withIndex("by_userId_and_session", (q) =>
        q.eq("userId", session.userId).eq("sessionId", session._id),
      )
      .collect();

    if (session.exerciseCount === exercises.length) {
      return undefined;
    }

    return {
      exerciseCount: exercises.length,
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

export const backfillUserAccountLifecycle = migrations.define({
  table: "users",
  migrateOne: async (_ctx, user: UserWithOptionalAccountLifecycle) => {
    if (user.accountStatus !== undefined) {
      return undefined;
    }

    const hasLegacyDeletionMarker =
      user.deletionStatus !== undefined ||
      user.deletionRequestedAt !== undefined ||
      user.deletionJobId !== undefined;

    if (!hasLegacyDeletionMarker) {
      return {
        accountStatus: "active" as const,
      };
    }

    const deletedAt = user.deletionRequestedAt ?? user.updatedAt ?? user._creationTime;
    return {
      accountStatus: "deleted" as const,
      deletedAt,
      restoreDecision: "pending" as const,
      restoreEligibleUntil: deletedAt + ACCOUNT_RESTORE_WINDOW_MS,
    };
  },
});

export const backfillAccountDeletionJobRestorationStatus = migrations.define({
  table: "accountDeletionJobs",
  migrateOne: async (_ctx, job: AccountDeletionJobWithOptionalRestorationStatus) => {
    if (job.restorationStatus !== undefined) {
      return undefined;
    }

    return {
      restorationStatus: "not_restored" as const,
    };
  },
});

export const backfillAccountDeletionJobPurgeStatus = migrations.define({
  table: "accountDeletionJobs",
  migrateOne: async (_ctx, job: AccountDeletionJobWithOptionalPurgeStatus) => {
    if (job.purgeStatus !== undefined && job.purgeScheduledAt !== undefined) {
      return undefined;
    }

    if (job.purgedAt !== undefined) {
      return {
        purgeStatus: "purged" as const,
        purgeScheduledAt: job.purgeScheduledAt ?? job.purgedAt,
      };
    }

    if (job.restorationStatus === "restored") {
      return {
        purgeStatus: "canceled" as const,
        purgeScheduledAt: job.purgeScheduledAt ?? job.restoreEligibleUntil,
      };
    }

    return {
      purgeStatus: "scheduled" as const,
      purgeScheduledAt: job.purgeScheduledAt ?? job.restoreEligibleUntil,
    };
  },
});

export const repairDuplicateActiveUsers = migrations.define({
  table: "users",
  migrateOne: async (ctx, user: UserWithOptionalAccountLifecycle) => {
    if (isDeletedUser(user)) {
      return undefined;
    }

    const relatedUsers = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", user.tokenIdentifier))
      .collect();
    const activeUsers = relatedUsers
      .filter((candidate) => !isDeletedUser(candidate))
      .sort((left, right) => {
        const updatedAtDelta = (right.updatedAt ?? right._creationTime) - (left.updatedAt ?? left._creationTime);
        if (updatedAtDelta !== 0) {
          return updatedAtDelta;
        }
        return right._creationTime - left._creationTime;
      });

    if (activeUsers.length <= 1 || activeUsers[0]?._id === user._id) {
      return undefined;
    }

    const deletedAt = user.updatedAt ?? user.createdAt ?? user._creationTime;
    return {
      accountStatus: "deleted" as const,
      deletedAt,
      restoreDecision: "declined" as const,
      restoreEligibleUntil: deletedAt,
    };
  },
});

export const backfillLegacyUserProfiles = migrations.define({
  table: "users",
  migrateOne: async (ctx, user: UserWithOptionalAccountLifecycle) => {
    const accountStatus = user.accountStatus ?? "active";
    if (accountStatus !== "active") {
      return undefined;
    }

    const existingProfile: UserProfileDoc | null = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (existingProfile) {
      return undefined;
    }

    const completedAt = user.updatedAt ?? user.createdAt ?? user._creationTime;
    await ctx.db.insert("userProfiles", {
      userId: user._id,
      onboardingStatus: "complete",
      onboardingVersion: ONBOARDING_VERSION,
      completionMethod: "legacy_backfill",
      completedAt,
      createdAt: user.createdAt ?? user._creationTime,
      updatedAt: completedAt,
    });

    return undefined;
  },
});

export const run = migrations.runner();

export const runAll = migrations.runner([
  internal.migrations.backfillRoutineNameKeys,
  internal.migrations.backfillRoutineSessionNameKeys,
  internal.migrations.backfillRoutineUserIds,
  internal.migrations.backfillRoutineWeeklyPlans,
  internal.migrations.backfillRoutineSessionUserIds,
  internal.migrations.backfillRoutineSessionExerciseCounts,
  internal.migrations.backfillSessionExerciseUserIds,
  internal.migrations.backfillUserAccountLifecycle,
  internal.migrations.backfillAccountDeletionJobRestorationStatus,
  internal.migrations.backfillAccountDeletionJobPurgeStatus,
  internal.migrations.repairDuplicateActiveUsers,
  internal.migrations.backfillLegacyUserProfiles,
]);
