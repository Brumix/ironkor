import { defineTable } from "convex/server";
import { v } from "convex/values";

import {
  bodyPartSet,
  equipmentSet,
  muscleSet,
} from "./unions";

export const exercises = defineTable({
  name: v.string(),
  isCustom: v.boolean(),
  ownerId: v.optional(v.id("users")),
  bodyPart: bodyPartSet,
  equipment: equipmentSet,
  primaryMuscle: muscleSet,
  muscleGroups: v.array(muscleSet),
  description: v.optional(v.string()),
  nameText: v.string(),
  musclesText: v.string(),
})
  .index("by_nameText", ["nameText"])
  .index("by_isCustom_and_nameText", ["isCustom", "nameText"])
  .index("by_bodyPart", ["bodyPart"])
  .index("by_equipment", ["equipment"])
  .index("by_bodyPart_and_equipment", ["bodyPart", "equipment"])
  .index("by_primaryMuscle", ["primaryMuscle"])
  .index("by_primaryMuscle_and_equipment", ["primaryMuscle", "equipment"])
  .index("by_ownerId_and_nameText", ["ownerId", "nameText"])
  .searchIndex("search_nameText", {
    searchField: "nameText",
    filterFields: ["bodyPart", "equipment", "primaryMuscle", "isCustom", "ownerId"],
  });
