import { v } from "convex/values";

import {
  BODY_PART_VALUES,
  DIFFICULTY_VALUES,
  EQUIPMENT_VALUES,
  FREQUENCY_VALUES,
  MUSCLE_VALUES,
  SET_TYPE_VALUES
} from "@ironkor/shared/constants";

/** ----- Unions (enums) ----- */
// Helper function to create union from array of values
const createUnion = (values: readonly string[]) =>
  v.union(...values.map(value => v.literal(value)));

export const equipmentSet = createUnion(EQUIPMENT_VALUES);
export const muscleSet = createUnion(MUSCLE_VALUES);
export const bodyPartSet = createUnion(BODY_PART_VALUES);
export const typeSet = createUnion(SET_TYPE_VALUES);
export const difficultySet = createUnion(DIFFICULTY_VALUES);
export const frequencySet = createUnion(FREQUENCY_VALUES);