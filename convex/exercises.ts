import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { normalizeExerciseCatalog, normalizeNameText } from "./exerciseCatalog";
import {
  bodyPartSet,
  equipmentSet,
  muscleSet,
} from "./schemas/unions";

import type { Doc } from "./_generated/dataModel";
import type { ExerciseCatalogRecord } from "./types";

function toExerciseCatalogRecord(doc: Doc<"exercises">): ExerciseCatalogRecord {
  const normalized = normalizeExerciseCatalog(doc);

  return {
    _id: doc._id,
    _creationTime: doc._creationTime,
    ...normalized,
  };
}

export const list = query({
  args: {
    searchText: v.optional(v.string()),
    bodyPart: v.optional(bodyPartSet),
    equipment: v.optional(equipmentSet),
    primaryMuscle: v.optional(muscleSet),
  },
  handler: async (ctx, args) => {
    const searchText = normalizeNameText(args.searchText ?? "");
    const bodyPart = args.bodyPart;
    const equipment = args.equipment;
    const primaryMuscle = args.primaryMuscle;

    let docs;
    if (bodyPart !== undefined) {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_bodyPart", (q) => q.eq("bodyPart", bodyPart))
        .collect();
    } else if (primaryMuscle !== undefined) {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_primaryMuscle", (q) =>
          q.eq("primaryMuscle", primaryMuscle),
        )
        .collect();
    } else {
      docs = await ctx.db.query("exercises").withIndex("by_nameText").collect();
    }

    return docs
      .map(toExerciseCatalogRecord)
      .filter((exercise) => (equipment !== undefined ? exercise.equipment === equipment : true))
      .filter((exercise) =>
        searchText
          ? exercise.nameText.includes(searchText) ||
            exercise.musclesText.includes(searchText)
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createCustom = mutation({
  args: {
    name: v.string(),
    bodyPart: bodyPartSet,
    equipment: equipmentSet,
    primaryMuscle: muscleSet,
    muscleGroups: v.array(muscleSet),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalized = normalizeExerciseCatalog({
      ...args,
      isCustom: true,
    });

    return ctx.db.insert("exercises", normalized);
  },
});
