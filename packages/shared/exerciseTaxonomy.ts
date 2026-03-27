import {
  BODY_PART_VALUES,
  MUSCLE_VALUES,
  type BodyPartType,
  type MuscleType,
} from "./enums";

export const BODY_PART_FROM_MUSCLE = {
  abs: "waist",
  abductors: "upper legs",
  adductors: "upper legs",
  biceps: "upper arms",
  calves: "lower legs",
  "cardiovascular system": "cardio",
  delts: "shoulders",
  forearms: "lower arms",
  glutes: "upper legs",
  hamstrings: "upper legs",
  lats: "back",
  "levator scapulae": "back",
  pectorals: "chest",
  quads: "upper legs",
  "serratus anterior": "chest",
  spine: "back",
  traps: "back",
  triceps: "upper arms",
  "upper back": "back",
} as const satisfies Record<MuscleType, BodyPartType>;

export const BODY_PARTS_BY_MUSCLE = MUSCLE_VALUES.reduce(
  (record, muscle) => ({
    ...record,
    [muscle]: [BODY_PART_FROM_MUSCLE[muscle]],
  }),
  {} as Record<MuscleType, BodyPartType[]>,
);

export const MUSCLES_BY_BODY_PART = BODY_PART_VALUES.reduce(
  (record, bodyPart) => ({
    ...record,
    [bodyPart]: MUSCLE_VALUES.filter((muscle) => BODY_PART_FROM_MUSCLE[muscle] === bodyPart),
  }),
  {} as Record<BodyPartType, MuscleType[]>,
);

export function getBodyPartsForMuscle(muscle: MuscleType) {
  return BODY_PARTS_BY_MUSCLE[muscle];
}

export function getUniqueBodyPartForMuscle(muscle: MuscleType) {
  const bodyParts = getBodyPartsForMuscle(muscle);
  return bodyParts.length === 1 ? bodyParts[0] : undefined;
}
