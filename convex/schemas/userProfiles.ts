import { defineTable } from "convex/server";
import { v } from "convex/values";

import {
  difficultySet,
  userPrimaryGoalSet,
  userTrainingEnvironmentSet,
  userUnitSystemSet,
} from "./unions";

export const onboardingStatus = v.union(
  v.literal("draft"),
  v.literal("complete"),
);

export const onboardingCompletionMethod = v.union(
  v.literal("guided"),
  v.literal("legacy_backfill"),
);

export const userProfiles = defineTable({
  userId: v.id("users"),
  onboardingStatus,
  onboardingVersion: v.number(),
  completionMethod: v.optional(onboardingCompletionMethod),
  resumeStep: v.optional(v.number()),
  primaryGoal: v.optional(userPrimaryGoalSet),
  experienceLevel: v.optional(difficultySet),
  trainingEnvironment: v.optional(userTrainingEnvironmentSet),
  workoutsPerWeek: v.optional(v.number()),
  sessionDurationMinutes: v.optional(v.number()),
  unitSystem: v.optional(userUnitSystemSet),
  heightCm: v.optional(v.number()),
  draftWeightKg: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_userId", ["userId"]);
