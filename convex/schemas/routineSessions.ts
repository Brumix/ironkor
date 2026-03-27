import { defineTable } from "convex/server";
import { v } from "convex/values";

export const routineSessions = defineTable({
  routineId: v.id("routines"),
  name: v.string(),
  nameKey: v.optional(v.string()),
  order: v.number(),
  updatedAt: v.number(),
})
  .index("by_routine", ["routineId"])
  .index("by_routine_and_nameKey", ["routineId", "nameKey"])
  .index("by_routine_order", ["routineId", "order"]);
