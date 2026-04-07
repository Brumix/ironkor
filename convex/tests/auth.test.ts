import { runToCompletion } from "@convex-dev/migrations";
import component from "@convex-dev/migrations/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { api, components, internal } from "@convex/_generated/api";
import schema from "@convex/schema";
import { ACCOUNT_RESTORE_WINDOW_MS } from "@convex/authHelpers";

import type { Doc, Id } from "@convex/_generated/dataModel";

interface ImportMetaWithGlob {
  glob: (pattern: string | string[]) => Record<string, () => Promise<unknown>>;
}

const modules = (import.meta as ImportMetaWithGlob).glob([
  "../**/*.ts",
  "!../tests/**/*.ts",
]);

function createWeeklyPlan() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    type: day < 4 ? ("train" as const) : ("rest" as const),
    assignmentMode: "auto" as const,
  }));
}

function createAuthedTest() {
  const t = convexTest(schema, modules);
  component.register(t as never);
  const authed = t.withIdentity({
    issuer: "https://clerk.test",
    subject: "clerk_user_1",
    tokenIdentifier: "https://clerk.test|clerk_user_1",
    email: "athlete@ironkor.test",
    name: "Ironkor Athlete",
  });
  return { t, authed };
}

async function seedAccountData(authed: ReturnType<typeof createAuthedTest>["authed"]) {
  const viewerId = await authed.mutation(api.auth.ensureViewer, {});
  await authed.mutation(api.profile.completeOnboarding, {
    primaryGoal: "strength",
    experienceLevel: "intermediate",
    workoutsPerWeek: 4,
    sessionDurationMinutes: 60,
    trainingEnvironment: "gym",
    unitSystem: "metric",
    height: 182,
    weight: 82,
  });
  const routineId = await authed.mutation(api.routines.create, {
    name: "Push / Pull",
    daysPerWeek: 4,
    isActive: true,
  });
  const sessionId = await authed.mutation(api.routines.upsertSession, {
    routineId,
    name: "Push Day",
  });
  const exerciseId = await authed.mutation(api.exercises.createCustom, {
    name: "Machine Chest Press",
    bodyPart: "chest",
    equipment: "leverage machine",
    primaryMuscle: "pectorals",
    muscleGroups: ["pectorals"],
  });
  const sessionExerciseId = await authed.mutation(api.routines.upsertSessionExercise, {
    sessionId,
    exerciseId,
    sets: 4,
    repsText: "8-10",
  });
  await authed.mutation(api.routines.updateWeeklyPlan, {
    routineId,
    weeklyPlan: createWeeklyPlan(),
  });

  return {
    exerciseId,
    routineId,
    sessionExerciseId,
    sessionId,
    viewerId,
  };
}

async function finishDeletionSnapshot(
  t: ReturnType<typeof createAuthedTest>["t"],
  jobId: Id<"accountDeletionJobs">,
) {
  for (let index = 0; index < 12; index += 1) {
    await t.run(async (ctx) => {
      await ctx.runMutation(internal.auth.processAccountDeletionJob, { jobId });
    });

    const job = await t.run(async (ctx) => ctx.db.get(jobId));
    if (job?.status === "complete") {
      return;
    }
  }

  throw new Error("Account deletion snapshot did not complete in time.");
}

async function finishDeletionPurge(
  t: ReturnType<typeof createAuthedTest>["t"],
  jobId: Id<"accountDeletionJobs">,
) {
  for (let index = 0; index < 12; index += 1) {
    const result = await t.run(async (ctx) =>
      ctx.runMutation(internal.auth.purgeDeletedAccountData, { jobId }),
    );
    const job = await t.run(async (ctx) => ctx.db.get(jobId));

    if (result.status === "canceled" || job?.purgeStatus === "purged") {
      return result;
    }
  }

  throw new Error("Account deletion purge did not complete in time.");
}

async function getAccountDeletionArtifacts(
  t: ReturnType<typeof createAuthedTest>["t"],
  viewerId: Id<"users">,
) {
  return t.run(async (ctx) => {
    const viewer = await ctx.db.get(viewerId);
    const profiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", viewerId))
      .collect();
    const measurements = await ctx.db
      .query("userMeasurements")
      .withIndex("by_userId_and_recordedAt", (q) => q.eq("userId", viewerId))
      .collect();
    const routines = await ctx.db
      .query("routines")
      .withIndex("by_userId_and_updatedAt", (q) => q.eq("userId", viewerId))
      .collect();
    const sessions = await ctx.db
      .query("routineSessions")
      .withIndex("by_userId_and_routine", (q) => q.eq("userId", viewerId))
      .collect();
    const sessionExercises = await ctx.db
      .query("sessionExercises")
      .withIndex("by_userId_and_session", (q) => q.eq("userId", viewerId))
      .collect();
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_ownerId_and_nameText", (q) => q.eq("ownerId", viewerId))
      .collect();
    const jobs = await ctx.db
      .query("accountDeletionJobs")
      .withIndex("by_userId", (q) => q.eq("userId", viewerId))
      .collect();

    const chunks =
      jobs.length === 0
        ? []
        : await ctx.db
            .query("accountDeletionJobChunks")
            .withIndex("by_jobId", (q) => q.eq("jobId", jobs[0]!._id))
            .collect();

    return {
      chunks,
      exercises,
      jobs,
      measurements,
      profiles,
      routines,
      sessionExercises,
      sessions,
      viewer,
    };
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-01T10:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("ensureViewer does not mirror Clerk profile fields into the user row", async () => {
  const { authed, t } = createAuthedTest();
  const viewerId = await authed.mutation(api.auth.ensureViewer, {});
  await authed.mutation(api.auth.ensureViewer, {});

  await t.run(async (ctx) => {
    const viewer = await ctx.db.get(viewerId);
    expect(viewer).toMatchObject({
      _id: viewerId,
      accountStatus: "active",
      clerkUserId: "clerk_user_1",
      tokenIdentifier: "https://clerk.test|clerk_user_1",
    });
    expect(viewer).not.toHaveProperty("displayName");
    expect(viewer).not.toHaveProperty("imageUrl");
    expect(viewer).not.toHaveProperty("primaryEmail");
  });
});

test("deleteMyAccount soft deletes the user and snapshots exact related ids", async () => {
  const { authed, t } = createAuthedTest();
  const {
    exerciseId,
    routineId,
    sessionExerciseId,
    sessionId,
    viewerId,
  } = await seedAccountData(authed);

  const result = await authed.action(api.auth.deleteMyAccount, {});
  expect(result.status).toBe("pending");
  expect(result.jobId).not.toBeNull();

  await finishDeletionSnapshot(t, result.jobId!);

  const artifacts = await getAccountDeletionArtifacts(t, viewerId);
  expect(artifacts.viewer).toMatchObject({
    _id: viewerId,
    accountStatus: "deleted",
    deletionJobId: result.jobId,
    deletionStatus: "complete",
    restoreDecision: "pending",
  });
  expect(artifacts.viewer?.deletedAt).toBeTypeOf("number");
  expect(artifacts.viewer?.restoreEligibleUntil).toBe(
    artifacts.viewer!.deletedAt! + ACCOUNT_RESTORE_WINDOW_MS,
  );

  expect(artifacts.routines.map((entry) => entry._id)).toEqual([routineId]);
  expect(artifacts.sessions.map((entry) => entry._id)).toEqual([sessionId]);
  expect(artifacts.sessionExercises.map((entry) => entry._id)).toEqual([sessionExerciseId]);
  expect(artifacts.exercises.map((entry) => entry._id)).toEqual([exerciseId]);
  expect(artifacts.profiles).toHaveLength(1);
  expect(artifacts.measurements).toHaveLength(1);

  expect(artifacts.jobs).toHaveLength(1);
  expect(artifacts.jobs[0]).toMatchObject({
    _id: result.jobId,
    phase: "complete",
    status: "complete",
    tokenIdentifier: "https://clerk.test|clerk_user_1",
    userId: viewerId,
  });

  expect(artifacts.chunks).toHaveLength(6);
  expect(
    artifacts.chunks.map((chunk) => ({
      entityIds: chunk.entityIds,
      entityType: chunk.entityType,
    })),
  ).toEqual([
    { entityIds: [routineId], entityType: "routine" },
    { entityIds: [sessionId], entityType: "routineSession" },
    { entityIds: [sessionExerciseId], entityType: "sessionExercise" },
    { entityIds: [exerciseId], entityType: "customExercise" },
    { entityIds: [artifacts.profiles[0]!._id], entityType: "userProfile" },
    { entityIds: [artifacts.measurements[0]!._id], entityType: "userMeasurement" },
  ]);

  expect(await authed.query(api.auth.getViewer, {})).toBeNull();
  expect(await authed.query(api.auth.getRestoreCandidate, {})).toMatchObject({
    deletedAt: artifacts.viewer?.deletedAt,
    restoreEligibleUntil: artifacts.viewer?.restoreEligibleUntil,
    userId: viewerId,
  });
});

test("restoreDeletedAccount reactivates the preserved user row and historical data", async () => {
  const { authed, t } = createAuthedTest();
  const { routineId, viewerId } = await seedAccountData(authed);

  const result = await authed.action(api.auth.deleteMyAccount, {});
  await finishDeletionSnapshot(t, result.jobId!);

  const restoredViewerId = await authed.mutation(api.auth.restoreDeletedAccount, {});
  expect(restoredViewerId).toBe(viewerId);

  const viewer = await authed.query(api.auth.getViewer, {});
  expect(viewer?._id).toBe(viewerId);
  expect(viewer?.accountStatus).toBe("active");
  expect(viewer).not.toHaveProperty("deletedAt");
  expect(viewer).not.toHaveProperty("restoreEligibleUntil");
  expect(viewer).not.toHaveProperty("restoreDecision");
  const profileSummary = await authed.query(api.profile.getViewerProfileSummary, {});
  expect(profileSummary.blocked).toBe(false);
  expect(profileSummary.primaryGoal).toBe("strength");
  expect(profileSummary.latestMeasurement?.weightKg).toBe(82);

  const artifacts = await getAccountDeletionArtifacts(t, viewerId);
  expect(artifacts.jobs).toHaveLength(1);
  expect(artifacts.jobs[0]).toMatchObject({
    restorationStatus: "restored",
    restoredUserId: viewerId,
  });
  expect(artifacts.jobs[0]?.restoredAt).toBeTypeOf("number");
  expect(artifacts.chunks).toHaveLength(6);

  const routineSummaries = await authed.query(api.routines.listSummaries, {});
  expect(routineSummaries).toHaveLength(1);
  expect(routineSummaries[0]?._id).toBe(routineId);
  expect(await authed.query(api.auth.getRestoreCandidate, {})).toBeNull();
});

test("declining restore creates a brand-new active user and hides the old data", async () => {
  const { authed, t } = createAuthedTest();
  const { routineId, viewerId } = await seedAccountData(authed);

  const result = await authed.action(api.auth.deleteMyAccount, {});
  await finishDeletionSnapshot(t, result.jobId!);

  await authed.mutation(api.auth.declineDeletedAccountRestore, {});
  const freshViewerId = await authed.mutation(api.auth.ensureViewer, {});
  expect(freshViewerId).not.toBe(viewerId);

  const viewer = await authed.query(api.auth.getViewer, {});
  expect(viewer?._id).toBe(freshViewerId);
  expect(viewer?.accountStatus).toBe("active");
  expect(await authed.query(api.auth.getRestoreCandidate, {})).toBeNull();
  const profileSummary = await authed.query(api.profile.getViewerProfileSummary, {});
  expect(profileSummary.blocked).toBe(true);
  expect(profileSummary.onboardingStatus).toBe("draft");
  expect(profileSummary.profileExists).toBe(true);
  expect(profileSummary.latestMeasurement).toBeNull();

  const routineSummaries = await authed.query(api.routines.listSummaries, {});
  expect(routineSummaries).toHaveLength(0);

  const artifacts = await getAccountDeletionArtifacts(t, viewerId);
  expect(artifacts.viewer).toMatchObject({
    _id: viewerId,
    accountStatus: "deleted",
    restoreDecision: "declined",
  });
  expect(artifacts.routines[0]?._id).toBe(routineId);
});

test("expired restore windows no longer prompt and ensureViewer creates a new user", async () => {
  const { authed, t } = createAuthedTest();
  const { viewerId } = await seedAccountData(authed);

  const result = await authed.action(api.auth.deleteMyAccount, {});
  await finishDeletionSnapshot(t, result.jobId!);

  vi.setSystemTime(Date.now() + ACCOUNT_RESTORE_WINDOW_MS + 1);

  expect(await authed.query(api.auth.getRestoreCandidate, {})).toBeNull();
  const freshViewerId = await authed.mutation(api.auth.ensureViewer, {});
  expect(freshViewerId).not.toBe(viewerId);

  const viewer = await authed.query(api.auth.getViewer, {});
  expect(viewer?._id).toBe(freshViewerId);
  expect(viewer?.accountStatus).toBe("active");
  const profileSummary = await authed.query(api.profile.getViewerProfileSummary, {});
  expect(profileSummary.blocked).toBe(true);
  expect(profileSummary.onboardingStatus).toBe("draft");
});

test("multiple delete cycles only offer the latest eligible deleted account for restore", async () => {
  const { authed, t } = createAuthedTest();
  const firstAccount = await seedAccountData(authed);

  const firstDeletion = await authed.action(api.auth.deleteMyAccount, {});
  await finishDeletionSnapshot(t, firstDeletion.jobId!);
  await authed.mutation(api.auth.declineDeletedAccountRestore, {});

  const secondViewerId = await authed.mutation(api.auth.ensureViewer, {});
  expect(secondViewerId).not.toBe(firstAccount.viewerId);

  await authed.mutation(api.routines.create, {
    name: "Leg Day",
    daysPerWeek: 3,
    isActive: true,
  });

  const secondDeletion = await authed.action(api.auth.deleteMyAccount, {});
  await finishDeletionSnapshot(t, secondDeletion.jobId!);

  const restoreCandidate = await authed.query(api.auth.getRestoreCandidate, {});
  expect(restoreCandidate?.userId).toBe(secondViewerId);

  await t.run(async (ctx) => {
    const allUsers: Doc<"users">[] = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", "https://clerk.test|clerk_user_1"),
      )
      .collect();
    const firstDeletedUser = allUsers.find((user) => user._id === firstAccount.viewerId);
    const secondDeletedUser = allUsers.find((user) => user._id === secondViewerId);

    expect(firstDeletedUser).toMatchObject({
      _id: firstAccount.viewerId,
      restoreDecision: "declined",
    });
    expect(secondDeletedUser).toMatchObject({
      _id: secondViewerId,
      restoreDecision: "pending",
    });
  });
});

test("legacy active users can be backfilled into non-blocking complete profiles", async () => {
  const { t } = createAuthedTest();

  await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: "https://clerk.test|legacy_onboarding_user",
      clerkUserId: "legacy_onboarding_user",
      accountStatus: "active",
      createdAt: 10,
      updatedAt: 20,
    });

    await runToCompletion(
      ctx,
      components.migrations,
      internal.migrations.backfillLegacyUserProfiles,
    );

    const profiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      userId,
      onboardingStatus: "complete",
      completionMethod: "legacy_backfill",
      onboardingVersion: 1,
    });
  });
});

test("purgeDeletedAccountData permanently removes preserved account data after the restore window", async () => {
  const { authed, t } = createAuthedTest();
  const { viewerId } = await seedAccountData(authed);

  const result = await authed.action(api.auth.deleteMyAccount, {});
  expect(result.jobId).not.toBeNull();
  await finishDeletionSnapshot(t, result.jobId!);

  vi.setSystemTime(Date.now() + ACCOUNT_RESTORE_WINDOW_MS + 1);

  await finishDeletionPurge(t, result.jobId!);

  const artifacts = await getAccountDeletionArtifacts(t, viewerId);
  expect(artifacts.viewer).toBeNull();
  expect(artifacts.routines).toHaveLength(0);
  expect(artifacts.sessions).toHaveLength(0);
  expect(artifacts.sessionExercises).toHaveLength(0);
  expect(artifacts.exercises).toHaveLength(0);
  expect(artifacts.profiles).toHaveLength(0);
  expect(artifacts.measurements).toHaveLength(0);
  expect(artifacts.jobs[0]).toMatchObject({
    _id: result.jobId,
    purgeStatus: "purged",
  });
  expect(artifacts.jobs[0]?.purgedAt).toBeTypeOf("number");
  expect(artifacts.chunks).toHaveLength(0);
});

test("restored accounts are never purged", async () => {
  const { authed, t } = createAuthedTest();
  const { viewerId } = await seedAccountData(authed);

  const result = await authed.action(api.auth.deleteMyAccount, {});
  expect(result.jobId).not.toBeNull();
  await finishDeletionSnapshot(t, result.jobId!);
  await authed.mutation(api.auth.restoreDeletedAccount, {});

  vi.setSystemTime(Date.now() + ACCOUNT_RESTORE_WINDOW_MS + 1);

  const purgeResult = await finishDeletionPurge(t, result.jobId!);
  expect(purgeResult).toMatchObject({ status: "canceled" });

  const artifacts = await getAccountDeletionArtifacts(t, viewerId);
  expect(artifacts.viewer).toMatchObject({
    _id: viewerId,
    accountStatus: "active",
  });
  expect(artifacts.routines.length).toBeGreaterThan(0);
  expect(artifacts.jobs[0]).toMatchObject({
    purgeStatus: "canceled",
    restorationStatus: "restored",
  });
});

test("duplicate active users fail closed until the repair migration runs", async () => {
  const { authed, t } = createAuthedTest();

  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      tokenIdentifier: "https://clerk.test|clerk_user_1",
      clerkUserId: "legacy_duplicate_old",
      accountStatus: "active",
      createdAt: 1,
      updatedAt: 1,
    });
    await ctx.db.insert("users", {
      tokenIdentifier: "https://clerk.test|clerk_user_1",
      clerkUserId: "legacy_duplicate_new",
      accountStatus: "active",
      createdAt: 2,
      updatedAt: 2,
    });
  });

  await expect(authed.query(api.auth.getViewer, {})).rejects.toThrow(
    "Duplicate active users found for identity https://clerk.test|clerk_user_1.",
  );

  await t.run(async (ctx) => {
    await runToCompletion(
      ctx,
      components.migrations,
      internal.migrations.repairDuplicateActiveUsers,
    );
  });

  const viewer = await authed.query(api.auth.getViewer, {});
  expect(viewer).toMatchObject({
    clerkUserId: "legacy_duplicate_new",
    accountStatus: "active",
  });

  await t.run(async (ctx) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", "https://clerk.test|clerk_user_1"),
      )
      .collect();
    const activeUsers = users.filter((user) => user.accountStatus === "active");
    const deletedUsers = users.filter((user) => user.accountStatus === "deleted");

    expect(activeUsers).toHaveLength(1);
    expect(activeUsers[0]?.clerkUserId).toBe("legacy_duplicate_new");
    expect(deletedUsers).toHaveLength(1);
    expect(deletedUsers[0]?.restoreDecision).toBe("declined");
  });
});
