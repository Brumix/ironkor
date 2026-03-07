import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sessionExercises = defineTable({
  sessionId: v.id("routineSessions"),
  exerciseId: v.id("exercises"),
  order: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_session", ["sessionId"])
  .index("by_session_order", ["sessionId", "order"]);
