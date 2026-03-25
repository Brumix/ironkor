import {
  BODY_PART_VALUES,
  EQUIPMENT_VALUES,
  MUSCLE_VALUES,
} from "../shared/constants";

import type {
  BodyPartType,
  EquipmentType,
  MuscleType,
} from "../shared/constants";

const BODY_PART_SET = new Set<string>(BODY_PART_VALUES);
const EQUIPMENT_SET = new Set<string>(EQUIPMENT_VALUES);
const MUSCLE_SET = new Set<string>(MUSCLE_VALUES);

const MUSCLE_ALIASES: Record<string, MuscleType> = {
  abs: "abs",
  abdominals: "abs",
  abductors: "abductors",
  adductors: "adductors",
  bicep: "biceps",
  biceps: "biceps",
  calf: "calves",
  calves: "calves",
  cardio: "cardiovascular system",
  cardiovascular: "cardiovascular system",
  "cardiovascular system": "cardiovascular system",
  chest: "pectorals",
  core: "abs",
  deltoid: "delts",
  deltoids: "delts",
  delt: "delts",
  delts: "delts",
  forearm: "forearms",
  forearms: "forearms",
  glute: "glutes",
  glutes: "glutes",
  hamstring: "hamstrings",
  hamstrings: "hamstrings",
  lat: "lats",
  lats: "lats",
  "latissimus dorsi": "lats",
  "levator scapulae": "levator scapulae",
  "lower back": "spine",
  pectoral: "pectorals",
  pectorals: "pectorals",
  quad: "quads",
  quadriceps: "quads",
  quads: "quads",
  rhomboids: "upper back",
  "serratus anterior": "serratus anterior",
  soleus: "calves",
  spine: "spine",
  trap: "traps",
  traps: "traps",
  trapezius: "traps",
  tricep: "triceps",
  triceps: "triceps",
  "upper back": "upper back",
  "upper chest": "pectorals",
};

const EQUIPMENT_ALIASES: Record<string, EquipmentType> = {
  assisted: "assisted",
  band: "band",
  barbell: "barbell",
  bodyweight: "body weight",
  bosu: "bosu ball",
  cable: "cable",
  dumbbell: "dumbbell",
  "ez bar": "ez barbell",
  "ez-bar": "ez barbell",
  machine: "leverage machine",
  pulley: "puley machine",
  "resistance bands": "resistance band",
  smith: "smith machine",
  weighted: "weighted",
};

const BODY_PART_FROM_MUSCLE: Record<MuscleType, BodyPartType> = {
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
};

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupe<T>(items: T[]) {
  return [...new Set(items)];
}

function getValidBodyPart(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeToken(value);
  return BODY_PART_SET.has(normalized) ? (normalized as BodyPartType) : undefined;
}

function getValidEquipment(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeToken(value);
  if (EQUIPMENT_SET.has(normalized)) {
    return normalized as EquipmentType;
  }

  return EQUIPMENT_ALIASES[normalized];
}

export function getValidMuscle(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeToken(value);
  if (MUSCLE_SET.has(normalized)) {
    return normalized as MuscleType;
  }

  return MUSCLE_ALIASES[normalized];
}

function inferBodyPartFromMuscles(muscles: MuscleType[]) {
  for (const muscle of muscles) {
    return BODY_PART_FROM_MUSCLE[muscle];
  }

  return undefined;
}

export function normalizeNameText(name: string) {
  return normalizeToken(name);
}

export function normalizeMusclesText(muscles: MuscleType[]) {
  return dedupe(muscles.map((muscle) => normalizeToken(muscle))).join(" ");
}

export interface LegacyExerciseLike {
  name: string;
  isCustom?: boolean;
  bodyPart?: string;
  equipment?: string;
  primaryMuscle?: string;
  muscleGroups?: readonly string[];
  description?: string;
  nameText?: string;
  musclesText?: string;
  variant?: string;
  primaryMuscles?: readonly string[];
  secondaryMuscles?: readonly string[];
}

export interface NormalizedExerciseCatalog {
  name: string;
  bodyPart: BodyPartType;
  equipment: EquipmentType;
  primaryMuscle: MuscleType;
  muscleGroups: MuscleType[];
  description?: string;
  nameText: string;
  musclesText: string;
  isCustom: boolean;
}

export function normalizeExerciseCatalog(exercise: LegacyExerciseLike): NormalizedExerciseCatalog {
  const legacyMuscleGroups = [
    exercise.primaryMuscle,
    ...(exercise.muscleGroups ?? []),
    ...(exercise.primaryMuscles ?? []),
    ...(exercise.secondaryMuscles ?? []),
  ]
    .map((muscle) => getValidMuscle(muscle))
    .filter((muscle): muscle is MuscleType => Boolean(muscle));

  const primaryMuscle =
    getValidMuscle(exercise.primaryMuscle) ??
    legacyMuscleGroups[0] ??
    "abs";

  const muscleGroups = dedupe([primaryMuscle, ...legacyMuscleGroups]);

  const bodyPart =
    getValidBodyPart(exercise.bodyPart) ??
    inferBodyPartFromMuscles(muscleGroups) ??
    "waist";

  const equipment =
    getValidEquipment(exercise.equipment) ??
    getValidEquipment(exercise.variant) ??
    "body weight";

  const name = exercise.name.trim();

  return {
    name,
    bodyPart,
    equipment,
    primaryMuscle,
    muscleGroups,
    description: exercise.description?.trim() ?? undefined,
    nameText: exercise.nameText?.trim() ?? normalizeNameText(name),
    musclesText:
      exercise.musclesText?.trim() ?? normalizeMusclesText(muscleGroups),
    isCustom: exercise.isCustom ?? false,
  };
}
