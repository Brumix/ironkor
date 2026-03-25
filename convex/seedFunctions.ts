import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { normalizeExerciseCatalog } from "./exerciseCatalog";
import {
  bodyPartSet,
  equipmentSet,
  muscleSet,
} from "./schemas/unions";

export const seedExercises = mutation({
  args: {
    name: v.string(),
    bodyPart: bodyPartSet,
    equipment: equipmentSet,
    primaryMuscle: muscleSet,
    muscleGroups: v.array(muscleSet),
    description: v.optional(v.string()),
    nameText: v.string(),
    musclesText: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert(
      "exercises",
      normalizeExerciseCatalog({
        ...args,
        isCustom: false,
      }),
    );
  },
});
