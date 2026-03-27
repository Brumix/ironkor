import component from "@convex-dev/migrations/test";
import { runToCompletion } from "@convex-dev/migrations";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api, components, internal } from "./_generated/api";
import schema from "./schema";

import type { Id } from "./_generated/dataModel";

interface ImportMetaWithGlob {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}

const modules = (import.meta as ImportMetaWithGlob).glob("./**/*.ts");

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
