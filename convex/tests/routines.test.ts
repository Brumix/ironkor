import { runToCompletion } from "@convex-dev/migrations";
import component from "@convex-dev/migrations/test";
import { convexTest } from "convex-test";
import type { FunctionReference } from "convex/server";
import { expect, test } from "vitest";

import { api, components, internal } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { normalizeExerciseCatalog } from "@convex/exerciseCatalog";
import { getRoutineWeeklyPlan } from "@convex/routines/helpers";
import schema from "@convex/schema";

interface ImportMetaWithGlob {
  glob: (pattern: string | string[]) => Record<string, () => Promise<unknown>>;
}

const modules = (import.meta as ImportMetaWithGlob).glob([
  "../**/*.ts",
  "!../tests/**/*.ts",
]);

const saveRoutineMutation = api.routines.saveRoutine as unknown as FunctionReference<
  "mutation",
  "public",
  Record<string, unknown>,
  Id<"routines">
>;

function createAuthedTest() {
  const t = convexTest(schema, modules);
  component.register(t as never);
  const authed = t.withIdentity({
    issuer: "https://clerk.test",
    subject: "clerk_user_2",
    tokenIdentifier: "https://clerk.test|clerk_user_2",
    email: "coach@ironkor.test",
    name: "Coach Ironkor",
  });
  return { t, authed };
}

function createTrainingWeek(manualSessionId?: Id<"routineSessions">) {
  return Array.from({ length: 7 }, (_, day) => {
    if (day === 0 && manualSessionId) {
      return {
        day,
        type: "train" as const,
        assignmentMode: "manual" as const,
        manualSessionId,
      };
    }

    return {
      day,
      type: day < 4 ? ("train" as const) : ("rest" as const),
      assignmentMode: "auto" as const,
    };
  });
}

function createSaveRoutineWeeklyPlan(trainingDays = [0, 1, 2, 3]) {
  const daySet = new Set(trainingDays);
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    type: daySet.has(day) ? ("train" as const) : ("rest" as const),
  }));
}

test("routine and session limits are enforced", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});
  const routineId = await authed.mutation(api.routines.create, {
    name: "Upper / Lower",
    daysPerWeek: 4,
    isActive: true,
  });

  for (let index = 0; index < 12; index += 1) {
    await authed.mutation(api.routines.upsertSession, {
      routineId,
      name: `Section ${index + 1}`,
    });
  }

  await expect(
    authed.mutation(api.routines.upsertSession, {
      routineId,
      name: "Section 13",
    }),
  ).rejects.toThrow("Routines can have at most 12 sections.");

  const detail = await authed.query(api.routines.getDetailedById, { routineId });
  expect(detail).not.toBeNull();
  const exerciseId = await authed.mutation(api.exercises.createCustom, {
    name: "Cable Row",
    bodyPart: "back",
    equipment: "cable",
    primaryMuscle: "lats",
    muscleGroups: ["lats"],
  });

  const sessionId = detail!.sessions[0]!._id;
  for (let index = 0; index < 40; index += 1) {
    await authed.mutation(api.routines.upsertSessionExercise, {
      sessionId,
      exerciseId,
      sets: 3,
      repsText: "8-12",
    });
  }

  await expect(
    authed.mutation(api.routines.upsertSessionExercise, {
      sessionId,
      exerciseId,
      sets: 3,
      repsText: "8-12",
    }),
  ).rejects.toThrow("Sections can have at most 40 exercises.");
});

test("exercise programming is clamped and validates text lengths", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});
  const routineId = await authed.mutation(api.routines.create, {
    name: "Programming Bounds",
    daysPerWeek: 3,
    isActive: true,
  });
  const sessionId = await authed.mutation(api.routines.upsertSession, {
    routineId,
    name: "Upper",
  });
  const exerciseId = await authed.mutation(api.exercises.createCustom, {
    name: "Clamp Test",
    bodyPart: "chest",
    equipment: "barbell",
    primaryMuscle: "pectorals",
    muscleGroups: ["pectorals"],
  });

  const sessionExerciseId = await authed.mutation(api.routines.upsertSessionExercise, {
    sessionId,
    exerciseId,
    sets: 5_000,
    repsText: "10-12",
    restSeconds: 99_999,
    rir: 99,
  });

  const detail = await authed.query(api.routines.getDetailedById, { routineId });
  expect(detail).not.toBeNull();
  const entry = detail!.sessions[0]?.exercises.find((item) => item._id === sessionExerciseId);
  expect(entry?.sets).toBe(100);
  expect(entry?.restSeconds).toBe(3_600);
  expect(entry?.rir).toBe(15);

  await expect(
    authed.mutation(api.routines.updateSessionExerciseProgramming, {
      sessionId,
      sessionExerciseId,
      repsText: "A".repeat(51),
    }),
  ).rejects.toThrow("Reps text must be 50 characters or fewer.");

  await expect(
    authed.mutation(api.routines.updateSessionExerciseProgramming, {
      sessionId,
      sessionExerciseId,
      notes: "B".repeat(501),
    }),
  ).rejects.toThrow("Notes must be 500 characters or fewer.");

  await expect(
    authed.mutation(api.routines.updateSessionExerciseProgramming, {
      sessionId,
      sessionExerciseId,
      tempo: "C".repeat(21),
    }),
  ).rejects.toThrow("Tempo must be 20 characters or fewer.");
});

test("deleting a session clears manual weekly-plan assignments", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});
  const routineId = await authed.mutation(api.routines.create, {
    name: "Push / Pull / Legs",
    daysPerWeek: 4,
    isActive: true,
  });
  const sessionA = await authed.mutation(api.routines.upsertSession, {
    routineId,
    name: "Push",
  });
  await authed.mutation(api.routines.upsertSession, {
    routineId,
    name: "Pull",
  });

  await authed.mutation(api.routines.updateWeeklyPlan, {
    routineId,
    weeklyPlan: createTrainingWeek(sessionA),
  });

  await authed.mutation(api.routines.deleteSession, {
    routineId,
    sessionId: sessionA,
  });

  const detail = await authed.query(api.routines.getDetailedById, { routineId });
  expect(detail).not.toBeNull();
  expect(detail!.weeklyPlan[0]).toMatchObject({
    day: 0,
    type: "train",
    assignmentMode: "auto",
  });
});

test("deleting the active routine promotes the next remaining routine", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});
  const primaryRoutineId = await authed.mutation(api.routines.create, {
    name: "Primary",
    daysPerWeek: 4,
    isActive: true,
  });
  const secondaryRoutineId = await authed.mutation(api.routines.create, {
    name: "Secondary",
    daysPerWeek: 3,
    isActive: false,
  });

  await authed.mutation(api.routines.deleteRoutine, {
    routineId: primaryRoutineId,
  });

  const summaries = await authed.query(api.routines.listSummaries, {});
  expect(summaries).toHaveLength(1);
  expect(summaries[0]?._id).toBe(secondaryRoutineId);
  expect(summaries[0]?.isActive).toBe(true);
});

test("getDetailedById returns null after routine is deleted", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});
  const routineId = await authed.mutation(api.routines.create, {
    name: "Deleted Detail",
    daysPerWeek: 3,
    isActive: false,
  });
  await authed.mutation(api.routines.deleteRoutine, { routineId });
  const detail = await authed.query(api.routines.getDetailedById, { routineId });
  expect(detail).toBeNull();
});

test("reorder mutations reject duplicate ids", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});
  const routineId = await authed.mutation(api.routines.create, {
    name: "Dupes Guard",
    daysPerWeek: 3,
    isActive: true,
  });
  const sessionA = await authed.mutation(api.routines.upsertSession, {
    routineId,
    name: "A",
  });
  const sessionB = await authed.mutation(api.routines.upsertSession, {
    routineId,
    name: "B",
  });

  await expect(
    authed.mutation(api.routines.reorderSessions, {
      routineId,
      orderedSessionIds: [sessionA, sessionA],
    }),
  ).rejects.toThrow("Section reorder payload contains duplicate ids.");

  const exerciseId = await authed.mutation(api.exercises.createCustom, {
    name: "Test Bench",
    bodyPart: "chest",
    equipment: "barbell",
    primaryMuscle: "pectorals",
    muscleGroups: ["pectorals", "triceps"],
  });

  const entryA = await authed.mutation(api.routines.upsertSessionExercise, {
    sessionId: sessionB,
    exerciseId,
    sets: 3,
    repsText: "8-10",
  });
  const entryB = await authed.mutation(api.routines.upsertSessionExercise, {
    sessionId: sessionB,
    exerciseId,
    sets: 4,
    repsText: "6-8",
  });

  await expect(
    authed.mutation(api.routines.reorderSessionExercises, {
      sessionId: sessionB,
      orderedSessionExerciseIds: [entryA, entryA],
    }),
  ).rejects.toThrow("Section exercise reorder payload contains duplicate ids.");

  await authed.mutation(api.routines.reorderSessionExercises, {
    sessionId: sessionB,
    orderedSessionExerciseIds: [entryB, entryA],
  });
});

test("nameKey migrations backfill legacy routines and sessions", async () => {
  const { t } = createAuthedTest();

  await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: "legacy-token",
      clerkUserId: "legacy-clerk",
      createdAt: 1,
      updatedAt: 1,
    });
    const routineId = await ctx.db.insert("routines", {
      userId,
      name: "Legacy Push Day",
      daysPerWeek: 4,
      isActive: false,
      sessionOrder: [],
      weeklyPlan: createTrainingWeek(),
      updatedAt: 1,
    });
    await ctx.db.insert("routineSessions", {
      userId,
      routineId,
      name: "Legacy Session",
      order: 0,
      updatedAt: 1,
    });

    await runToCompletion(ctx, components.migrations, internal.migrations.backfillRoutineNameKeys);
    await runToCompletion(
      ctx,
      components.migrations,
      internal.migrations.backfillRoutineSessionNameKeys,
    );

    const routines = await ctx.db.query("routines").collect();
    const sessions = await ctx.db.query("routineSessions").collect();

    expect(routines[0]?.nameKey).toBe("legacy push day");
    expect(sessions[0]?.nameKey).toBe("legacy session");
  });
});

test("legacy routines without a usable weekly plan fall back to a default schedule", () => {
  const weeklyPlan = getRoutineWeeklyPlan({
    daysPerWeek: 4,
  });

  expect(weeklyPlan).toHaveLength(7);
  expect(weeklyPlan.filter((entry) => entry.type === "train")).toHaveLength(4);
});

test("weekly plan migration backfills malformed legacy routines", async () => {
  const { authed, t } = createAuthedTest();
  const viewerId = await authed.mutation(api.auth.ensureViewer, {});

  await t.run(async (ctx) => {
    await ctx.db.insert("routines", {
      userId: viewerId,
      name: "Legacy Weekly Plan",
      daysPerWeek: 3,
      isActive: true,
      sessionOrder: [],
      weeklyPlan: [],
      updatedAt: 1,
    });
  });

  const detail = await authed.query(api.routines.getActiveDetailed, {});
  expect(detail?.weeklyPlan).toHaveLength(7);
  expect(detail?.daysPerWeek).toBe(3);

  await t.run(async (ctx) => {
    await runToCompletion(
      ctx,
      components.migrations,
      internal.migrations.backfillRoutineWeeklyPlans,
    );

    const routines = await ctx.db
      .query("routines")
      .withIndex("by_userId_and_isActive", (q) =>
        q.eq("userId", viewerId).eq("isActive", true),
      )
      .take(1);

    expect(routines).toHaveLength(1);
    expect(routines[0]?.weeklyPlan).toHaveLength(7);
    expect(routines[0]?.daysPerWeek).toBe(3);
  });
});

test("internal seed defaults are scoped to a specific user", async () => {
  const { t } = createAuthedTest();

  await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: "seed-user-token",
      clerkUserId: "seed-user-clerk",
      createdAt: 1,
      updatedAt: 1,
    });

    const result = await ctx.runMutation(internal.routines.seed.seedDefaultsIfEmpty, {
      userId,
    });
    expect(result).toEqual({ seeded: true });

    const routines = await ctx.db
      .query("routines")
      .withIndex("by_userId_and_updatedAt", (q) => q.eq("userId", userId))
      .take(10);
    expect(routines).toHaveLength(1);

    const sessions = await ctx.db
      .query("routineSessions")
      .withIndex("by_userId_and_routine", (q) =>
        q.eq("userId", userId).eq("routineId", routines[0]!._id),
      )
      .take(10);
    expect(sessions.length).toBeGreaterThan(0);

    const exercises = await ctx.db
      .query("sessionExercises")
      .withIndex("by_userId_and_session", (q) =>
        q.eq("userId", userId).eq("sessionId", sessions[0]!._id),
      )
      .take(10);
    expect(exercises.length).toBeGreaterThan(0);
  });
});

test("ownership migrations backfill session and exercise user ids", async () => {
  const { t } = createAuthedTest();

  await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: "ownership-user-token",
      clerkUserId: "ownership-user-clerk",
      createdAt: 1,
      updatedAt: 1,
    });
    const routineId = await ctx.db.insert("routines", {
      userId,
      name: "Owner Routine",
      daysPerWeek: 3,
      isActive: false,
      sessionOrder: [],
      weeklyPlan: createTrainingWeek(),
      updatedAt: 1,
    });
    const sessionId = await ctx.db.insert("routineSessions", {
      routineId,
      name: "Legacy Session Missing Owner",
      order: 0,
      updatedAt: 1,
    });
    const exerciseId = await ctx.db.insert(
      "exercises",
      normalizeExerciseCatalog({
        name: "Owned Migration Exercise",
        bodyPart: "chest",
        equipment: "barbell",
        primaryMuscle: "pectorals",
        muscleGroups: ["pectorals"],
      }),
    );
    const sessionExerciseId = await ctx.db.insert("sessionExercises", {
      sessionId,
      exerciseId,
      order: 0,
      sets: 3,
      repsText: "8-12",
      updatedAt: 1,
    });

    await runToCompletion(ctx, components.migrations, internal.migrations.backfillRoutineSessionUserIds);
    await runToCompletion(ctx, components.migrations, internal.migrations.backfillSessionExerciseUserIds);

    const session = await ctx.db.get(sessionId);
    const entry = await ctx.db.get(sessionExerciseId);
    expect(session?.userId).toBe(userId);
    expect(entry?.userId).toBe(userId);
  });
});

test("saveRoutine creates, updates, and summarizes routines with stored exercise counts", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});

  const squatId = await authed.mutation(api.exercises.createCustom, {
    name: "Front Squat",
    bodyPart: "upper legs",
    equipment: "barbell",
    primaryMuscle: "quads",
    muscleGroups: ["quads", "glutes"],
  });
  const rowId = await authed.mutation(api.exercises.createCustom, {
    name: "Seal Row",
    bodyPart: "back",
    equipment: "barbell",
    primaryMuscle: "lats",
    muscleGroups: ["lats", "traps"],
  });
  const pressId = await authed.mutation(api.exercises.createCustom, {
    name: "Machine Press",
    bodyPart: "chest",
    equipment: "leverage machine",
    primaryMuscle: "pectorals",
    muscleGroups: ["pectorals", "triceps"],
  });

  const routineId = await authed.mutation(saveRoutineMutation, {
    name: "Atomic Builder",
    weeklyPlan: createSaveRoutineWeeklyPlan([0, 2, 4]),
    sessions: [
      {
        clientKey: "draft-session-a",
        name: "Lower",
        exercises: [
          {
            exerciseId: squatId,
            sets: 4,
            repsText: "5",
          },
          {
            exerciseId: rowId,
            sets: 3,
            repsText: "8",
          },
        ],
      },
      {
        clientKey: "draft-session-b",
        name: "Upper",
        exercises: [
          {
            exerciseId: pressId,
            sets: 3,
            repsText: "10",
          },
        ],
      },
    ],
  });

  let detail = await authed.query(api.routines.getDetailedById, { routineId });
  expect(detail).not.toBeNull();
  expect(detail!.daysPerWeek).toBe(3);
  expect(detail!.sessions.map((session) => session.exerciseCount)).toEqual([2, 1]);

  const lowerSession = detail!.sessions.find((session) => session.name === "Lower");
  const upperSession = detail!.sessions.find((session) => session.name === "Upper");
  expect(lowerSession).toBeTruthy();
  expect(upperSession).toBeTruthy();

  await authed.mutation(saveRoutineMutation, {
    routineId,
    name: "Atomic Builder V2",
    weeklyPlan: createSaveRoutineWeeklyPlan([1, 3, 5]),
    sessions: [
      {
        sessionId: upperSession!._id,
        clientKey: "session:upper",
        name: "Upper Prime",
        exercises: [
          {
            sessionExerciseId: upperSession!.exercises[0]!._id,
            exerciseId: pressId,
            sets: 5,
            repsText: "6-8",
          },
          {
            exerciseId: rowId,
            sets: 3,
            repsText: "10",
          },
        ],
      },
    ],
  });

  detail = await authed.query(api.routines.getDetailedById, { routineId });
  expect(detail).not.toBeNull();
  expect(detail!.name).toBe("Atomic Builder V2");
  expect(detail!.weeklyPlan.filter((entry) => entry.type === "train").map((entry) => entry.day)).toEqual([1, 3, 5]);
  expect(detail!.sessions).toHaveLength(1);
  expect(detail!.sessions[0]).toMatchObject({
    name: "Upper Prime",
    exerciseCount: 2,
  });
  expect(detail!.sessions[0]?.exercises.map((entry) => entry.repsText)).toEqual(["6-8", "10"]);

  const summaries = await authed.query(api.routines.listSummaries, {});
  expect(summaries[0]).toMatchObject({
    _id: routineId,
  });
  expect(summaries[0]?.sessions.map((session) => session.exerciseCount)).toEqual([2]);
});

test("saveRoutine rolls back draft changes when validation fails mid-update", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});

  const safeExerciseId = await authed.mutation(api.exercises.createCustom, {
    name: "Safe Exercise",
    bodyPart: "back",
    equipment: "cable",
    primaryMuscle: "lats",
    muscleGroups: ["lats"],
  });
  const archivedExerciseId = await authed.mutation(api.exercises.createCustom, {
    name: "Archived Exercise",
    bodyPart: "chest",
    equipment: "barbell",
    primaryMuscle: "pectorals",
    muscleGroups: ["pectorals"],
  });
  await authed.mutation(api.exercises.archiveCustom, { exerciseId: archivedExerciseId });

  const routineId = await authed.mutation(saveRoutineMutation, {
    name: "Rollback Guard",
    weeklyPlan: createSaveRoutineWeeklyPlan([0, 1]),
    sessions: [
      {
        clientKey: "draft-a",
        name: "Session A",
        exercises: [{ exerciseId: safeExerciseId, sets: 3, repsText: "8" }],
      },
      {
        clientKey: "draft-b",
        name: "Session B",
        exercises: [{ exerciseId: safeExerciseId, sets: 4, repsText: "10" }],
      },
    ],
  });

  const originalDetail = await authed.query(api.routines.getDetailedById, { routineId });
  expect(originalDetail).not.toBeNull();

  await expect(
    authed.mutation(saveRoutineMutation, {
      routineId,
      name: "Rollback Attempt",
      weeklyPlan: createSaveRoutineWeeklyPlan([2, 4]),
      sessions: [
        {
          sessionId: originalDetail!.sessions[0]!._id,
          clientKey: "persisted-a",
          name: "Session A Updated",
          exercises: [
            {
              sessionExerciseId: originalDetail!.sessions[0]!.exercises[0]!._id,
              exerciseId: archivedExerciseId,
              sets: 5,
              repsText: "5",
            },
          ],
        },
      ],
    }),
  ).rejects.toThrow("Archived exercises cannot be attached.");

  const detailAfterFailure = await authed.query(api.routines.getDetailedById, { routineId });
  expect(detailAfterFailure).toEqual(originalDetail);
});

test("exercise count migration backfills stored section counts", async () => {
  const { t } = createAuthedTest();

  await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: "exercise-count-token",
      clerkUserId: "exercise-count-user",
      accountStatus: "active",
      createdAt: 1,
      updatedAt: 1,
    });
    const routineId = await ctx.db.insert("routines", {
      userId,
      name: "Legacy Counts",
      nameKey: "legacy counts",
      daysPerWeek: 3,
      isActive: false,
      sessionOrder: [],
      weeklyPlan: createTrainingWeek(),
      updatedAt: 1,
    });
    const sessionId = await ctx.db.insert("routineSessions", {
      userId,
      routineId,
      name: "Count Me",
      nameKey: "count me",
      order: 0,
      updatedAt: 1,
    });
    const exerciseId = await ctx.db.insert(
      "exercises",
      normalizeExerciseCatalog({
        name: "Counted Exercise",
        bodyPart: "back",
        equipment: "cable",
        primaryMuscle: "lats",
        muscleGroups: ["lats"],
      }),
    );

    await ctx.db.insert("sessionExercises", {
      userId,
      sessionId,
      exerciseId,
      order: 0,
      sets: 3,
      repsText: "8-12",
      updatedAt: 1,
    });
    await ctx.db.insert("sessionExercises", {
      userId,
      sessionId,
      exerciseId,
      order: 1,
      sets: 4,
      repsText: "6-8",
      updatedAt: 1,
    });

    await runToCompletion(
      ctx,
      components.migrations,
      internal.migrations.backfillRoutineSessionExerciseCounts,
    );

    const session = await ctx.db.get(sessionId);
    expect(session?.exerciseCount).toBe(2);
  });
});
