import type {
  UserExperienceLevel,
  UserPrimaryGoal,
  UserTrainingEnvironment,
  UserUnitSystem,
} from "@ironkor/shared/enums";

import {
  normalizeHeightCmForUnitSystem,
  normalizeWeightKgForUnitSystem,
} from "@/features/onboarding/helpers";

export interface OnboardingFormState {
  experienceLevel: UserExperienceLevel | null;
  heightCm: number | null;
  primaryGoal: UserPrimaryGoal | null;
  sessionDurationMinutes: number | null;
  trainingEnvironment: UserTrainingEnvironment | null;
  unitSystem: UserUnitSystem;
  weightKg: number | null;
  workoutsPerWeek: number | null;
}

export interface OnboardingSummaryState {
  draftWeightKg: number | null;
  experienceLevel: string | null;
  heightCm: number | null;
  latestMeasurement: { weightKg: number } | null;
  primaryGoal: string | null;
  resumeStep: number;
  sessionDurationMinutes: number | null;
  trainingEnvironment: string | null;
  unitSystem: string;
  workoutsPerWeek: number | null;
}

export function buildInitialOnboardingFormState(
  summary: OnboardingSummaryState,
): OnboardingFormState {
  const unitSystem = summary.unitSystem as UserUnitSystem;
  const latestWeightKg = summary.latestMeasurement?.weightKg ?? summary.draftWeightKg ?? null;

  return {
    primaryGoal: summary.primaryGoal as UserPrimaryGoal | null,
    experienceLevel: summary.experienceLevel as UserExperienceLevel | null,
    workoutsPerWeek: summary.workoutsPerWeek,
    sessionDurationMinutes: summary.sessionDurationMinutes,
    trainingEnvironment: summary.trainingEnvironment as UserTrainingEnvironment | null,
    unitSystem,
    heightCm: normalizeHeightCmForUnitSystem(summary.heightCm, unitSystem),
    weightKg: normalizeWeightKgForUnitSystem(latestWeightKg, unitSystem),
  };
}

export function resolveCreateResumeIndex(resumeStep: number, stepCount: number) {
  if (stepCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(0, resumeStep), stepCount - 1);
}
