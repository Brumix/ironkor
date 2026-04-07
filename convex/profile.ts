import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireViewer } from "./authHelpers";
import {
  ONBOARDING_VERSION,
  DEFAULT_UNIT_SYSTEM,
  assertProfileNumberRange,
  convertHeightToCm,
  convertWeightToKg,
  createDraftProfile,
  getLatestMeasurementByUserId,
  getProfileByUserId,
} from "./profileHelpers";
import {
  difficultySet,
  userPrimaryGoalSet,
  userTrainingEnvironmentSet,
  userUnitSystemSet,
} from "./schemas/unions";

import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { UserUnitSystem } from "@ironkor/shared/enums";

function ensureUnitSystem(
  unitSystem: UserUnitSystem | undefined,
  profile: Doc<"userProfiles"> | null,
): UserUnitSystem {
  return unitSystem ?? (profile?.unitSystem as UserUnitSystem | undefined) ?? DEFAULT_UNIT_SYSTEM;
}

function assertTrainingProfileInput(args: {
  height?: number | null;
  sessionDurationMinutes?: number;
  weight?: number | null;
  workoutsPerWeek?: number;
}) {
  if (args.workoutsPerWeek !== undefined) {
    assertProfileNumberRange(args.workoutsPerWeek, {
      label: "Workouts per week",
      max: 7,
      min: 1,
    });
  }

  if (args.sessionDurationMinutes !== undefined) {
    assertProfileNumberRange(args.sessionDurationMinutes, {
      label: "Session duration",
      max: 180,
      min: 15,
    });
  }

  if (args.height !== undefined && args.height !== null) {
    assertProfileNumberRange(args.height, {
      label: "Height",
      max: 300,
      min: 36,
    });
  }

  if (args.weight !== undefined && args.weight !== null) {
    assertProfileNumberRange(args.weight, {
      label: "Weight",
      max: 1_400,
      min: 60,
    });
  }
}

async function ensureMutableProfile(
  ctx: MutationCtx,
  userId: Doc<"users">["_id"],
  now: number,
) {
  const existing = await getProfileByUserId(ctx, userId);
  if (existing) {
    return existing;
  }

  const profileId = await ctx.db.insert("userProfiles", createDraftProfile(userId, now));
  const inserted = await ctx.db.get(profileId);
  if (!inserted) {
    throw new ConvexError("Unable to create the onboarding profile.");
  }
  return inserted;
}

export const getViewerProfileSummary = query({
  args: {},
  handler: async (ctx) => {
    const { viewer } = await requireViewer(ctx);
    const profile = await getProfileByUserId(ctx, viewer._id);
    const latestMeasurement = await getLatestMeasurementByUserId(ctx, viewer._id);

    if (!profile) {
      return {
        blocked: false,
        completionMethod: "legacy_backfill" as const,
        draftWeightKg: null,
        experienceLevel: null,
        heightCm: null,
        isComplete: true,
        latestMeasurement: latestMeasurement
          ? {
              recordedAt: latestMeasurement.recordedAt,
              source: latestMeasurement.source,
              weightKg: latestMeasurement.weightKg,
            }
          : null,
        onboardingStatus: "complete" as const,
        onboardingVersion: ONBOARDING_VERSION,
        primaryGoal: null,
        profileExists: false,
        resumeStep: 0,
        sessionDurationMinutes: null,
        trainingEnvironment: null,
        unitSystem: DEFAULT_UNIT_SYSTEM,
        workoutsPerWeek: null,
      };
    }

    const isComplete = profile.onboardingStatus === "complete";

    return {
      blocked: !isComplete,
      completionMethod: profile.completionMethod ?? null,
      draftWeightKg: profile.draftWeightKg ?? null,
      experienceLevel: profile.experienceLevel ?? null,
      heightCm: profile.heightCm ?? null,
      isComplete,
      latestMeasurement: latestMeasurement
        ? {
            recordedAt: latestMeasurement.recordedAt,
            source: latestMeasurement.source,
            weightKg: latestMeasurement.weightKg,
          }
        : null,
      onboardingStatus: profile.onboardingStatus,
      onboardingVersion: profile.onboardingVersion,
      primaryGoal: profile.primaryGoal ?? null,
      profileExists: true,
      resumeStep: profile.resumeStep ?? 0,
      sessionDurationMinutes: profile.sessionDurationMinutes ?? null,
      trainingEnvironment: profile.trainingEnvironment ?? null,
      unitSystem: profile.unitSystem ?? DEFAULT_UNIT_SYSTEM,
      workoutsPerWeek: profile.workoutsPerWeek ?? null,
    };
  },
});

export const saveOnboardingDraft = mutation({
  args: {
    experienceLevel: v.optional(difficultySet),
    height: v.optional(v.union(v.number(), v.null())),
    primaryGoal: v.optional(userPrimaryGoalSet),
    resumeStep: v.number(),
    sessionDurationMinutes: v.optional(v.number()),
    trainingEnvironment: v.optional(userTrainingEnvironmentSet),
    unitSystem: v.optional(userUnitSystemSet),
    weight: v.optional(v.union(v.number(), v.null())),
    workoutsPerWeek: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertTrainingProfileInput(args);

    const { viewer } = await requireViewer(ctx);
    const now = Date.now();
    const profile = await ensureMutableProfile(ctx, viewer._id, now);
    const unitSystem = ensureUnitSystem(
      args.unitSystem as UserUnitSystem | undefined,
      profile,
    );

    const patch: Partial<Doc<"userProfiles">> = {
      onboardingStatus: profile.onboardingStatus === "complete" ? "complete" : "draft",
      onboardingVersion: ONBOARDING_VERSION,
      resumeStep: args.resumeStep,
      updatedAt: now,
    };

    if (args.primaryGoal !== undefined) {
      patch.primaryGoal = args.primaryGoal;
    }
    if (args.experienceLevel !== undefined) {
      patch.experienceLevel = args.experienceLevel;
    }
    if (args.trainingEnvironment !== undefined) {
      patch.trainingEnvironment = args.trainingEnvironment;
    }
    if (args.workoutsPerWeek !== undefined) {
      patch.workoutsPerWeek = args.workoutsPerWeek;
    }
    if (args.sessionDurationMinutes !== undefined) {
      patch.sessionDurationMinutes = args.sessionDurationMinutes;
    }
    if (args.unitSystem !== undefined) {
      patch.unitSystem = args.unitSystem as UserUnitSystem;
    }
    if (args.height !== undefined) {
      patch.heightCm =
        args.height === null ? undefined : convertHeightToCm(args.height, unitSystem);
    }
    if (args.weight !== undefined) {
      patch.draftWeightKg =
        args.weight === null ? undefined : convertWeightToKg(args.weight, unitSystem);
    }

    await ctx.db.patch(profile._id, patch);
    return profile._id;
  },
});

export const completeOnboarding = mutation({
  args: {
    experienceLevel: difficultySet,
    height: v.optional(v.union(v.number(), v.null())),
    primaryGoal: userPrimaryGoalSet,
    sessionDurationMinutes: v.number(),
    trainingEnvironment: userTrainingEnvironmentSet,
    unitSystem: userUnitSystemSet,
    weight: v.optional(v.union(v.number(), v.null())),
    workoutsPerWeek: v.number(),
  },
  handler: async (ctx, args) => {
    assertTrainingProfileInput(args);

    const { viewer } = await requireViewer(ctx);
    const now = Date.now();
    const profile = await ensureMutableProfile(ctx, viewer._id, now);
    const unitSystem = args.unitSystem as UserUnitSystem;
    const heightCm =
      args.height === undefined || args.height === null
        ? undefined
        : convertHeightToCm(args.height, unitSystem);

    await ctx.db.patch(profile._id, {
      onboardingStatus: "complete",
      onboardingVersion: ONBOARDING_VERSION,
      completionMethod: "guided",
      completedAt: profile.completedAt ?? now,
      draftWeightKg: undefined,
      experienceLevel: args.experienceLevel,
      heightCm,
      primaryGoal: args.primaryGoal,
      resumeStep: undefined,
      sessionDurationMinutes: args.sessionDurationMinutes,
      trainingEnvironment: args.trainingEnvironment,
      unitSystem,
      updatedAt: now,
      workoutsPerWeek: args.workoutsPerWeek,
    });

    if (args.weight !== undefined && args.weight !== null) {
      await ctx.db.insert("userMeasurements", {
        userId: viewer._id,
        recordedAt: now,
        source: "onboarding",
        weightKg: convertWeightToKg(args.weight, unitSystem),
        createdAt: now,
        updatedAt: now,
      });
    }

    return profile._id;
  },
});

export const updateTrainingProfile = mutation({
  args: {
    experienceLevel: v.optional(difficultySet),
    height: v.optional(v.union(v.number(), v.null())),
    primaryGoal: v.optional(userPrimaryGoalSet),
    sessionDurationMinutes: v.optional(v.number()),
    trainingEnvironment: v.optional(userTrainingEnvironmentSet),
    unitSystem: v.optional(userUnitSystemSet),
    workoutsPerWeek: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertTrainingProfileInput(args);

    const { viewer } = await requireViewer(ctx);
    const now = Date.now();
    const profile = await ensureMutableProfile(ctx, viewer._id, now);
    const unitSystem = ensureUnitSystem(
      args.unitSystem as UserUnitSystem | undefined,
      profile,
    );
    const patch: Partial<Doc<"userProfiles">> = {
      onboardingStatus: "complete",
      onboardingVersion: ONBOARDING_VERSION,
      completionMethod: "guided",
      completedAt: profile.completedAt ?? now,
      resumeStep: undefined,
      updatedAt: now,
    };

    if (args.primaryGoal !== undefined) {
      patch.primaryGoal = args.primaryGoal;
    }
    if (args.experienceLevel !== undefined) {
      patch.experienceLevel = args.experienceLevel;
    }
    if (args.trainingEnvironment !== undefined) {
      patch.trainingEnvironment = args.trainingEnvironment;
    }
    if (args.workoutsPerWeek !== undefined) {
      patch.workoutsPerWeek = args.workoutsPerWeek;
    }
    if (args.sessionDurationMinutes !== undefined) {
      patch.sessionDurationMinutes = args.sessionDurationMinutes;
    }
    if (args.unitSystem !== undefined) {
      patch.unitSystem = args.unitSystem as UserUnitSystem;
    }
    if (args.height !== undefined) {
      patch.heightCm =
        args.height === null ? undefined : convertHeightToCm(args.height, unitSystem);
    }

    await ctx.db.patch(profile._id, patch);

    return profile._id;
  },
});

export const logWeight = mutation({
  args: {
    unitSystem: userUnitSystemSet,
    weight: v.number(),
  },
  handler: async (ctx, args) => {
    assertTrainingProfileInput({ weight: args.weight });

    const { viewer } = await requireViewer(ctx);
    const now = Date.now();
    const unitSystem = args.unitSystem as UserUnitSystem;

    await ctx.db.insert("userMeasurements", {
      userId: viewer._id,
      recordedAt: now,
      source: "settings",
      weightKg: convertWeightToKg(args.weight, unitSystem),
      createdAt: now,
      updatedAt: now,
    });

    return { status: "logged" as const };
  },
});
