import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { normalizeExerciseCatalog, normalizeNameText } from "./exerciseCatalog";
import {
  bodyPartSet,
  equipmentSet,
  muscleSet,
} from "./schemas/unions";

import type { Doc } from "./_generated/dataModel";
import type { ExerciseCatalogRecord } from "./types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ConvexError(message);
  }
}

function toExerciseCatalogRecord(doc: Doc<"exercises">): ExerciseCatalogRecord {
  const normalized = normalizeExerciseCatalog(doc);

  return {
    _id: doc._id,
    _creationTime: doc._creationTime,
    ...normalized,
  };
}

export const hasAny = query({
  args: {},
  handler: async (ctx) => {
    const first = await ctx.db.query("exercises").first();
    return first !== null;
  },
});

export const listPreview = query({
  args: {
    searchText: v.optional(v.string()),
    bodyPart: v.optional(bodyPartSet),
    equipment: v.optional(equipmentSet),
    primaryMuscle: v.optional(muscleSet),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 200);
    const searchText = normalizeNameText(args.searchText ?? "");

    if (searchText) {
      const results = await ctx.db
        .query("exercises")
        .withSearchIndex("search_nameText", (q) => {
          let builder = q.search("nameText", searchText);
          if (args.bodyPart !== undefined) builder = builder.eq("bodyPart", args.bodyPart);
          if (args.equipment !== undefined) builder = builder.eq("equipment", args.equipment);
          if (args.primaryMuscle !== undefined)
            builder = builder.eq("primaryMuscle", args.primaryMuscle);
          return builder;
        })
        .take(limit);

      return results.map(toExerciseCatalogRecord);
    }

    let docs;
    if (args.bodyPart !== undefined && args.equipment !== undefined) {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_bodyPart_and_equipment", (q) =>
          q.eq("bodyPart", args.bodyPart!).eq("equipment", args.equipment!),
        )
        .take(limit);
    } else if (args.primaryMuscle !== undefined && args.equipment !== undefined) {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_primaryMuscle_and_equipment", (q) =>
          q.eq("primaryMuscle", args.primaryMuscle!).eq("equipment", args.equipment!),
        )
        .take(limit);
    } else if (args.bodyPart !== undefined) {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_bodyPart", (q) => q.eq("bodyPart", args.bodyPart!))
        .take(limit);
    } else if (args.primaryMuscle !== undefined) {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_primaryMuscle", (q) => q.eq("primaryMuscle", args.primaryMuscle!))
        .take(limit);
    } else if (args.equipment !== undefined) {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_equipment", (q) => q.eq("equipment", args.equipment!))
        .take(limit);
    } else {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_nameText")
        .take(limit);
    }

    let results = docs.map(toExerciseCatalogRecord);
    if (args.bodyPart !== undefined) {
      results = results.filter((exercise) => exercise.bodyPart === args.bodyPart);
    }
    if (args.equipment !== undefined) {
      results = results.filter((exercise) => exercise.equipment === args.equipment);
    }
    if (args.primaryMuscle !== undefined) {
      results = results.filter(
        (exercise) => exercise.primaryMuscle === args.primaryMuscle,
      );
    }

    return results
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
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
    const name = args.name.trim();
    const description = args.description?.trim();
    const uniqueMuscleGroups = Array.from(new Set(args.muscleGroups));
    assert(name.length > 0, "Exercise name is required.");
    assert(uniqueMuscleGroups.length > 0, "At least one muscle group is required.");
    assert(
      uniqueMuscleGroups.includes(args.primaryMuscle),
      "Primary muscle must be included in muscle groups.",
    );

    const normalized = normalizeExerciseCatalog({
      ...args,
      name,
      muscleGroups: uniqueMuscleGroups,
      description: description && description.length > 0 ? description : undefined,
      isCustom: true,
    });

    return ctx.db.insert("exercises", normalized);
  },
});
