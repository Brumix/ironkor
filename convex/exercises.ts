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

    const overFetchLimit = args.equipment !== undefined ? limit * 3 : limit;

    let docs;
    if (args.bodyPart !== undefined) {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_bodyPart", (q) => q.eq("bodyPart", args.bodyPart!))
        .take(overFetchLimit);
    } else if (args.primaryMuscle !== undefined) {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_primaryMuscle", (q) => q.eq("primaryMuscle", args.primaryMuscle!))
        .take(overFetchLimit);
    } else {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_nameText")
        .take(overFetchLimit);
    }

    let results = docs.map(toExerciseCatalogRecord);
    if (args.equipment !== undefined) {
      results = results.filter((e) => e.equipment === args.equipment);
    }

    return results.slice(0, limit).sort((a, b) => a.name.localeCompare(b.name));
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
