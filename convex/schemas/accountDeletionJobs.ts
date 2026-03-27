import { defineTable } from "convex/server";
import { v } from "convex/values";

export const accountDeletionStatus = v.union(
  v.literal("pending"),
  v.literal("purging"),
  v.literal("deleting_clerk"),
  v.literal("failed"),
  v.literal("complete"),
);

export const accountDeletionPhase = v.union(
  v.literal("delete_session_exercises"),
  v.literal("delete_routine_sessions"),
  v.literal("delete_routines"),
  v.literal("delete_custom_exercises"),
  v.literal("delete_clerk"),
  v.literal("delete_viewer"),
  v.literal("complete"),
);

export const accountDeletionJobs = defineTable({
  userId: v.id("users"),
  clerkUserId: v.string(),
  status: accountDeletionStatus,
  phase: accountDeletionPhase,
  attempts: v.number(),
  lastError: v.optional(v.string()),
  scheduledAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_status_and_updatedAt", ["status", "updatedAt"]);
