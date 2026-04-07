import type {
  UserExperienceLevel,
  UserPrimaryGoal,
  UserTrainingEnvironment,
  UserUnitSystem,
} from "@ironkor/shared/enums";

import {
  EXPERIENCE_LABELS,
  GOAL_LABELS,
  TRAINING_ENVIRONMENT_LABELS,
  UNIT_SYSTEM_LABELS,
} from "@/features/onboarding/catalog";

const KG_TO_LB = 2.2046226218;
const CM_TO_IN = 0.3937007874;

export const BODY_WEIGHT_RANGE_KG = {
  min: 30,
  max: 300,
} as const;

export const BODY_HEIGHT_RANGE_CM = {
  min: 120,
  max: 240,
} as const;

const DEFAULT_HEIGHT_FEET = 5;
const DEFAULT_HEIGHT_INCHES = 8;

export interface SelectorOption<TValue extends string | number = string | number> {
  label: string;
  value: TValue;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function formatNumericLabel(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function roundForDisplay(value: number) {
  return formatNumericLabel(value);
}

export function convertWeightFromKg(weightKg: number, unitSystem: UserUnitSystem) {
  return unitSystem === "imperial" ? weightKg * KG_TO_LB : weightKg;
}

export function convertWeightToKg(weight: number, unitSystem: UserUnitSystem) {
  return unitSystem === "imperial" ? weight / KG_TO_LB : weight;
}

export function convertHeightFromCm(heightCm: number, unitSystem: UserUnitSystem) {
  return unitSystem === "imperial" ? heightCm * CM_TO_IN : heightCm;
}

export function convertHeightToCm(height: number, unitSystem: UserUnitSystem) {
  return unitSystem === "imperial" ? height / CM_TO_IN : height;
}

export function convertFeetAndInchesToCm(feet: number, inches: number) {
  return convertHeightToCm(feet * 12 + inches, "imperial");
}

export function toDisplayedWeightValue(
  weightKg: number | null,
  unitSystem: UserUnitSystem,
) {
  if (weightKg === null) {
    return null;
  }

  const clampedKg = clampNumber(weightKg, BODY_WEIGHT_RANGE_KG.min, BODY_WEIGHT_RANGE_KG.max);
  if (unitSystem === "imperial") {
    return Math.round(convertWeightFromKg(clampedKg, unitSystem));
  }

  return roundToStep(clampedKg, 0.5);
}

export function toDisplayedMetricHeightValue(heightCm: number | null) {
  if (heightCm === null) {
    return null;
  }

  return Math.round(
    clampNumber(heightCm, BODY_HEIGHT_RANGE_CM.min, BODY_HEIGHT_RANGE_CM.max),
  );
}

export function toDisplayedImperialHeightParts(heightCm: number | null) {
  if (heightCm === null) {
    return {
      feet: DEFAULT_HEIGHT_FEET,
      inches: DEFAULT_HEIGHT_INCHES,
    };
  }

  const totalInches = Math.round(
    convertHeightFromCm(
      clampNumber(heightCm, BODY_HEIGHT_RANGE_CM.min, BODY_HEIGHT_RANGE_CM.max),
      "imperial",
    ),
  );

  return {
    feet: Math.floor(totalInches / 12),
    inches: totalInches % 12,
  };
}

export function normalizeWeightKgForUnitSystem(
  weightKg: number | null,
  unitSystem: UserUnitSystem,
) {
  const displayedValue = toDisplayedWeightValue(weightKg, unitSystem);
  if (displayedValue === null) {
    return null;
  }

  const nextWeightKg = convertWeightToKg(displayedValue, unitSystem);
  return clampNumber(nextWeightKg, BODY_WEIGHT_RANGE_KG.min, BODY_WEIGHT_RANGE_KG.max);
}

export function normalizeHeightCmForUnitSystem(
  heightCm: number | null,
  unitSystem: UserUnitSystem,
) {
  if (heightCm === null) {
    return null;
  }

  if (unitSystem === "metric") {
    return Math.round(
      clampNumber(heightCm, BODY_HEIGHT_RANGE_CM.min, BODY_HEIGHT_RANGE_CM.max),
    );
  }

  const { feet, inches } = toDisplayedImperialHeightParts(heightCm);
  return clampNumber(
    convertFeetAndInchesToCm(feet, inches),
    BODY_HEIGHT_RANGE_CM.min,
    BODY_HEIGHT_RANGE_CM.max,
  );
}

export function toProfileWeightInput(
  weightKg: number | null,
  unitSystem: UserUnitSystem,
) {
  return toDisplayedWeightValue(weightKg, unitSystem);
}

export function toProfileHeightInput(
  heightCm: number | null,
  unitSystem: UserUnitSystem,
) {
  if (heightCm === null) {
    return null;
  }

  if (unitSystem === "metric") {
    return toDisplayedMetricHeightValue(heightCm);
  }

  const { feet, inches } = toDisplayedImperialHeightParts(heightCm);
  return feet * 12 + inches;
}

export function buildWeightSelectorOptions(
  unitSystem: UserUnitSystem,
): SelectorOption<number>[] {
  if (unitSystem === "imperial") {
    const minLb = Math.round(convertWeightFromKg(BODY_WEIGHT_RANGE_KG.min, unitSystem));
    const maxLb = Math.round(convertWeightFromKg(BODY_WEIGHT_RANGE_KG.max, unitSystem));

    return Array.from({ length: maxLb - minLb + 1 }, (_, index) => {
      const value = minLb + index;
      return {
        label: `${value} lb`,
        value,
      };
    });
  }

  const optionCount = Math.round((BODY_WEIGHT_RANGE_KG.max - BODY_WEIGHT_RANGE_KG.min) / 0.5) + 1;
  return Array.from({ length: optionCount }, (_, index) => {
    const value = BODY_WEIGHT_RANGE_KG.min + index * 0.5;
    return {
      label: `${formatNumericLabel(value)} kg`,
      value,
    };
  });
}

export function buildMetricHeightSelectorOptions(): SelectorOption<number>[] {
  return Array.from(
    { length: BODY_HEIGHT_RANGE_CM.max - BODY_HEIGHT_RANGE_CM.min + 1 },
    (_, index) => {
      const value = BODY_HEIGHT_RANGE_CM.min + index;
      return {
        label: `${value} cm`,
        value,
      };
    },
  );
}

export function buildFeetSelectorOptions(): SelectorOption<number>[] {
  const minFeet = Math.floor(BODY_HEIGHT_RANGE_CM.min * CM_TO_IN / 12);
  const maxFeet = Math.ceil(BODY_HEIGHT_RANGE_CM.max * CM_TO_IN / 12);

  return Array.from({ length: maxFeet - minFeet + 1 }, (_, index) => {
    const value = minFeet + index;
    return {
      label: `${value} ft`,
      value,
    };
  }).filter((option) =>
    buildInchesSelectorOptions(option.value).length > 0,
  );
}

export function buildInchesSelectorOptions(feet: number): SelectorOption<number>[] {
  return Array.from({ length: 12 }, (_, index) => index)
    .filter((inches) => {
      const heightCm = convertFeetAndInchesToCm(feet, inches);
      return (
        heightCm >= BODY_HEIGHT_RANGE_CM.min &&
        heightCm <= BODY_HEIGHT_RANGE_CM.max
      );
    })
    .map((value) => ({
      label: `${value} in`,
      value,
    }));
}

export function formatWeightValue(weightKg: number | null, unitSystem: UserUnitSystem) {
  if (weightKg === null) {
    return "Add current weight";
  }

  const value = toDisplayedWeightValue(weightKg, unitSystem);
  if (value === null) {
    return "Add current weight";
  }

  const suffix = unitSystem === "imperial" ? "lb" : "kg";
  return `${formatNumericLabel(value)} ${suffix}`;
}

export function formatHeightValue(heightCm: number | null, unitSystem: UserUnitSystem) {
  if (heightCm === null) {
    return "Add height";
  }

  if (unitSystem === "imperial") {
    const { feet, inches } = toDisplayedImperialHeightParts(heightCm);
    return `${feet} ft ${inches} in`;
  }

  const value = toDisplayedMetricHeightValue(heightCm);
  return value === null ? "Add height" : `${value} cm`;
}

export function getGoalLabel(goal: UserPrimaryGoal | null) {
  return goal ? GOAL_LABELS[goal] : "Set your goal";
}

export function getExperienceLabel(level: UserExperienceLevel | null) {
  return level ? EXPERIENCE_LABELS[level] : "Set your level";
}

export function getTrainingEnvironmentLabel(value: UserTrainingEnvironment | null) {
  return value ? TRAINING_ENVIRONMENT_LABELS[value] : "Choose your setup";
}

export function getUnitSystemLabel(value: UserUnitSystem) {
  return UNIT_SYSTEM_LABELS[value];
}
