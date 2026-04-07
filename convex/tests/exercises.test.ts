import component from "@convex-dev/migrations/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import {
  BODY_PART_VALUES,
  EQUIPMENT_VALUES,
  MUSCLES_BY_BODY_PART,
  MUSCLE_VALUES,
  getUniqueBodyPartForMuscle,
} from "@ironkor/shared/constants";

import { api } from "@convex/_generated/api";
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
    subject: "clerk_user_filters",
    tokenIdentifier: "https://clerk.test|clerk_user_filters",
    email: "filters@ironkor.test",
    name: "Filter Tester",
  });
  return { t, authed };
}

type TestRuntime = ReturnType<typeof createAuthedTest>["t"];

async function seedExercises(t: TestRuntime, viewerId: Id<"users">) {
  await t.run(async (ctx) => {
    const otherUserId = await ctx.db.insert("users", {
      tokenIdentifier: "https://clerk.test|other_filters_user",
      clerkUserId: "other_filters_user",
      createdAt: 1,
      updatedAt: 1,
    });

    await ctx.db.insert(
      "exercises",
      normalizeExerciseCatalog({
        name: "Bench Press",
        bodyPart: "chest",
        equipment: "barbell",
        primaryMuscle: "pectorals",
        muscleGroups: ["pectorals", "triceps", "delts"],
      }),
    );
    await ctx.db.insert(
      "exercises",
      normalizeExerciseCatalog({
        name: "Cable Fly",
        bodyPart: "chest",
        equipment: "cable",
        primaryMuscle: "pectorals",
        muscleGroups: ["pectorals", "serratus anterior"],
      }),
    );
    await ctx.db.insert(
      "exercises",
      normalizeExerciseCatalog({
        name: "Lat Pulldown",
        bodyPart: "back",
        equipment: "cable",
        primaryMuscle: "lats",
        muscleGroups: ["lats", "biceps"],
      }),
    );
    await ctx.db.insert(
      "exercises",
      normalizeExerciseCatalog({
        name: "Shoulder Press",
        bodyPart: "shoulders",
        equipment: "dumbbell",
        primaryMuscle: "delts",
        muscleGroups: ["delts", "triceps"],
      }),
    );
    await ctx.db.insert(
      "exercises",
      normalizeExerciseCatalog({
        name: "Assisted Chin-Up",
        bodyPart: "back",
        equipment: "assisted",
        primaryMuscle: "lats",
        muscleGroups: ["lats", "biceps"],
        isCustom: true,
        ownerId: viewerId,
      }),
    );
    await ctx.db.insert(
      "exercises",
      normalizeExerciseCatalog({
        name: "Private Chest Machine",
        bodyPart: "chest",
        equipment: "leverage machine",
        primaryMuscle: "pectorals",
        muscleGroups: ["pectorals"],
        isCustom: true,
        ownerId: otherUserId,
      }),
    );
  });
}

test("exercise taxonomy maps unique muscles to the expected body part", () => {
  expect(getUniqueBodyPartForMuscle("pectorals")).toBe("chest");
  expect(getUniqueBodyPartForMuscle("delts")).toBe("shoulders");
  expect(getUniqueBodyPartForMuscle("lats")).toBe("back");
  expect(MUSCLES_BY_BODY_PART.chest).toEqual(["pectorals", "serratus anterior"]);
});

test("facet query returns default option sets with no filters", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});

  const options = await authed.query(api.exercises.getAvailableFilterOptions, {});

  expect(options.bodyParts).toEqual(BODY_PART_VALUES);
  expect(options.muscles).toEqual(MUSCLE_VALUES);
  expect(options.equipment).toEqual(EQUIPMENT_VALUES);
});

test("facet query narrows muscles and equipment for a selected body part", async () => {
  const { t, authed } = createAuthedTest();
  const viewerId = await authed.mutation(api.auth.ensureViewer, {});
  await seedExercises(t, viewerId);

  const options = await authed.query(api.exercises.getAvailableFilterOptions, {
    bodyPart: "chest",
  });

  expect(options.bodyParts).toEqual(BODY_PART_VALUES);
  expect(options.muscles).toEqual(["pectorals", "serratus anterior"]);
  expect(options.equipment).toEqual(["cable", "barbell"]);
});

test("facet query auto body-part context and equipment options follow primary muscle", async () => {
  const { t, authed } = createAuthedTest();
  const viewerId = await authed.mutation(api.auth.ensureViewer, {});
  await seedExercises(t, viewerId);

  const options = await authed.query(api.exercises.getAvailableFilterOptions, {
    primaryMuscle: "pectorals",
  });

  expect(options.bodyParts).toEqual(["chest"]);
  expect(options.muscles).toEqual(MUSCLE_VALUES);
  expect(options.equipment).toEqual(["cable", "barbell"]);
});

test("facet query narrows body parts and muscles for selected equipment", async () => {
  const { t, authed } = createAuthedTest();
  const viewerId = await authed.mutation(api.auth.ensureViewer, {});
  await seedExercises(t, viewerId);

  const options = await authed.query(api.exercises.getAvailableFilterOptions, {
    equipment: "cable",
  });

  expect(options.bodyParts).toEqual(["chest", "back"]);
  expect(options.muscles).toEqual(["pectorals", "lats"]);
  expect(options.equipment).toEqual(EQUIPMENT_VALUES);
});

test("facet query returns no equipment options for an impossible body-part and muscle pair", async () => {
  const { t, authed } = createAuthedTest();
  const viewerId = await authed.mutation(api.auth.ensureViewer, {});
  await seedExercises(t, viewerId);

  const options = await authed.query(api.exercises.getAvailableFilterOptions, {
    bodyPart: "chest",
    primaryMuscle: "lats",
  });

  expect(options.equipment).toEqual([]);
});

test("list queries clamp invalid limits to a minimum of one", async () => {
  const { t, authed } = createAuthedTest();
  const viewerId = await authed.mutation(api.auth.ensureViewer, {});
  await seedExercises(t, viewerId);

  const preview = await authed.query(api.exercises.listPreview, {
    limit: -10,
  });
  expect(preview).toHaveLength(1);

  const custom = await authed.query(api.exercises.listCustom, {
    limit: -3,
  });
  expect(custom).toHaveLength(1);
});

test("listPreview fallback scope ignores other users custom rows", async () => {
  const { t, authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});

  await t.run(async (ctx) => {
    const otherUserId = await ctx.db.insert("users", {
      tokenIdentifier: "https://clerk.test|other_custom_owner",
      clerkUserId: "other_custom_owner",
      createdAt: 1,
      updatedAt: 1,
    });

    await ctx.db.insert(
      "exercises",
      normalizeExerciseCatalog({
        name: "Aardvark Private Exercise",
        bodyPart: "chest",
        equipment: "cable",
        primaryMuscle: "pectorals",
        muscleGroups: ["pectorals"],
        isCustom: true,
        ownerId: otherUserId,
      }),
    );

    await ctx.db.insert(
      "exercises",
      normalizeExerciseCatalog({
        name: "Bench Press",
        bodyPart: "chest",
        equipment: "barbell",
        primaryMuscle: "pectorals",
        muscleGroups: ["pectorals", "triceps", "delts"],
      }),
    );
  });

  const preview = await authed.query(api.exercises.listPreview, {
    limit: 1,
  });
  expect(preview).toHaveLength(1);
  expect(preview[0]?.isCustom).toBe(false);
});

test("createCustom enforces length bounds", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});

  await expect(
    authed.mutation(api.exercises.createCustom, {
      name: "A".repeat(201),
      bodyPart: "chest",
      equipment: "barbell",
      primaryMuscle: "pectorals",
      muscleGroups: ["pectorals"],
    }),
  ).rejects.toThrow("Exercise name must be 200 characters or fewer.");

  await expect(
    authed.mutation(api.exercises.createCustom, {
      name: "Valid Name",
      bodyPart: "chest",
      equipment: "barbell",
      primaryMuscle: "pectorals",
      muscleGroups: Array.from({ length: 31 }, () => "pectorals"),
    }),
  ).rejects.toThrow("Muscle groups must contain at most 30 items.");

  await expect(
    authed.mutation(api.exercises.createCustom, {
      name: "Valid Name",
      bodyPart: "chest",
      equipment: "barbell",
      primaryMuscle: "pectorals",
      muscleGroups: ["pectorals"],
      description: "B".repeat(2_001),
    }),
  ).rejects.toThrow("Exercise description must be 2000 characters or fewer.");
});

test("getCustomById resolves exercises outside the default list limit and hides archived ones", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});

  let targetExerciseId: Id<"exercises"> | null = null;
  for (let index = 0; index < 101; index += 1) {
    const exerciseId = await authed.mutation(api.exercises.createCustom, {
      name: `Custom Exercise ${String(index).padStart(3, "0")}`,
      bodyPart: "chest",
      equipment: "cable",
      primaryMuscle: "pectorals",
      muscleGroups: ["pectorals"],
    });
    if (index === 100) {
      targetExerciseId = exerciseId;
    }
  }

  expect(targetExerciseId).not.toBeNull();

  const firstPage = await authed.query(api.exercises.listCustom, {});
  expect(firstPage).toHaveLength(100);
  expect(firstPage.some((exercise) => exercise._id === targetExerciseId)).toBe(false);

  const resolved = await authed.query(api.exercises.getCustomById, {
    exerciseId: targetExerciseId!,
  });
  expect(resolved).toMatchObject({
    _id: targetExerciseId,
    name: "Custom Exercise 100",
  });

  await authed.mutation(api.exercises.archiveCustom, {
    exerciseId: targetExerciseId!,
  });

  expect(
    await authed.query(api.exercises.getCustomById, {
      exerciseId: targetExerciseId!,
    }),
  ).toBeNull();

  const listAfterArchive = await authed.query(api.exercises.listCustom, { limit: 200 });
  expect(listAfterArchive.some((exercise) => exercise._id === targetExerciseId)).toBe(false);
});

test("archived custom exercises disappear from catalog queries but still resolve in existing sessions", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});

  const exerciseId = await authed.mutation(api.exercises.createCustom, {
    name: "Archive Me",
    bodyPart: "back",
    equipment: "cable",
    primaryMuscle: "lats",
    muscleGroups: ["lats"],
  });
  const routineId = await authed.mutation(api.routines.create, {
    name: "Archive Routine",
    daysPerWeek: 3,
    isActive: true,
  });
  const sessionId = await authed.mutation(api.routines.upsertSession, {
    routineId,
    name: "Archive Session",
  });
  await authed.mutation(api.routines.upsertSessionExercise, {
    sessionId,
    exerciseId,
    sets: 3,
    repsText: "8-10",
  });

  await authed.mutation(api.exercises.archiveCustom, { exerciseId });

  const preview = await authed.query(api.exercises.listPreview, {
    isCustom: true,
    limit: 50,
  });
  expect(preview.some((exercise) => exercise._id === exerciseId)).toBe(false);

  const detail = await authed.query(api.routines.getDetailedById, { routineId });
  expect(detail?.sessions[0]?.exercises[0]?.exercise).toMatchObject({
    _id: exerciseId,
    name: "Archive Me",
    archivedAt: expect.any(Number),
  });
});

test("createAndAttachCustom rolls back the custom exercise when the section replacement is invalid", async () => {
  const { authed } = createAuthedTest();
  await authed.mutation(api.auth.ensureViewer, {});

  const routineId = await authed.mutation(api.routines.create, {
    name: "Atomic Custom Attach",
    daysPerWeek: 3,
    isActive: true,
  });
  const sessionA = await authed.mutation(api.routines.upsertSession, {
    routineId,
    name: "Session A",
  });
  const sessionB = await authed.mutation(api.routines.upsertSession, {
    routineId,
    name: "Session B",
  });
  const baseExerciseId = await authed.mutation(api.exercises.createCustom, {
    name: "Existing Exercise",
    bodyPart: "chest",
    equipment: "barbell",
    primaryMuscle: "pectorals",
    muscleGroups: ["pectorals"],
  });
  const sessionExerciseId = await authed.mutation(api.routines.upsertSessionExercise, {
    sessionId: sessionB,
    exerciseId: baseExerciseId,
    sets: 3,
    repsText: "8",
  });

  await expect(
    authed.mutation(api.exercises.createAndAttachCustom, {
      sessionId: sessionA,
      replaceSessionExerciseId: sessionExerciseId,
      name: "Should Roll Back",
      bodyPart: "back",
      equipment: "cable",
      primaryMuscle: "lats",
      muscleGroups: ["lats"],
      sets: 4,
      repsText: "10",
    }),
  ).rejects.toThrow("Section exercise does not belong to section.");

  const customExercises = await authed.query(api.exercises.listCustom, { limit: 50 });
  expect(customExercises.some((exercise) => exercise.name === "Should Roll Back")).toBe(false);

  const detail = await authed.query(api.routines.getDetailedById, { routineId });
  expect(detail?.sessions.map((session) => session.exerciseCount)).toEqual([0, 1]);
});
