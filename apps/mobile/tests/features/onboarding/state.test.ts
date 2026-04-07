import { describe, expect, test } from "vitest";

import {
  buildInitialOnboardingFormState,
  resolveCreateResumeIndex,
} from "@/features/onboarding/state";

describe("onboarding state helpers", () => {
  test("builds a canonical prefilled form state from saved summary values", () => {
    const state = buildInitialOnboardingFormState({
      primaryGoal: "strength",
      experienceLevel: "intermediate",
      workoutsPerWeek: 4,
      sessionDurationMinutes: 60,
      trainingEnvironment: "gym",
      unitSystem: "imperial",
      heightCm: 182.88,
      draftWeightKg: 81.6466,
      latestMeasurement: null,
      resumeStep: 5,
    });

    expect(state).toMatchObject({
      primaryGoal: "strength",
      experienceLevel: "intermediate",
      workoutsPerWeek: 4,
      sessionDurationMinutes: 60,
      trainingEnvironment: "gym",
      unitSystem: "imperial",
    });
    expect(state.heightCm).toBeCloseTo(182.88, 2);
    expect(state.weightKg).toBeCloseTo(81.6466, 2);
  });

  test("resumes create mode from the saved draft step", () => {
    expect(resolveCreateResumeIndex(4, 7)).toBe(4);
    expect(resolveCreateResumeIndex(99, 7)).toBe(6);
  });
});
