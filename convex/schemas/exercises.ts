import { defineTable } from "convex/server";
import { v } from "convex/values";

export const exercises = defineTable({
  name: v.string(),
  variant: v.string(),
  setsTarget: v.number(),
  repsTarget: v.string(),
  restSeconds: v.number(),
  primaryMuscles: v.array(v.string()),
  secondaryMuscles: v.array(v.string()),
  isCustom: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_name", ["name"]);
