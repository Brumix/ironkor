import { defineTable } from "convex/server";
import { v } from "convex/values";

export const users = defineTable({
  tokenIdentifier: v.string(),
  clerkUserId: v.string(),
  primaryEmail: v.optional(v.string()),
  displayName: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tokenIdentifier", ["tokenIdentifier"])
  .index("by_clerkUserId", ["clerkUserId"]);
