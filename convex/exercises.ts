import { ConvexError, v } from "convex/values";
import {
  BODY_PART_VALUES,
  EQUIPMENT_VALUES,
  MUSCLE_VALUES,
  MUSCLES_BY_BODY_PART,
  getBodyPartsForMuscle,
} from "@ironkor/shared/constants";
import type {
  BodyPartType,
  EquipmentType,
  MuscleType,
} from "@ironkor/shared/constants";

import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
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

import type { Doc, Id } from "./_generated/dataModel";
import type { ExerciseCatalogRecord, ExerciseFilterOptionsRecord } from "./types";

const PREVIEW_LIMIT_DEFAULT = 50;
const CUSTOM_LIMIT_DEFAULT = 100;
const EXERCISE_LIMIT_MAX = 200;
const MAX_CUSTOM_EXERCISE_NAME_LENGTH = 200;
const MAX_CUSTOM_EXERCISE_DESCRIPTION_LENGTH = 2_000;
const MAX_CUSTOM_EXERCISE_MUSCLE_GROUPS = 30;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ConvexError(message);
  }
}

function clampPositiveIntLimit(
  value: number | undefined,
  defaultValue: number,
  maxValue: number,
) {
  return Math.min(Math.max(1, Math.floor(value ?? defaultValue)), maxValue);
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

function canViewerSeeExercise(doc: Doc<"exercises">, viewerId: Id<"users">) {
  return !doc.isCustom || doc.ownerId === viewerId;
}

function orderCanonicalValues<T extends string>(values: Iterable<T>, canonical: readonly T[]) {
  const set = values instanceof Set ? values : new Set(values);
  return canonical.filter((value) => set.has(value));
}

async function collectVisibleBodyParts(
  rows: AsyncIterable<Doc<"exercises">>,
  viewerId: Id<"users">,
) {
  const bodyParts = new Set<BodyPartType>();
  for await (const doc of rows) {
    if (!canViewerSeeExercise(doc, viewerId)) {
      continue;
    }
    bodyParts.add(doc.bodyPart as BodyPartType);
  }
  return bodyParts;
}

async function collectVisiblePrimaryMuscles(
  rows: AsyncIterable<Doc<"exercises">>,
  viewerId: Id<"users">,
) {
  const muscles = new Set<MuscleType>();
  for await (const doc of rows) {
    if (!canViewerSeeExercise(doc, viewerId)) {
      continue;
    }
    muscles.add(doc.primaryMuscle as MuscleType);
  }
  return muscles;
}

async function collectVisibleEquipment(
  rows: AsyncIterable<Doc<"exercises">>,
  viewerId: Id<"users">,
) {
  const equipment = new Set<EquipmentType>();
  for await (const doc of rows) {
    if (!canViewerSeeExercise(doc, viewerId)) {
      continue;
    }
    equipment.add(doc.equipment as EquipmentType);
  }
  return equipment;
}

async function getAvailableBodyParts(
  ctx: QueryCtx,
  viewerId: Id<"users">,
  args: {
    primaryMuscle?: MuscleType;
    equipment?: EquipmentType;
  },
) {
  if (args.primaryMuscle !== undefined && args.equipment !== undefined) {
    return orderCanonicalValues(
      await collectVisibleBodyParts(
        ctx.db
          .query("exercises")
          .withIndex("by_primaryMuscle_and_equipment", (q) =>
            q.eq("primaryMuscle", args.primaryMuscle!).eq("equipment", args.equipment!),
          ),
        viewerId,
      ),
      BODY_PART_VALUES,
    );
  }

  if (args.primaryMuscle !== undefined) {
    return getBodyPartsForMuscle(args.primaryMuscle);
  }

  if (args.equipment !== undefined) {
    return orderCanonicalValues(
      await collectVisibleBodyParts(
        ctx.db.query("exercises").withIndex("by_equipment", (q) => q.eq("equipment", args.equipment!)),
        viewerId,
      ),
      BODY_PART_VALUES,
    );
  }

  return [...BODY_PART_VALUES];
}

async function getAvailableMuscles(
  ctx: QueryCtx,
  viewerId: Id<"users">,
  args: {
    bodyPart?: BodyPartType;
    equipment?: EquipmentType;
  },
) {
  if (args.bodyPart !== undefined && args.equipment !== undefined) {
    return orderCanonicalValues(
      await collectVisiblePrimaryMuscles(
        ctx.db
          .query("exercises")
          .withIndex("by_bodyPart_and_equipment", (q) =>
            q.eq("bodyPart", args.bodyPart!).eq("equipment", args.equipment!),
          ),
        viewerId,
      ),
      MUSCLES_BY_BODY_PART[args.bodyPart],
    );
  }

  if (args.bodyPart !== undefined) {
    return [...MUSCLES_BY_BODY_PART[args.bodyPart]];
  }

  if (args.equipment !== undefined) {
    return orderCanonicalValues(
      await collectVisiblePrimaryMuscles(
        ctx.db.query("exercises").withIndex("by_equipment", (q) => q.eq("equipment", args.equipment!)),
        viewerId,
      ),
      MUSCLE_VALUES,
    );
  }

  return [...MUSCLE_VALUES];
}

async function getAvailableEquipment(
  ctx: QueryCtx,
  viewerId: Id<"users">,
  args: {
    bodyPart?: BodyPartType;
    primaryMuscle?: MuscleType;
  },
) {
  if (args.bodyPart !== undefined && args.primaryMuscle !== undefined) {
    return orderCanonicalValues(
      await collectVisibleEquipment(
        ctx.db
          .query("exercises")
          .withIndex("by_bodyPart_and_primaryMuscle", (q) =>
            q.eq("bodyPart", args.bodyPart!).eq("primaryMuscle", args.primaryMuscle!),
          ),
        viewerId,
      ),
      EQUIPMENT_VALUES,
    );
  }

  if (args.bodyPart !== undefined) {
    return orderCanonicalValues(
      await collectVisibleEquipment(
        ctx.db.query("exercises").withIndex("by_bodyPart", (q) => q.eq("bodyPart", args.bodyPart!)),
        viewerId,
      ),
      EQUIPMENT_VALUES,
    );
  }

  if (args.primaryMuscle !== undefined) {
    return orderCanonicalValues(
      await collectVisibleEquipment(
        ctx.db
          .query("exercises")
          .withIndex("by_primaryMuscle", (q) => q.eq("primaryMuscle", args.primaryMuscle!)),
        viewerId,
      ),
      EQUIPMENT_VALUES,
    );
  }

  return [...EQUIPMENT_VALUES];
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
    const limit = clampPositiveIntLimit(
      args.limit,
      PREVIEW_LIMIT_DEFAULT,
      EXERCISE_LIMIT_MAX,
    );
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
        .withIndex("by_isCustom_and_nameText", (q) => q.eq("isCustom", false))
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
    const limit = clampPositiveIntLimit(
      args.limit,
      CUSTOM_LIMIT_DEFAULT,
      EXERCISE_LIMIT_MAX,
    );
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

export const getAvailableFilterOptions = query({
  args: {
    bodyPart: v.optional(bodyPartSet),
    equipment: v.optional(equipmentSet),
    primaryMuscle: v.optional(muscleSet),
  },
  handler: async (ctx, args): Promise<ExerciseFilterOptionsRecord> => {
    const { viewer } = await requireViewer(ctx);

    const [bodyParts, muscles, equipment] = await Promise.all([
      getAvailableBodyParts(ctx, viewer._id, {
        primaryMuscle: args.primaryMuscle as MuscleType | undefined,
        equipment: args.equipment as EquipmentType | undefined,
      }),
      getAvailableMuscles(ctx, viewer._id, {
        bodyPart: args.bodyPart as BodyPartType | undefined,
        equipment: args.equipment as EquipmentType | undefined,
      }),
      getAvailableEquipment(ctx, viewer._id, {
        bodyPart: args.bodyPart as BodyPartType | undefined,
        primaryMuscle: args.primaryMuscle as MuscleType | undefined,
      }),
    ]);

    return {
      bodyParts,
      muscles,
      equipment,
    };
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
    assert(
      args.muscleGroups.length <= MAX_CUSTOM_EXERCISE_MUSCLE_GROUPS,
      `Muscle groups must contain at most ${MAX_CUSTOM_EXERCISE_MUSCLE_GROUPS} items.`,
    );
    const uniqueMuscleGroups = Array.from(new Set(args.muscleGroups));
    assert(name.length > 0, "Exercise name is required.");
    assert(
      name.length <= MAX_CUSTOM_EXERCISE_NAME_LENGTH,
      `Exercise name must be ${MAX_CUSTOM_EXERCISE_NAME_LENGTH} characters or fewer.`,
    );
    if (description !== undefined && description.length > 0) {
      assert(
        description.length <= MAX_CUSTOM_EXERCISE_DESCRIPTION_LENGTH,
        `Exercise description must be ${MAX_CUSTOM_EXERCISE_DESCRIPTION_LENGTH} characters or fewer.`,
      );
    }
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
    assert(
      args.muscleGroups.length <= MAX_CUSTOM_EXERCISE_MUSCLE_GROUPS,
      `Muscle groups must contain at most ${MAX_CUSTOM_EXERCISE_MUSCLE_GROUPS} items.`,
    );
    const uniqueMuscleGroups = Array.from(new Set(args.muscleGroups));
    assert(name.length > 0, "Exercise name is required.");
    assert(
      name.length <= MAX_CUSTOM_EXERCISE_NAME_LENGTH,
      `Exercise name must be ${MAX_CUSTOM_EXERCISE_NAME_LENGTH} characters or fewer.`,
    );
    if (description !== undefined && description.length > 0) {
      assert(
        description.length <= MAX_CUSTOM_EXERCISE_DESCRIPTION_LENGTH,
        `Exercise description must be ${MAX_CUSTOM_EXERCISE_DESCRIPTION_LENGTH} characters or fewer.`,
      );
    }
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
