import { describe, expect, test } from "vitest";

import {
  createProgrammingDraftFromExercise,
  normalizeProgrammingDraftForSave,
} from "@/features/workout/mappers";
import type { DraftSessionExercise } from "@/features/workout/types";

import type { Id } from "@convex/_generated/dataModel";

const exerciseCatalogId = "exercises_123" as Id<"exercises">;
const sessionExerciseId = "sessionExercises_123" as Id<"sessionExercises">;

function createDraftSessionExercise(
  overrides: Partial<DraftSessionExercise> = {},
): DraftSessionExercise {
  return {
    key: "draft-exercise-1",
    sessionExerciseId,
    exerciseId: exerciseCatalogId,
    order: 0,
    sets: 4,
    repsText: "6-8",
    targetWeightKg: 82.5,
    restSeconds: 120,
    notes: "Pause on the chest",
    tempo: "31X0",
    rir: 2,
    exercise: {
      _id: exerciseCatalogId,
      _creationTime: 1,
      name: "Bench Press",
      isCustom: false,
      archivedAt: undefined,
      bodyPart: "chest",
      equipment: "barbell",
      primaryMuscle: "pectorals",
      muscleGroups: ["pectorals", "triceps"],
      description: undefined,
      nameText: "bench press",
      musclesText: "pectorals triceps",
    },
    ...overrides,
  };
}

describe("workout mappers", () => {
  test("createProgrammingDraftFromExercise initializes from the current exercise programming", () => {
    const entry = createDraftSessionExercise();

    const draft = createProgrammingDraftFromExercise(entry);

    expect(draft).toMatchObject({
      sets: "4",
      repsText: "6-8",
      targetWeightKg: "82.5",
      restSeconds: "120",
      notes: "Pause on the chest",
      tempo: "31X0",
      rir: "2",
    });
  });

  test("normalizeProgrammingDraftForSave preserves edited values and trims optional text", () => {
    const normalized = normalizeProgrammingDraftForSave({
      sets: "5.9",
      repsText: " 10-12 ",
      targetWeightKg: "75",
      restSeconds: "90",
      notes: "  Slow eccentric  ",
      tempo: " 4010 ",
      rir: "1",
    });

    expect(normalized).toEqual({
      sets: 5,
      repsText: "10-12",
      targetWeightKg: 75,
      restSeconds: 90,
      notes: "Slow eccentric",
      tempo: "4010",
      rir: 1,
    });
  });
});
