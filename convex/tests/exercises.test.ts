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
