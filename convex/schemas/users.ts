import { defineTable } from "convex/server";
import { v } from "convex/values";

import { accountDeletionJobStatus } from "./accountDeletionJobs";

export const userAccountStatus = v.union(
  v.literal("active"),
  v.literal("deleted"),
);

export const userRestoreDecision = v.union(
  v.literal("pending"),
  v.literal("declined"),
);

export const users = defineTable({
  tokenIdentifier: v.string(),
  clerkUserId: v.string(),
  accountStatus: v.optional(userAccountStatus),
  deletedAt: v.optional(v.number()),
  restoreEligibleUntil: v.optional(v.number()),
  restoreDecision: v.optional(userRestoreDecision),
  deletionStatus: v.optional(accountDeletionJobStatus),
  deletionRequestedAt: v.optional(v.number()),
  deletionJobId: v.optional(v.id("accountDeletionJobs")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tokenIdentifier", ["tokenIdentifier"])
  .index("by_clerkUserId", ["clerkUserId"])
  .index("by_tokenIdentifier_and_accountStatus", ["tokenIdentifier", "accountStatus"])
  .index("by_tokenIdentifier_and_accountStatus_and_deletedAt", [
    "tokenIdentifier",
    "accountStatus",
    "deletedAt",
  ])
  .index("by_clerkUserId_and_accountStatus", ["clerkUserId", "accountStatus"]);
