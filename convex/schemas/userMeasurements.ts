import { defineTable } from "convex/server";
import { v } from "convex/values";

export const userMeasurementSource = v.union(
  v.literal("onboarding"),
  v.literal("settings"),
);

export const userMeasurements = defineTable({
  userId: v.id("users"),
  recordedAt: v.number(),
  source: userMeasurementSource,
  weightKg: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_and_recordedAt", ["userId", "recordedAt"]);
