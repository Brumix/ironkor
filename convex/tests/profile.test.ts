import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "@convex/_generated/api";
import schema from "@convex/schema";

interface ImportMetaWithGlob {
  glob: (pattern: string | string[]) => Record<string, () => Promise<unknown>>;
}

const modules = (import.meta as ImportMetaWithGlob).glob([
  "../**/*.ts",
  "!../tests/**/*.ts",
]);

function createAuthedTest() {
  const t = convexTest(schema, modules);
  const authed = t.withIdentity({
    issuer: "https://clerk.test",
    subject: "clerk_user_profile",
    tokenIdentifier: "https://clerk.test|clerk_user_profile",
    email: "profile@ironkor.test",
    name: "Profile Athlete",
  });
  return { t, authed };
}

test("completeOnboarding creates a completed profile and first weight entry", async () => {
  const { authed } = createAuthedTest();

  await authed.mutation(api.auth.ensureViewer, {});
  await authed.mutation(api.profile.completeOnboarding, {
    primaryGoal: "muscle_gain",
    experienceLevel: "beginner",
    workoutsPerWeek: 3,
    sessionDurationMinutes: 45,
    trainingEnvironment: "home",
    unitSystem: "imperial",
    height: 70,
    weight: 185,
  });

  const summary = await authed.query(api.profile.getViewerProfileSummary, {});
  expect(summary.blocked).toBe(false);
  expect(summary.isComplete).toBe(true);
  expect(summary.primaryGoal).toBe("muscle_gain");
  expect(summary.experienceLevel).toBe("beginner");
  expect(summary.trainingEnvironment).toBe("home");
  expect(summary.unitSystem).toBe("imperial");
  expect(summary.latestMeasurement).not.toBeNull();
  expect(summary.latestMeasurement?.source).toBe("onboarding");
  expect(summary.heightCm).toBeCloseTo(177.8, 3);
  expect(summary.latestMeasurement?.weightKg).toBeCloseTo(83.9146, 3);
});

test("draft onboarding keeps the gate blocked and resumes from the saved step", async () => {
  const { authed } = createAuthedTest();

  await authed.mutation(api.auth.ensureViewer, {});
  await authed.mutation(api.profile.saveOnboardingDraft, {
    primaryGoal: "strength",
    experienceLevel: "intermediate",
    workoutsPerWeek: 4,
    sessionDurationMinutes: 60,
    trainingEnvironment: "gym",
    unitSystem: "metric",
    resumeStep: 4,
  });

  const summary = await authed.query(api.profile.getViewerProfileSummary, {});
  expect(summary.blocked).toBe(true);
  expect(summary.isComplete).toBe(false);
  expect(summary.resumeStep).toBe(4);
  expect(summary.primaryGoal).toBe("strength");
  expect(summary.experienceLevel).toBe("intermediate");
});

test("logWeight appends history instead of overwriting the previous measurement", async () => {
  const { authed, t } = createAuthedTest();

  const viewerId = await authed.mutation(api.auth.ensureViewer, {});
  await authed.mutation(api.profile.completeOnboarding, {
    primaryGoal: "recomp",
    experienceLevel: "advanced",
    workoutsPerWeek: 5,
    sessionDurationMinutes: 75,
    trainingEnvironment: "hybrid",
    unitSystem: "metric",
    height: 180,
    weight: 84,
  });
  await authed.mutation(api.profile.logWeight, {
    unitSystem: "metric",
    weight: 82.5,
  });

  const summary = await authed.query(api.profile.getViewerProfileSummary, {});
  expect(summary.latestMeasurement?.weightKg).toBe(82.5);
  expect(summary.latestMeasurement?.source).toBe("settings");

  await t.run(async (ctx) => {
    const measurements = await ctx.db
      .query("userMeasurements")
      .withIndex("by_userId_and_recordedAt", (q) => q.eq("userId", viewerId))
      .collect();

    expect(measurements).toHaveLength(2);
    expect(
      measurements.map((entry) => entry.weightKg).sort((left, right) => right - left),
    ).toEqual([84, 82.5]);
  });
});

test("updateTrainingProfile supports partial settings edits", async () => {
  const { authed } = createAuthedTest();

  await authed.mutation(api.auth.ensureViewer, {});
  await authed.mutation(api.profile.completeOnboarding, {
    primaryGoal: "strength",
    experienceLevel: "beginner",
    workoutsPerWeek: 3,
    sessionDurationMinutes: 45,
    trainingEnvironment: "gym",
    unitSystem: "metric",
    height: 175,
    weight: 80,
  });

  await authed.mutation(api.profile.updateTrainingProfile, {
    primaryGoal: "recomp",
  });
  await authed.mutation(api.profile.updateTrainingProfile, {
    unitSystem: "imperial",
  });

  const summary = await authed.query(api.profile.getViewerProfileSummary, {});
  expect(summary.primaryGoal).toBe("recomp");
  expect(summary.unitSystem).toBe("imperial");
  expect(summary.experienceLevel).toBe("beginner");
  expect(summary.workoutsPerWeek).toBe(3);
  expect(summary.heightCm).toBe(175);
});
