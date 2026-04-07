import { defineTable } from "convex/server";
import { v } from "convex/values";

export const accountDeletionJobStatus = v.union(
  v.literal("pending"),
  v.literal("capturing"),
  v.literal("failed"),
  v.literal("complete"),
);

export const accountDeletionJobPhase = v.union(
  v.literal("capture_routines"),
  v.literal("capture_routine_sessions"),
  v.literal("capture_session_exercises"),
  v.literal("capture_custom_exercises"),
  v.literal("capture_user_profile"),
  v.literal("capture_user_measurements"),
  v.literal("finalize_user"),
  v.literal("complete"),
);

export const accountDeletionSnapshotEntityType = v.union(
  v.literal("routine"),
  v.literal("routineSession"),
  v.literal("sessionExercise"),
  v.literal("customExercise"),
  v.literal("userProfile"),
  v.literal("userMeasurement"),
);

export const accountDeletionJobRestorationStatus = v.union(
  v.literal("not_restored"),
  v.literal("restored"),
);

export const accountDeletionJobPurgeStatus = v.union(
  v.literal("scheduled"),
  v.literal("purging"),
  v.literal("purged"),
  v.literal("canceled"),
  v.literal("failed"),
);

export const accountDeletionJobs = defineTable({
  userId: v.id("users"),
  clerkUserId: v.string(),
  tokenIdentifier: v.string(),
  status: accountDeletionJobStatus,
  phase: accountDeletionJobPhase,
  restorationStatus: v.optional(accountDeletionJobRestorationStatus),
  restoredAt: v.optional(v.number()),
  restoredUserId: v.optional(v.id("users")),
  purgeStatus: v.optional(accountDeletionJobPurgeStatus),
  purgeScheduledAt: v.optional(v.number()),
  purgedAt: v.optional(v.number()),
  deletedAt: v.number(),
  restoreEligibleUntil: v.number(),
  cursor: v.optional(v.string()),
  currentChunkIndex: v.number(),
  attempts: v.number(),
  lastError: v.optional(v.string()),
  scheduledAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_status_and_updatedAt", ["status", "updatedAt"]);

export const accountDeletionJobChunks = defineTable({
  jobId: v.id("accountDeletionJobs"),
  entityType: accountDeletionSnapshotEntityType,
  chunkIndex: v.number(),
  entityIds: v.array(
    v.union(
      v.id("routines"),
      v.id("routineSessions"),
      v.id("sessionExercises"),
      v.id("exercises"),
      v.id("userProfiles"),
      v.id("userMeasurements"),
    ),
  ),
  createdAt: v.number(),
})
  .index("by_jobId", ["jobId"])
  .index("by_jobId_and_entityType_and_chunkIndex", [
    "jobId",
    "entityType",
    "chunkIndex",
  ]);
