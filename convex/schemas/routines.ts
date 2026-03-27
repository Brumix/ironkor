import { defineTable } from "convex/server";
import { v } from "convex/values";


export const weeklyPlanEntry = v.object({
    day: v.number(),
    type: v.union(v.literal("train"), v.literal("rest")),
    assignmentMode: v.union(v.literal("auto"), v.literal("manual")),
    manualSessionId: v.optional(v.id("routineSessions")),
});


export const routines = defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    nameKey: v.optional(v.string()),
    daysPerWeek: v.number(),
    isActive: v.boolean(),
    sessionOrder: v.array(v.id("routineSessions")),
    weeklyPlan: v.array(weeklyPlanEntry),
    updatedAt: v.number(),
})
    .index("by_userId_and_isActive", ["userId", "isActive"])
    .index("by_userId_and_nameKey", ["userId", "nameKey"])
    .index("by_userId_and_updatedAt", ["userId", "updatedAt"]);
