import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

interface ImportMetaWithGlob {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}

const modules = (import.meta as ImportMetaWithGlob).glob("./**/*.ts");

function createWeeklyPlan() {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    type: day < 4 ? ("train" as const) : ("rest" as const),
    assignmentMode: "auto" as const,
  }));
}

function createAuthedTest() {
  const t = convexTest(schema, modules);
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
  await authed.mutation(api.routines.upsertSessionExercise, {
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
    sessionId,
    viewerId,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_delete");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("deleteMyAccount queues batched deletion and removes local data after Clerk delete succeeds", async () => {
  const { authed, t } = createAuthedTest();
  const { viewerId } = await seedAccountData(authed);

  const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  const result = await authed.action(api.auth.deleteMyAccount, {});
  expect(result.status).toBe("pending");
  expect(result.jobId).not.toBeNull();

  await t.finishAllScheduledFunctions(() => {
    vi.runAllTimers();
  });

  await t.run(async (ctx) => {
    const viewer = await ctx.db.get(viewerId);
    expect(viewer).toBeNull();

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

    expect(routines).toHaveLength(0);
    expect(sessions).toHaveLength(0);
    expect(sessionExercises).toHaveLength(0);
    expect(exercises).toHaveLength(0);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.status).toBe("complete");
    expect(jobs[0]?.phase).toBe("complete");
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("deleteMyAccount retries Clerk deletion failures before finalizing the user row", async () => {
  const { authed, t } = createAuthedTest();
  const { viewerId } = await seedAccountData(authed);

  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response("temporarily unavailable", { status: 500 }))
    .mockResolvedValueOnce(new Response("", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  const result = await authed.action(api.auth.deleteMyAccount, {});
  expect(result.status).toBe("pending");
  expect(result.jobId).not.toBeNull();

  await t.finishAllScheduledFunctions(() => {
    vi.runAllTimers();
  });

  await t.run(async (ctx) => {
    const viewer = await ctx.db.get(viewerId);
    expect(viewer).toBeNull();

    const jobs = await ctx.db
      .query("accountDeletionJobs")
      .withIndex("by_userId", (q) => q.eq("userId", viewerId))
      .collect();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.attempts).toBe(1);
    expect(jobs[0]?.status).toBe("complete");
  });

  expect(fetchMock).toHaveBeenCalledTimes(2);
});
