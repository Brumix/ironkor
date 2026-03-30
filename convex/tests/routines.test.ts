import { runToCompletion } from "@convex-dev/migrations";
import component from "@convex-dev/migrations/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api, components, internal } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { normalizeExerciseCatalog } from "@convex/exerciseCatalog";
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
  const exerciseId = await authed.mutation(api.exercises.createCustom, {
    name: "Cable Row",
    bodyPart: "back",
    equipment: "cable",
    primaryMuscle: "lats",
    muscleGroups: ["lats"],
  });

  const sessionId = detail.sessions[0]!._id;
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
  const entry = detail.sessions[0]?.exercises.find((item) => item._id === sessionExerciseId);
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
  expect(detail.weeklyPlan[0]).toMatchObject({
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
