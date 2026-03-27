// ===== DATE/TIME CONSTANTS =====
// Constants related to dates and time formatting

export const DAYS_OF_WEEK = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday',
] as const;

// ===== TYPE DEFINITIONS =====
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

