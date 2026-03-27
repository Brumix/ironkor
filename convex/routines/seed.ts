import { normalizeDisplayNameKey } from "@ironkor/shared/strings";

import { generateDefaultWeeklyPlan } from "./helpers";
import { normalizeExerciseCatalog } from "../exerciseCatalog";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function seedDefaultsIfEmptyHandler(ctx: MutationCtx) {
  const existingRoutine = await ctx.db.query("routines").first();
  if (existingRoutine) {
    return { seeded: false };
  }

  const now = Date.now();

  const exerciseSeeds = [
    {
      name: "Bench Press",
      bodyPart: "chest" as const,
      equipment: "barbell" as const,
      primaryMuscle: "pectorals" as const,
      muscleGroups: ["pectorals", "triceps", "delts"],
    },
    {
      name: "Back Squat",
      bodyPart: "upper legs" as const,
      equipment: "barbell" as const,
      primaryMuscle: "quads" as const,
      muscleGroups: ["quads", "glutes", "abs"],
    },
    {
      name: "Pull-Up",
      bodyPart: "back" as const,
      equipment: "body weight" as const,
      primaryMuscle: "lats" as const,
      muscleGroups: ["lats", "biceps", "abs"],
    },
    {
      name: "Shoulder Press",
      bodyPart: "shoulders" as const,
      equipment: "leverage machine" as const,
      primaryMuscle: "delts" as const,
      muscleGroups: ["delts", "triceps"],
    },
    {
      name: "Romanian Deadlift",
      bodyPart: "upper legs" as const,
      equipment: "barbell" as const,
      primaryMuscle: "hamstrings" as const,
      muscleGroups: ["hamstrings", "glutes", "spine"],
    },
  ];

  const exerciseIds: Id<"exercises">[] = [];
  for (const exercise of exerciseSeeds) {
    exerciseIds.push(
      await ctx.db.insert(
        "exercises",
        normalizeExerciseCatalog({
          ...exercise,
          isCustom: false,
        }),
      ),
    );
  }

  const routineId = await ctx.db.insert("routines", {
    name: "Push / Pull / Legs",
    nameKey: normalizeDisplayNameKey("Push / Pull / Legs"),
    daysPerWeek: 4,
    isActive: true,
    sessionOrder: [],
    weeklyPlan: generateDefaultWeeklyPlan(4),
    updatedAt: now,
  });

  const sessionNames = ["Push", "Pull", "Legs"];
  const sessionIds: Id<"routineSessions">[] = [];

  for (let index = 0; index < sessionNames.length; index += 1) {
    sessionIds.push(
      await ctx.db.insert("routineSessions", {
        routineId,
        name: sessionNames[index],
        nameKey: normalizeDisplayNameKey(sessionNames[index]),
        order: index,
        updatedAt: now,
      }),
    );
  }

  await ctx.db.patch(routineId, {
    sessionOrder: sessionIds,
    updatedAt: now,
  });

  const sessionExercisePairs: [Id<"routineSessions">, {
    exerciseId: Id<"exercises">;
    sets: number;
    repsText: string;
    restSeconds: number;
  }[]][] = [
    [
      sessionIds[0],
      [
        { exerciseId: exerciseIds[0], sets: 4, repsText: "6-8", restSeconds: 120 },
        { exerciseId: exerciseIds[3], sets: 3, repsText: "8-12", restSeconds: 90 },
      ],
    ],
    [
      sessionIds[1],
      [
        { exerciseId: exerciseIds[2], sets: 4, repsText: "6-10", restSeconds: 120 },
        { exerciseId: exerciseIds[4], sets: 3, repsText: "6-10", restSeconds: 120 },
      ],
    ],
    [
      sessionIds[2],
      [
        { exerciseId: exerciseIds[1], sets: 4, repsText: "5-8", restSeconds: 150 },
        { exerciseId: exerciseIds[4], sets: 3, repsText: "6-10", restSeconds: 120 },
      ],
    ],
  ];

  for (const [sessionId, localExercises] of sessionExercisePairs) {
    for (let index = 0; index < localExercises.length; index += 1) {
      const exercise = localExercises[index];
      await ctx.db.insert("sessionExercises", {
        sessionId,
        exerciseId: exercise.exerciseId,
        order: index,
        sets: exercise.sets,
        repsText: exercise.repsText,
        restSeconds: exercise.restSeconds,
        updatedAt: now,
      });
    }
  }

  return { seeded: true };
}
