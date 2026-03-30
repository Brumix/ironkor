import { v } from "convex/values";

import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireEnv } from "./env";
import {
  getViewerByTokenIdentifier as findViewerByTokenIdentifier,
  getIdentitySnapshot,
  isDeletionBlocked,
  requireIdentity,
} from "./authHelpers";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const ACCOUNT_DELETION_BATCH_SIZE = 100;
const ACCOUNT_DELETION_RETRY_BASE_MS = 5_000;
const ACCOUNT_DELETION_RETRY_MAX_MS = 5 * 60 * 1000;
const ACCOUNT_DELETION_MAX_ATTEMPTS = 10;
const ACCOUNT_DELETION_ERROR_MAX_LENGTH = 280;

async function deleteDocsInBatch<T extends { _id: Id<any> }>(
  docs: T[],
  deleter: (docId: T["_id"]) => Promise<void>,
) {
  for (const doc of docs) {
    await deleter(doc._id);
  }
  return docs.length;
}

function getAccountDeletionRetryMs(attempts: number) {
  return Math.min(
    ACCOUNT_DELETION_RETRY_MAX_MS,
    ACCOUNT_DELETION_RETRY_BASE_MS * 2 ** Math.max(0, attempts),
  );
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

async function patchViewerDeletionState(
  ctx: MutationCtx,
  viewerId: Id<"users">,
  updates: Partial<Doc<"users">>,
) {
  await ctx.db.patch(viewerId, {
    ...updates,
    updatedAt: Date.now(),
  });
}

async function deleteClerkUser(clerkUserId: string) {
  const clerkSecretKey = requireEnv("CLERK_SECRET_KEY");
  const response = await fetch(
    `https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    },
  );

  if (response.ok || response.status === 404) {
    return;
  }

  throw new Error(`Unable to delete Clerk account (HTTP ${response.status}).`);
}

function normalizeDeletionErrorMessage(errorMessage: string) {
  const trimmed = errorMessage.trim();
  if (trimmed.length === 0) {
    return "Unable to delete Clerk account.";
  }
  if (trimmed.length <= ACCOUNT_DELETION_ERROR_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, ACCOUNT_DELETION_ERROR_MAX_LENGTH - 3)}...`;
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

export const ensureViewer = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const snapshot = getIdentitySnapshot(identity);
    const now = Date.now();

    const existing = await findViewerByTokenIdentifier(ctx, snapshot.tokenIdentifier);
    if (existing) {
      if (isDeletionBlocked(existing.deletionStatus)) {
        throw new Error("Account deletion is in progress.");
      }

      await ctx.db.patch(existing._id, {
        clerkUserId: snapshot.clerkUserId,
        displayName: snapshot.displayName,
        imageUrl: snapshot.imageUrl,
        primaryEmail: snapshot.primaryEmail,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      ...snapshot,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteMyAccount = action({
  args: {},
  handler: async (ctx): Promise<{
    status: "pending" | "complete" | "purging" | "deleting_clerk" | "failed";
    jobId: Id<"accountDeletionJobs"> | null;
  }> => {
    const identity = await requireIdentity(ctx);
    const viewer: Doc<"users"> | null = await ctx.runQuery(internal.auth.getViewerByTokenIdentifier, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    const clerkUserId = viewer?.clerkUserId ?? identity.subject;
    if (!viewer?._id) {
      await deleteClerkUser(clerkUserId);
      return {
        status: "complete" as const,
        jobId: null,
      };
    }

    return ctx.runMutation(internal.auth.queueAccountDeletion, {
      viewerId: viewer._id,
      clerkUserId,
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

export const getAccountDeletionJob = internalQuery({
  args: {
    jobId: v.id("accountDeletionJobs"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.jobId);
  },
});

export const queueAccountDeletion = internalMutation({
  args: {
    viewerId: v.id("users"),
    clerkUserId: v.string(),
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
      if (existingJob) {
        return {
          status: existingJob.status,
          jobId: existingJob._id,
        };
      }
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("accountDeletionJobs", {
      userId: viewer._id,
      clerkUserId: args.clerkUserId,
      status: "pending",
      phase: "delete_session_exercises",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      scheduledAt: now,
    });

    await ctx.db.patch(args.viewerId, {
      deletionStatus: "pending",
      deletionRequestedAt: now,
      deletionJobId: jobId,
      updatedAt: now,
    });

    await scheduleAccountDeletionJob(ctx, jobId);

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
    if (!viewer && job.phase !== "complete") {
      await patchAccountDeletionJobState(ctx, job._id, {
        status: "complete",
        phase: "complete",
        completedAt: Date.now(),
        lastError: undefined,
      });
      return { status: "complete" as const };
    }

    if (viewer && viewer.deletionStatus !== "purging" && job.phase !== "delete_clerk") {
      await patchViewerDeletionState(ctx, viewer._id, {
        deletionStatus: "purging",
      });
    }

    if (job.phase === "delete_session_exercises") {
      const sessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_userId_and_session", (q) => q.eq("userId", job.userId))
        .take(ACCOUNT_DELETION_BATCH_SIZE);
      const deleted = await deleteDocsInBatch(sessionExercises, (docId) => ctx.db.delete(docId));

      if (deleted > 0) {
        await patchAccountDeletionJobState(ctx, job._id, {
          status: "purging",
          scheduledAt: Date.now(),
        });
        await scheduleAccountDeletionJob(ctx, job._id);
        return { status: "purging" as const, deleted };
      }

      await patchAccountDeletionJobState(ctx, job._id, {
        status: "purging",
        phase: "delete_routine_sessions",
        lastError: undefined,
        scheduledAt: Date.now(),
      });
      await scheduleAccountDeletionJob(ctx, job._id);
      return { status: "purging" as const, deleted: 0 };
    }

    if (job.phase === "delete_routine_sessions") {
      const routineSessions = await ctx.db
        .query("routineSessions")
        .withIndex("by_userId_and_routine", (q) => q.eq("userId", job.userId))
        .take(ACCOUNT_DELETION_BATCH_SIZE);
      const deleted = await deleteDocsInBatch(routineSessions, (docId) => ctx.db.delete(docId));

      if (deleted > 0) {
        await patchAccountDeletionJobState(ctx, job._id, {
          status: "purging",
          scheduledAt: Date.now(),
        });
        await scheduleAccountDeletionJob(ctx, job._id);
        return { status: "purging" as const, deleted };
      }

      await patchAccountDeletionJobState(ctx, job._id, {
        status: "purging",
        phase: "delete_routines",
        lastError: undefined,
        scheduledAt: Date.now(),
      });
      await scheduleAccountDeletionJob(ctx, job._id);
      return { status: "purging" as const, deleted: 0 };
    }

    if (job.phase === "delete_routines") {
      const routines = await ctx.db
        .query("routines")
        .withIndex("by_userId_and_updatedAt", (q) => q.eq("userId", job.userId))
        .take(ACCOUNT_DELETION_BATCH_SIZE);
      const deleted = await deleteDocsInBatch(routines, (docId) => ctx.db.delete(docId));

      if (deleted > 0) {
        await patchAccountDeletionJobState(ctx, job._id, {
          status: "purging",
          scheduledAt: Date.now(),
        });
        await scheduleAccountDeletionJob(ctx, job._id);
        return { status: "purging" as const, deleted };
      }

      await patchAccountDeletionJobState(ctx, job._id, {
        status: "purging",
        phase: "delete_custom_exercises",
        lastError: undefined,
        scheduledAt: Date.now(),
      });
      await scheduleAccountDeletionJob(ctx, job._id);
      return { status: "purging" as const, deleted: 0 };
    }

    if (job.phase === "delete_custom_exercises") {
      const customExercises = await ctx.db
        .query("exercises")
        .withIndex("by_ownerId_and_nameText", (q) => q.eq("ownerId", job.userId))
        .take(ACCOUNT_DELETION_BATCH_SIZE);
      const deleted = await deleteDocsInBatch(customExercises, (docId) => ctx.db.delete(docId));

      if (deleted > 0) {
        await patchAccountDeletionJobState(ctx, job._id, {
          status: "purging",
          scheduledAt: Date.now(),
        });
        await scheduleAccountDeletionJob(ctx, job._id);
        return { status: "purging" as const, deleted };
      }

      await patchAccountDeletionJobState(ctx, job._id, {
        status: "deleting_clerk",
        phase: "delete_clerk",
        lastError: undefined,
        scheduledAt: Date.now(),
      });
      if (viewer) {
        await patchViewerDeletionState(ctx, viewer._id, {
          deletionStatus: "deleting_clerk",
        });
      }
      await ctx.scheduler.runAfter(0, internal.auth.deleteClerkAccountForJob, {
        jobId: job._id,
      });
      return { status: "deleting_clerk" as const, deleted: 0 };
    }

    if (job.phase === "delete_clerk") {
      await patchAccountDeletionJobState(ctx, job._id, {
        status: "deleting_clerk",
        lastError: undefined,
        scheduledAt: Date.now(),
      });
      if (viewer) {
        await patchViewerDeletionState(ctx, viewer._id, {
          deletionStatus: "deleting_clerk",
        });
      }
      await ctx.scheduler.runAfter(0, internal.auth.deleteClerkAccountForJob, {
        jobId: job._id,
      });
      return { status: "deleting_clerk" as const };
    }

    if (job.phase === "delete_viewer") {
      if (viewer) {
        await ctx.db.delete(viewer._id);
      }

      await patchAccountDeletionJobState(ctx, job._id, {
        status: "complete",
        phase: "complete",
        completedAt: Date.now(),
        lastError: undefined,
      });
      return { status: "complete" as const };
    }

    return { status: job.status };
  },
});

export const deleteClerkAccountForJob = internalAction({
  args: {
    jobId: v.id("accountDeletionJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.auth.getAccountDeletionJob, {
      jobId: args.jobId,
    });
    if (!job || job.status === "complete") {
      return { status: "complete" as const };
    }

    try {
      await deleteClerkUser(job.clerkUserId);
      await ctx.runMutation(internal.auth.markClerkDeletionReady, {
        jobId: job._id,
      });
      return { status: "complete" as const };
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to delete Clerk account.";
      await ctx.runMutation(internal.auth.failAccountDeletionJob, {
        jobId: job._id,
        errorMessage: message,
      });
      return { status: "failed" as const, error: message };
    }
  },
});

export const markClerkDeletionReady = internalMutation({
  args: {
    jobId: v.id("accountDeletionJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status === "complete") {
      return { status: "complete" as const };
    }

    const viewer = await ctx.db.get(job.userId);
    if (viewer) {
      await patchViewerDeletionState(ctx, viewer._id, {
        deletionStatus: "purging",
      });
    }

    await patchAccountDeletionJobState(ctx, job._id, {
      status: "purging",
      phase: "delete_viewer",
      lastError: undefined,
      scheduledAt: Date.now(),
    });
    await scheduleAccountDeletionJob(ctx, job._id);
    return { status: "purging" as const };
  },
});

export const failAccountDeletionJob = internalMutation({
  args: {
    jobId: v.id("accountDeletionJobs"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status === "complete") {
      return { status: "complete" as const };
    }
    const nextAttempt = job.attempts + 1;
    const lastError = normalizeDeletionErrorMessage(args.errorMessage);
    if (nextAttempt >= ACCOUNT_DELETION_MAX_ATTEMPTS) {
      await patchAccountDeletionJobState(ctx, job._id, {
        status: "failed",
        attempts: nextAttempt,
        lastError: `Max retries reached: ${lastError}`,
        scheduledAt: Date.now(),
      });

      const viewer = await ctx.db.get(job.userId);
      if (viewer) {
        await patchViewerDeletionState(ctx, viewer._id, {
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

    const viewer = await ctx.db.get(job.userId);
    if (viewer) {
      await patchViewerDeletionState(ctx, viewer._id, {
        deletionStatus: "failed",
      });
    }

    await scheduleAccountDeletionJob(ctx, job._id, retryMs);
    return { status: "failed" as const, retryMs };
  },
});
