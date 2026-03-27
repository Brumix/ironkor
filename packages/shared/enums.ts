// ===== ENUM-LIKE CONSTANTS =====
// These constants are used by both Convex schemas and frontend types
// to ensure consistency across the entire application

export const SET_TYPE_VALUES = [
	'warmup',
	'main',
	'cooldown',
	'dropset',
	'backoff',
	'super set',
	'reverse pyramid',
] as const;

export const EQUIPMENT_VALUES = [
	'cable',
	'stability ball',
	'sled machine',
	'bosu ball',
	'stationary bike',
	'leverage machine',
	'barbell',
	'kettlebell',
	'hammer',
	'skierg machine',
	'elliptical machine',
	'medicine ball',
	'dumbbell',
	'tire',
	'roller',
	'trap bar',
	'rope',
	'ez barbell',
	'upper body ergometer',
	'olympic barbell',
	'weighted',
	'wheel roller',
	'stepmill machine',
	'body weight',
	'assisted',
	'band',
	'resistance band',
	'smith machine',
	'puley machine',
	'seated row machine',
] as const;

export const MUSCLE_VALUES = [
	'spine',
	'traps',
	'hamstrings',
	'quads',
	'pectorals',
	'biceps',
	'abductors',
	'abs',
	'glutes',
	'triceps',
	'upper back',
	'delts',
	'forearms',
	'serratus anterior',
	'levator scapulae',
	'calves',
	'adductors',
	'cardiovascular system',
	'lats',
] as const;

export const BODY_PART_VALUES = [
	'neck',
	'waist',
	'chest',
	'upper arms',
	'lower arms',
	'shoulders',
	'upper legs',
	'back',
	'lower legs',
	'cardio',
] as const;

export const DIFFICULTY_VALUES = ['beginner', 'intermediate', 'advanced'] as const;

export const FREQUENCY_VALUES = ['custom', 'weekly'] as const;

// ===== TYPE DEFINITIONS =====
export type SetType = (typeof SET_TYPE_VALUES)[number];
export type EquipmentType = (typeof EQUIPMENT_VALUES)[number];
export type MuscleType = (typeof MUSCLE_VALUES)[number];
export type BodyPartType = (typeof BODY_PART_VALUES)[number];
export type DifficultyType = (typeof DIFFICULTY_VALUES)[number];
export type FrequencyType = (typeof FREQUENCY_VALUES)[number];

