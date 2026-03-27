import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  requireCustomExerciseOwner,
  requireViewer,
} from "./authHelpers";
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

function filterExerciseRecord(
  exercise: ExerciseCatalogRecord,
  args: {
    bodyPart?: string;
    equipment?: string;
    primaryMuscle?: string;
    isCustom?: boolean;
  },
) {
  if (args.bodyPart !== undefined && exercise.bodyPart !== args.bodyPart) {
    return false;
  }
  if (args.equipment !== undefined && exercise.equipment !== args.equipment) {
    return false;
  }
  if (
    args.primaryMuscle !== undefined &&
    exercise.primaryMuscle !== args.primaryMuscle
  ) {
    return false;
  }
  if (args.isCustom !== undefined && exercise.isCustom !== args.isCustom) {
    return false;
  }

  return true;
}

function sortAndLimitExercises(
  records: ExerciseCatalogRecord[],
  limit: number,
) {
  return records
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

export const hasAny = query({
  args: {},
  handler: async (ctx) => {
    await requireViewer(ctx);
    const first = await ctx.db
      .query("exercises")
      .withIndex("by_isCustom_and_nameText", (q) => q.eq("isCustom", false))
      .first();
    return first !== null;
  },
});

export const listPreview = query({
  args: {
    searchText: v.optional(v.string()),
    bodyPart: v.optional(bodyPartSet),
    equipment: v.optional(equipmentSet),
    primaryMuscle: v.optional(muscleSet),
    isCustom: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx);
    const limit = Math.min(args.limit ?? 50, 200);
    const searchText = normalizeNameText(args.searchText ?? "");

    if (searchText) {
      const builtInResults = await ctx.db
        .query("exercises")
        .withSearchIndex("search_nameText", (q) => {
          let builder = q.search("nameText", searchText).eq("isCustom", false);
          if (args.bodyPart !== undefined) builder = builder.eq("bodyPart", args.bodyPart);
          if (args.equipment !== undefined) builder = builder.eq("equipment", args.equipment);
          if (args.primaryMuscle !== undefined)
            builder = builder.eq("primaryMuscle", args.primaryMuscle);
          return builder;
        })
        .take(limit);

      const customResults = await ctx.db
        .query("exercises")
        .withSearchIndex("search_nameText", (q) => {
          let builder = q
            .search("nameText", searchText)
            .eq("isCustom", true)
            .eq("ownerId", viewer._id);
          if (args.bodyPart !== undefined) builder = builder.eq("bodyPart", args.bodyPart);
          if (args.equipment !== undefined) builder = builder.eq("equipment", args.equipment);
          if (args.primaryMuscle !== undefined)
            builder = builder.eq("primaryMuscle", args.primaryMuscle);
          return builder;
        })
        .take(limit);

      return sortAndLimitExercises(
        [...builtInResults, ...customResults]
          .map(toExerciseCatalogRecord)
          .filter((exercise) => filterExerciseRecord(exercise, args)),
        limit,
      );
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
    } else if (args.isCustom !== undefined) {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_isCustom_and_nameText", (q) => q.eq("isCustom", args.isCustom!))
        .take(limit);
    } else {
      docs = await ctx.db
        .query("exercises")
        .withIndex("by_nameText")
        .take(limit);
    }

    const builtInResults = docs
      .map(toExerciseCatalogRecord)
      .filter((exercise) => !exercise.isCustom)
      .filter((exercise) => filterExerciseRecord(exercise, args));

    const customResults = (await ctx.db
      .query("exercises")
      .withIndex("by_ownerId_and_nameText", (q) => q.eq("ownerId", viewer._id))
      .take(limit))
      .map(toExerciseCatalogRecord)
      .filter((exercise) => filterExerciseRecord(exercise, args));

    return sortAndLimitExercises(
      [...builtInResults, ...customResults],
      limit,
    );
  },
});

export const listCustom = query({
  args: {
    searchText: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx);
    const limit = Math.min(args.limit ?? 100, 200);
    const searchText = normalizeNameText(args.searchText ?? "");

    if (searchText) {
      const results = await ctx.db
        .query("exercises")
        .withSearchIndex("search_nameText", (q) =>
          q
            .search("nameText", searchText)
            .eq("isCustom", true)
            .eq("ownerId", viewer._id),
        )
        .take(limit);
      return results.map(toExerciseCatalogRecord);
    }

    const docs = await ctx.db
      .query("exercises")
      .withIndex("by_ownerId_and_nameText", (q) => q.eq("ownerId", viewer._id))
      .take(limit);

    return docs.map(toExerciseCatalogRecord).sort((a, b) => a.name.localeCompare(b.name));
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
    const { viewer } = await requireViewer(ctx);
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
      ownerId: viewer._id,
    });

    return ctx.db.insert("exercises", normalized);
  },
});

export const updateCustom = mutation({
  args: {
    exerciseId: v.id("exercises"),
    name: v.string(),
    bodyPart: bodyPartSet,
    equipment: equipmentSet,
    primaryMuscle: muscleSet,
    muscleGroups: v.array(muscleSet),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { exercise: existing } = await requireCustomExerciseOwner(ctx, args.exerciseId);

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
      ownerId: existing.ownerId,
    });

    await ctx.db.patch(args.exerciseId, normalized);
  },
});

export const deleteCustom = mutation({
  args: {
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    await requireCustomExerciseOwner(ctx, args.exerciseId);
    await ctx.db.delete(args.exerciseId);
  },
});
