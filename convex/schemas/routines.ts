import { defineTable } from "convex/server";
import { v } from "convex/values";


export const weeklyPlanEntry = v.object({
    day: v.number(),
    type: v.union(v.literal("train"), v.literal("rest")),
    assignmentMode: v.union(v.literal("auto"), v.literal("manual")),
    manualSessionId: v.optional(v.id("routineSessions")),
});


export const routines = defineTable({
    name: v.string(),
    daysPerWeek: v.number(),
    isActive: v.boolean(),
    sessionOrder: v.array(v.id("routineSessions")),
    weeklyPlan: v.array(weeklyPlanEntry),
    updatedAt: v.number(),
})
    .index("by_isActive", ["isActive"])
    .index("by_updatedAt", ["updatedAt"]);
