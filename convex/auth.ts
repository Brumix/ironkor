import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  ACCOUNT_RESTORE_WINDOW_MS,
  getDeletedAtTimestamp,
  getIdentitySnapshot,
  getRestoreCandidateByTokenIdentifier as findRestoreCandidateByTokenIdentifier,
  getRestoreEligibleUntilTimestamp,
  getViewerByTokenIdentifier as findViewerByTokenIdentifier,
  isDeletedUser,
  requireIdentity,
} from "./authHelpers";
import { createDraftProfile } from "./profileHelpers";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const ACCOUNT_DELETION_SNAPSHOT_BATCH_SIZE = 100;
const ACCOUNT_DELETION_RETRY_BASE_MS = 5_000;
const ACCOUNT_DELETION_RETRY_MAX_MS = 5 * 60 * 1000;
const ACCOUNT_DELETION_MAX_ATTEMPTS = 10;
const ACCOUNT_DELETION_ERROR_MAX_LENGTH = 280;
const ACCOUNT_DELETION_PURGE_RETRY_MS = 60_000;
const ACCOUNT_DELETION_PURGE_ENTITY_ORDER = [
  "sessionExercise",
  "routineSession",
  "customExercise",
  "routine",
  "userMeasurement",
  "userProfile",
] as const;

type AccountDeletionJob = Doc<"accountDeletionJobs">;
type SnapshotDoc = { _id: Id<any> };

function getAccountDeletionRetryMs(attempts: number) {
  return Math.min(
    ACCOUNT_DELETION_RETRY_MAX_MS,
    ACCOUNT_DELETION_RETRY_BASE_MS * 2 ** Math.max(0, attempts),
  );
}

function normalizeDeletionErrorMessage(
  errorMessage: string,
  fallbackMessage = "Unable to capture the deleted account snapshot.",
) {
  const trimmed = errorMessage.trim();
  if (trimmed.length === 0) {
    return fallbackMessage;
  }
  if (trimmed.length <= ACCOUNT_DELETION_ERROR_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, ACCOUNT_DELETION_ERROR_MAX_LENGTH - 3)}...`;
}

function toDeletionFailureMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Unable to capture the deleted account snapshot.";
}

async function scheduleAccountDeletionJob(
  ctx: Pick<MutationCtx, "scheduler">,
  jobId: Id<"accountDeletionJobs">,
  delayMs = 0,
) {
  await ctx.scheduler.runAfter(delayMs, internal.auth.processAccountDeletionJob, {
    jobId,
  });
}

async function scheduleAccountDeletionPurge(
  ctx: Pick<MutationCtx, "scheduler">,
  jobId: Id<"accountDeletionJobs">,
  delayMs = 0,
) {
  await ctx.scheduler.runAfter(delayMs, internal.auth.purgeDeletedAccountData, {
    jobId,
  });
}

async function patchAccountDeletionJobState(
  ctx: MutationCtx,
  jobId: Id<"accountDeletionJobs">,
  updates: Partial<Doc<"accountDeletionJobs">>,
) {
  await ctx.db.patch(jobId, {
    ...updates,
    updatedAt: Date.now(),
  });
}

async function patchViewerState(
  ctx: MutationCtx,
  viewerId: Id<"users">,
  updates: Partial<Doc<"users">>,
) {
  await ctx.db.patch(viewerId, {
    ...updates,
    updatedAt: Date.now(),
  });
}

async function insertAccountDeletionChunk(
  ctx: MutationCtx,
  args: {
    entityIds: Array<
      | Id<"routines">
      | Id<"routineSessions">
      | Id<"sessionExercises">
      | Id<"exercises">
      | Id<"userProfiles">
      | Id<"userMeasurements">
    >;
    entityType: Doc<"accountDeletionJobChunks">["entityType"];
    jobId: Id<"accountDeletionJobs">;
    chunkIndex: number;
  },
) {
  if (args.entityIds.length === 0) {
    return;
  }

  await ctx.db.insert("accountDeletionJobChunks", {
    jobId: args.jobId,
    entityType: args.entityType,
    chunkIndex: args.chunkIndex,
    entityIds: args.entityIds,
    createdAt: Date.now(),
  });
}

async function continueAccountDeletionJob(
  ctx: MutationCtx,
  job: AccountDeletionJob,
  cursor: string,
  chunkIndexDelta: number,
) {
  await patchAccountDeletionJobState(ctx, job._id, {
    status: "capturing",
    cursor,
    currentChunkIndex: job.currentChunkIndex + chunkIndexDelta,
    attempts: 0,
    lastError: undefined,
    scheduledAt: Date.now(),
  });
  await scheduleAccountDeletionJob(ctx, job._id);
  return { status: "capturing" as const };
}

async function advanceAccountDeletionJobPhase(
  ctx: MutationCtx,
  job: AccountDeletionJob,
  nextPhase: Doc<"accountDeletionJobs">["phase"],
) {
  await patchAccountDeletionJobState(ctx, job._id, {
    status: nextPhase === "complete" ? "complete" : "capturing",
    phase: nextPhase,
    cursor: undefined,
    currentChunkIndex: 0,
    attempts: 0,
    lastError: undefined,
    scheduledAt: Date.now(),
    completedAt: nextPhase === "complete" ? Date.now() : undefined,
  });
  if (nextPhase !== "complete") {
    await scheduleAccountDeletionJob(ctx, job._id);
  }
  return {
    status: nextPhase === "complete" ? ("complete" as const) : ("capturing" as const),
  };
}

async function captureSnapshotPage<T extends SnapshotDoc>(
  ctx: MutationCtx,
  args: {
    docs: T[];
    entityType: Doc<"accountDeletionJobChunks">["entityType"];
    job: AccountDeletionJob;
    nextPhase: Doc<"accountDeletionJobs">["phase"];
    page: {
      continueCursor: string;
      isDone: boolean;
    };
  },
) {
  await insertAccountDeletionChunk(ctx, {
    jobId: args.job._id,
    entityType: args.entityType,
    chunkIndex: args.job.currentChunkIndex,
    entityIds: args.docs.map((doc) => doc._id),
  });

  if (!args.page.isDone) {
    return continueAccountDeletionJob(
      ctx,
      args.job,
      args.page.continueCursor,
      args.docs.length > 0 ? 1 : 0,
    );
  }

  return advanceAccountDeletionJobPhase(ctx, args.job, args.nextPhase);
}

async function failAccountDeletionJob(
  ctx: MutationCtx,
  job: AccountDeletionJob,
  errorMessage: string,
) {
  const nextAttempt = job.attempts + 1;
  const lastError = normalizeDeletionErrorMessage(errorMessage);
  const viewer = await ctx.db.get(job.userId);

  if (nextAttempt >= ACCOUNT_DELETION_MAX_ATTEMPTS) {
    await patchAccountDeletionJobState(ctx, job._id, {
      status: "failed",
      attempts: nextAttempt,
      lastError: `Max retries reached: ${lastError}`,
      scheduledAt: Date.now(),
    });

    if (viewer && viewer.accountStatus !== "active") {
      await patchViewerState(ctx, viewer._id, {
        deletionStatus: "failed",
      });
    }

    return { status: "failed" as const, retryMs: null };
  }

  const retryMs = getAccountDeletionRetryMs(nextAttempt);
  const scheduledAt = Date.now() + retryMs;
  await patchAccountDeletionJobState(ctx, job._id, {
    status: "failed",
    attempts: nextAttempt,
    lastError,
    scheduledAt,
  });

  if (viewer && viewer.accountStatus !== "active") {
    await patchViewerState(ctx, viewer._id, {
      deletionStatus: "failed",
    });
  }

  await scheduleAccountDeletionJob(ctx, job._id, retryMs);
  return { status: "failed" as const, retryMs };
}

async function findNextPurgeChunk(
  ctx: MutationCtx,
  jobId: Id<"accountDeletionJobs">,
) {
  for (const entityType of ACCOUNT_DELETION_PURGE_ENTITY_ORDER) {
    const chunk = await ctx.db
      .query("accountDeletionJobChunks")
      .withIndex("by_jobId_and_entityType_and_chunkIndex", (q) =>
        q.eq("jobId", jobId).eq("entityType", entityType),
      )
      .first();

    if (chunk) {
      return { chunk, entityType };
    }
  }

  return null;
}

async function deleteSnapshotEntity(
  ctx: MutationCtx,
  entityId: Id<any>,
) {
  const doc = await ctx.db.get(entityId);
  if (doc) {
    await ctx.db.delete(entityId);
  }
}

export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return findViewerByTokenIdentifier(ctx, identity.tokenIdentifier);
  },
});

export const getRestoreCandidate = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const activeViewer = await findViewerByTokenIdentifier(ctx, identity.tokenIdentifier);
    if (activeViewer) {
      return null;
    }

    const candidate = await findRestoreCandidateByTokenIdentifier(
      ctx,
      identity.tokenIdentifier,
      Date.now(),
    );
    if (!candidate) {
      return null;
    }

    return {
      deletedAt: getDeletedAtTimestamp(candidate),
      restoreEligibleUntil: getRestoreEligibleUntilTimestamp(candidate),
      userId: candidate._id,
    };
  },
});

export const ensureViewer = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const snapshot = getIdentitySnapshot(identity);
    const now = Date.now();

    const existing = await findViewerByTokenIdentifier(ctx, snapshot.tokenIdentifier);
    if (existing) {
      await ctx.db.patch(existing._id, {
        accountStatus: "active",
        clerkUserId: snapshot.clerkUserId,
        updatedAt: now,
      });
      return existing._id;
    }

    const restoreCandidate = await findRestoreCandidateByTokenIdentifier(
      ctx,
      snapshot.tokenIdentifier,
      now,
    );
    if (restoreCandidate) {
      throw new ConvexError("Restore decision required.");
    }

    const viewerId = await ctx.db.insert("users", {
      ...snapshot,
      accountStatus: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("userProfiles", createDraftProfile(viewerId, now));
    return viewerId;
  },
});

export const restoreDeletedAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const activeViewer = await findViewerByTokenIdentifier(ctx, identity.tokenIdentifier);
    if (activeViewer) {
      return activeViewer._id;
    }

    const restoreCandidate = await findRestoreCandidateByTokenIdentifier(
      ctx,
      identity.tokenIdentifier,
      Date.now(),
    );
    if (!restoreCandidate) {
      throw new ConvexError("No deleted account is available to restore.");
    }

    const restoredAt = Date.now();
    await patchViewerState(ctx, restoreCandidate._id, {
      accountStatus: "active",
      clerkUserId: identity.subject,
      deletedAt: undefined,
      deletionJobId: undefined,
      deletionRequestedAt: undefined,
      deletionStatus: undefined,
      restoreDecision: undefined,
      restoreEligibleUntil: undefined,
    });

    if (restoreCandidate.deletionJobId) {
      const deletionJob = await ctx.db.get(restoreCandidate.deletionJobId);
      if (deletionJob) {
        await patchAccountDeletionJobState(ctx, deletionJob._id, {
          restorationStatus: "restored",
          purgeStatus: "canceled",
          restoredAt,
          restoredUserId: restoreCandidate._id,
        });
      }
    }

    return restoreCandidate._id;
  },
});

export const declineDeletedAccountRestore = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const restoreCandidate = await findRestoreCandidateByTokenIdentifier(
      ctx,
      identity.tokenIdentifier,
      Date.now(),
    );
    if (!restoreCandidate) {
      return { status: "complete" as const };
    }

    await patchViewerState(ctx, restoreCandidate._id, {
      restoreDecision: "declined",
    });

    return { status: "declined" as const };
  },
});

export const deleteMyAccount = action({
  args: {},
  handler: async (ctx): Promise<{
    status: "pending" | "complete" | "capturing" | "failed";
    jobId: Id<"accountDeletionJobs"> | null;
  }> => {
    const identity = await requireIdentity(ctx);
    const viewer: Doc<"users"> | null = await ctx.runQuery(
      internal.auth.getViewerByTokenIdentifier,
      {
        tokenIdentifier: identity.tokenIdentifier,
      },
    );

    if (!viewer?._id) {
      return {
        status: "complete" as const,
        jobId: null,
      };
    }

    return ctx.runMutation(internal.auth.queueAccountDeletion, {
      clerkUserId: viewer.clerkUserId,
      tokenIdentifier: viewer.tokenIdentifier,
      viewerId: viewer._id,
    });
  },
});

export const getViewerByTokenIdentifier = internalQuery({
  args: {
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    return findViewerByTokenIdentifier(ctx, args.tokenIdentifier);
  },
});

export const queueAccountDeletion = internalMutation({
  args: {
    clerkUserId: v.string(),
    tokenIdentifier: v.string(),
    viewerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const viewer = await ctx.db.get(args.viewerId);
    if (!viewer) {
      return {
        status: "complete" as const,
        jobId: null,
      };
    }

    if (viewer.deletionJobId) {
      const existingJob = await ctx.db.get(viewer.deletionJobId);
      if (existingJob && existingJob.status !== "complete") {
        return {
          status: existingJob.status,
          jobId: existingJob._id,
        };
      }
    }

    const now = Date.now();
    const restoreEligibleUntil = now + ACCOUNT_RESTORE_WINDOW_MS;
    const relatedUsers = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .take(20);

    for (const relatedUser of relatedUsers) {
      if (relatedUser._id === args.viewerId || !isDeletedUser(relatedUser)) {
        continue;
      }
      if ((relatedUser.restoreDecision ?? "pending") !== "pending") {
        continue;
      }
      await patchViewerState(ctx, relatedUser._id, {
        restoreDecision: "declined",
      });
    }

    const jobId = await ctx.db.insert("accountDeletionJobs", {
      userId: viewer._id,
      clerkUserId: args.clerkUserId,
      tokenIdentifier: args.tokenIdentifier,
      status: "pending",
      phase: "capture_routines",
      restorationStatus: "not_restored",
      purgeStatus: "scheduled",
      purgeScheduledAt: restoreEligibleUntil,
      deletedAt: now,
      restoreEligibleUntil,
      currentChunkIndex: 0,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      scheduledAt: now,
    });

    await patchViewerState(ctx, args.viewerId, {
      accountStatus: "deleted",
      deletedAt: now,
      deletionJobId: jobId,
      deletionRequestedAt: now,
      deletionStatus: "pending",
      restoreDecision: "pending",
      restoreEligibleUntil,
    });

    await scheduleAccountDeletionJob(ctx, jobId);
    await scheduleAccountDeletionPurge(
      ctx,
      jobId,
      Math.max(0, restoreEligibleUntil - Date.now()),
    );

    return {
      status: "pending" as const,
      jobId,
    };
  },
});

export const processAccountDeletionJob = internalMutation({
  args: {
    jobId: v.id("accountDeletionJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status === "complete") {
      return { status: "complete" as const };
    }

    const viewer = await ctx.db.get(job.userId);
    if (viewer && viewer.accountStatus !== "active" && viewer.deletionStatus !== "pending") {
      await patchViewerState(ctx, viewer._id, {
        deletionStatus: "pending",
      });
    }

    try {
      if (job.phase === "capture_routines") {
        const page = await ctx.db
          .query("routines")
          .withIndex("by_userId_and_updatedAt", (q) => q.eq("userId", job.userId))
          .paginate({
            numItems: ACCOUNT_DELETION_SNAPSHOT_BATCH_SIZE,
            cursor: job.cursor ?? null,
          });
        return captureSnapshotPage(ctx, {
          docs: page.page,
          entityType: "routine",
          job,
          nextPhase: "capture_routine_sessions",
          page,
        });
      }

      if (job.phase === "capture_routine_sessions") {
        const page = await ctx.db
          .query("routineSessions")
          .withIndex("by_userId_and_routine", (q) => q.eq("userId", job.userId))
          .paginate({
            numItems: ACCOUNT_DELETION_SNAPSHOT_BATCH_SIZE,
            cursor: job.cursor ?? null,
          });
        return captureSnapshotPage(ctx, {
          docs: page.page,
          entityType: "routineSession",
          job,
          nextPhase: "capture_session_exercises",
          page,
        });
      }

      if (job.phase === "capture_session_exercises") {
        const page = await ctx.db
          .query("sessionExercises")
          .withIndex("by_userId_and_session", (q) => q.eq("userId", job.userId))
          .paginate({
            numItems: ACCOUNT_DELETION_SNAPSHOT_BATCH_SIZE,
            cursor: job.cursor ?? null,
          });
        return captureSnapshotPage(ctx, {
          docs: page.page,
          entityType: "sessionExercise",
          job,
          nextPhase: "capture_custom_exercises",
          page,
        });
      }

      if (job.phase === "capture_custom_exercises") {
        const page = await ctx.db
          .query("exercises")
          .withIndex("by_ownerId_and_nameText", (q) => q.eq("ownerId", job.userId))
          .paginate({
            numItems: ACCOUNT_DELETION_SNAPSHOT_BATCH_SIZE,
            cursor: job.cursor ?? null,
          });
        return captureSnapshotPage(ctx, {
          docs: page.page,
          entityType: "customExercise",
          job,
          nextPhase: "capture_user_profile",
          page,
        });
      }

      if (job.phase === "capture_user_profile") {
        const page = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", job.userId))
          .paginate({
            numItems: ACCOUNT_DELETION_SNAPSHOT_BATCH_SIZE,
            cursor: job.cursor ?? null,
          });
        return captureSnapshotPage(ctx, {
          docs: page.page,
          entityType: "userProfile",
          job,
          nextPhase: "capture_user_measurements",
          page,
        });
      }

      if (job.phase === "capture_user_measurements") {
        const page = await ctx.db
          .query("userMeasurements")
          .withIndex("by_userId_and_recordedAt", (q) => q.eq("userId", job.userId))
          .paginate({
            numItems: ACCOUNT_DELETION_SNAPSHOT_BATCH_SIZE,
            cursor: job.cursor ?? null,
          });
        return captureSnapshotPage(ctx, {
          docs: page.page,
          entityType: "userMeasurement",
          job,
          nextPhase: "finalize_user",
          page,
        });
      }

      if (job.phase === "finalize_user") {
        if (viewer && viewer.accountStatus !== "active") {
          await patchViewerState(ctx, viewer._id, {
            accountStatus: "deleted",
            deletedAt: job.deletedAt,
            deletionJobId: job._id,
            deletionRequestedAt: job.deletedAt,
            deletionStatus: "complete",
            restoreDecision: viewer.restoreDecision ?? "pending",
            restoreEligibleUntil: job.restoreEligibleUntil,
          });
        }

        return advanceAccountDeletionJobPhase(ctx, job, "complete");
      }

      return { status: job.status };
    } catch (error) {
      return failAccountDeletionJob(ctx, job, toDeletionFailureMessage(error));
    }
  },
});

export const purgeDeletedAccountData = internalMutation({
  args: {
    jobId: v.id("accountDeletionJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      return { status: "complete" as const };
    }

    if (job.restorationStatus === "restored") {
      await patchAccountDeletionJobState(ctx, job._id, {
        purgeStatus: "canceled",
      });
      return { status: "canceled" as const };
    }

    if (job.purgeStatus === "purged") {
      return { status: "purged" as const };
    }

    const now = Date.now();
    if (now < job.restoreEligibleUntil) {
      await patchAccountDeletionJobState(ctx, job._id, {
        purgeStatus: "scheduled",
        purgeScheduledAt: job.restoreEligibleUntil,
      });
      await scheduleAccountDeletionPurge(
        ctx,
        job._id,
        Math.max(0, job.restoreEligibleUntil - now),
      );
      return { status: "scheduled" as const };
    }

    if (job.status !== "complete") {
      await patchAccountDeletionJobState(ctx, job._id, {
        purgeStatus: "scheduled",
      });
      await scheduleAccountDeletionPurge(ctx, job._id, ACCOUNT_DELETION_PURGE_RETRY_MS);
      return { status: "scheduled" as const };
    }

    const viewer = await ctx.db.get(job.userId);
    if (viewer?.accountStatus === "active") {
      await patchAccountDeletionJobState(ctx, job._id, {
        purgeStatus: "canceled",
      });
      return { status: "canceled" as const };
    }

    try {
      await patchAccountDeletionJobState(ctx, job._id, {
        purgeStatus: "purging",
      });

      const nextChunk = await findNextPurgeChunk(ctx, job._id);
      if (nextChunk) {
        for (const entityId of nextChunk.chunk.entityIds) {
          await deleteSnapshotEntity(ctx, entityId);
        }
        await ctx.db.delete(nextChunk.chunk._id);
        await scheduleAccountDeletionPurge(ctx, job._id);
        return {
          entityType: nextChunk.entityType,
          status: "purging" as const,
        };
      }

      if (viewer) {
        await ctx.db.delete(viewer._id);
      }

      await patchAccountDeletionJobState(ctx, job._id, {
        purgeStatus: "purged",
        purgedAt: Date.now(),
      });
      return { status: "purged" as const };
    } catch (error) {
      await patchAccountDeletionJobState(ctx, job._id, {
        purgeStatus: "failed",
        lastError: normalizeDeletionErrorMessage(toDeletionFailureMessage(error)),
      });
      await scheduleAccountDeletionPurge(ctx, job._id, ACCOUNT_DELETION_PURGE_RETRY_MS);
      return { status: "failed" as const };
    }
  },
});
