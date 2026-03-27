import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sessionExercises = defineTable({
  userId: v.optional(v.id("users")),
  sessionId: v.id("routineSessions"),
  exerciseId: v.id("exercises"),
  order: v.number(),
  sets: v.number(),
  repsText: v.string(),
  targetWeightKg: v.optional(v.number()),
  restSeconds: v.optional(v.number()),
  notes: v.optional(v.string()),
  tempo: v.optional(v.string()),
  rir: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index("by_userId_and_session", ["userId", "sessionId"])
  .index("by_userId_and_session_order", ["userId", "sessionId", "order"]);
