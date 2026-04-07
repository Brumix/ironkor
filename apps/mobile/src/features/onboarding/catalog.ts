import type {
  UserExperienceLevel,
  UserPrimaryGoal,
  UserTrainingEnvironment,
  UserUnitSystem,
} from "@ironkor/shared/enums";

import type Ionicons from "@expo/vector-icons/Ionicons";

export interface ChoiceOption<TValue extends string | number> {
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  value: TValue;
}

export const GOAL_OPTIONS: ChoiceOption<UserPrimaryGoal>[] = [
  {
    value: "strength",
    label: "Build strength",
    description: "Bias training toward heavier lifts, lower rep work, and clean progression.",
    iconName: "barbell-outline",
  },
  {
    value: "muscle_gain",
    label: "Gain muscle",
    description: "Push hypertrophy-friendly volume and exercise variety for more size.",
    iconName: "body-outline",
  },
  {
    value: "fat_loss",
    label: "Lose fat",
    description: "Keep training efficient and consistent while preserving strength and muscle.",
    iconName: "flame-outline",
  },
  {
    value: "recomp",
    label: "Recomp",
    description: "Balance body composition change with steady performance improvements.",
    iconName: "swap-horizontal-outline",
  },
  {
    value: "general_fitness",
    label: "General fitness",
    description: "Train for consistency, energy, and all-around athletic confidence.",
    iconName: "sparkles-outline",
  },
];

export const EXPERIENCE_OPTIONS: ChoiceOption<UserExperienceLevel>[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "You want clear structure, confidence, and conservative starting points.",
    iconName: "leaf-outline",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "You already know the basics and want a steady push without the fluff.",
    iconName: "flash-outline",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "You train seriously and expect sharper defaults and a faster pace.",
    iconName: "trophy-outline",
  },
];

export const TRAINING_ENVIRONMENT_OPTIONS: ChoiceOption<UserTrainingEnvironment>[] = [
  {
    value: "gym",
    label: "Gym access",
    description: "Plan around full equipment and a wider exercise pool.",
    iconName: "business-outline",
  },
  {
    value: "home",
    label: "Home setup",
    description: "Keep the plan realistic for a smaller setup and less transition friction.",
    iconName: "home-outline",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    description: "Mix gym days and home sessions without changing your identity each week.",
    iconName: "shuffle-outline",
  },
];

export const UNIT_SYSTEM_OPTIONS: ChoiceOption<UserUnitSystem>[] = [
  {
    value: "metric",
    label: "Metric",
    description: "Use kilograms and centimeters across the app.",
    iconName: "speedometer-outline",
  },
  {
    value: "imperial",
    label: "Imperial",
    description: "Use pounds and inches in your profile and body data.",
    iconName: "resize-outline",
  },
];

export const WORKOUTS_PER_WEEK_OPTIONS: ChoiceOption<number>[] = [
  {
    value: 2,
    label: "2 days",
    description: "Low-friction consistency with plenty of recovery room.",
    iconName: "calendar-outline",
  },
  {
    value: 3,
    label: "3 days",
    description: "A balanced cadence that works well for most lifters.",
    iconName: "calendar-outline",
  },
  {
    value: 4,
    label: "4 days",
    description: "Enough room for focused sessions without crowding the week.",
    iconName: "calendar-outline",
  },
  {
    value: 5,
    label: "5 days",
    description: "Higher frequency for athletes who like more gym touchpoints.",
    iconName: "calendar-outline",
  },
  {
    value: 6,
    label: "6 days",
    description: "Aggressive frequency for advanced routines and tight split work.",
    iconName: "calendar-outline",
  },
];

export const SESSION_DURATION_OPTIONS: ChoiceOption<number>[] = [
  {
    value: 30,
    label: "30 min",
    description: "Fast and focused sessions for busy weeks.",
    iconName: "time-outline",
  },
  {
    value: 45,
    label: "45 min",
    description: "A strong everyday default with enough room for quality work.",
    iconName: "time-outline",
  },
  {
    value: 60,
    label: "60 min",
    description: "The classic gym hour with space for compounds and accessories.",
    iconName: "time-outline",
  },
  {
    value: 75,
    label: "75 min",
    description: "More breathing room for longer rests and fuller sessions.",
    iconName: "time-outline",
  },
  {
    value: 90,
    label: "90 min",
    description: "Best for high-volume days or athletes who enjoy a slower pace.",
    iconName: "time-outline",
  },
];

export const GOAL_LABELS: Record<UserPrimaryGoal, string> = Object.fromEntries(
  GOAL_OPTIONS.map((option) => [option.value, option.label]),
) as Record<UserPrimaryGoal, string>;

export const EXPERIENCE_LABELS: Record<UserExperienceLevel, string> = Object.fromEntries(
  EXPERIENCE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<UserExperienceLevel, string>;

export const TRAINING_ENVIRONMENT_LABELS: Record<UserTrainingEnvironment, string> =
  Object.fromEntries(
    TRAINING_ENVIRONMENT_OPTIONS.map((option) => [option.value, option.label]),
  ) as Record<UserTrainingEnvironment, string>;

export const UNIT_SYSTEM_LABELS: Record<UserUnitSystem, string> = Object.fromEntries(
  UNIT_SYSTEM_OPTIONS.map((option) => [option.value, option.label]),
) as Record<UserUnitSystem, string>;
