import { ConvexError } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { DatabaseReader, MutationCtx, QueryCtx } from "./_generated/server";

import type {
  UserExperienceLevel,
  UserPrimaryGoal,
  UserTrainingEnvironment,
  UserUnitSystem,
} from "@ironkor/shared/enums";

export const ONBOARDING_VERSION = 1;
export const DEFAULT_UNIT_SYSTEM: UserUnitSystem = "metric";

type ReaderCtx = Pick<QueryCtx | MutationCtx, "db">;

export interface OnboardingProfileInput {
  experienceLevel?: UserExperienceLevel;
  height?: number | null;
  primaryGoal?: UserPrimaryGoal;
  sessionDurationMinutes?: number;
  trainingEnvironment?: UserTrainingEnvironment;
  unitSystem?: UserUnitSystem;
  weight?: number | null;
  workoutsPerWeek?: number;
}

export function assertProfileNumberRange(
  value: number,
  {
    label,
    max,
    min,
  }: {
    label: string;
    max: number;
    min: number;
  },
) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ConvexError(`${label} must be between ${min} and ${max}.`);
  }
}

export function convertWeightToKg(weight: number, unitSystem: UserUnitSystem) {
  return unitSystem === "imperial" ? weight * 0.45359237 : weight;
}

export function convertWeightFromKg(weightKg: number, unitSystem: UserUnitSystem) {
  return unitSystem === "imperial" ? weightKg / 0.45359237 : weightKg;
}

export function convertHeightToCm(height: number, unitSystem: UserUnitSystem) {
  return unitSystem === "imperial" ? height * 2.54 : height;
}

export function convertHeightFromCm(heightCm: number, unitSystem: UserUnitSystem) {
  return unitSystem === "imperial" ? heightCm / 2.54 : heightCm;
}

export async function getProfileByUserId(
  ctx: ReaderCtx,
  userId: Id<"users">,
) {
  return ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export async function getLatestMeasurementByUserId(
  ctx: ReaderCtx,
  userId: Id<"users">,
) {
  const rows = await ctx.db
    .query("userMeasurements")
    .withIndex("by_userId_and_recordedAt", (q) => q.eq("userId", userId))
    .order("desc")
    .take(1);

  return rows[0] ?? null;
}

export function createDraftProfile(
  userId: Id<"users">,
  now: number,
): Omit<Doc<"userProfiles">, "_creationTime" | "_id"> {
  return {
    userId,
    onboardingStatus: "draft",
    onboardingVersion: ONBOARDING_VERSION,
    createdAt: now,
    updatedAt: now,
  };
}
