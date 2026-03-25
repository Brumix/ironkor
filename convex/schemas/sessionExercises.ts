import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sessionExercises = defineTable({
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
  .index("by_session", ["sessionId"])
  .index("by_session_order", ["sessionId", "order"]);
