import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("exercises").withIndex("by_name").collect();
  },
});

export const createCustom = mutation({
  args: {
    name: v.string(),
    variant: v.string(),
    setsTarget: v.number(),
    repsTarget: v.string(),
    restSeconds: v.number(),
    primaryMuscles: v.array(v.string()),
    secondaryMuscles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("exercises", {
      ...args,
      name: args.name.trim(),
      variant: args.variant.trim(),
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});
