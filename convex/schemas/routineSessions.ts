import { defineTable } from "convex/server";
import { v } from "convex/values";

export const routineSessions = defineTable({
  userId: v.optional(v.id("users")),
  routineId: v.id("routines"),
  name: v.string(),
  nameKey: v.optional(v.string()),
  order: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId_and_routine", ["userId", "routineId"])
  .index("by_userId_and_routine_and_nameKey", ["userId", "routineId", "nameKey"])
  .index("by_userId_and_routine_order", ["userId", "routineId", "order"]);
