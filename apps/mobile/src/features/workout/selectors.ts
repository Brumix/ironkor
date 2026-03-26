import type {
  ExerciseLookupItem,
  RoutineDetailed,
  RoutineSection,
  SessionExercise,
  WeeklyDayPlan,
  WeeklyPlan,
} from "@/features/workout/types";

function toLocalDateISO(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getExerciseMap<T extends ExerciseLookupItem>(exercises: T[]) {
  return new Map(exercises.map((exercise) => [exercise.id, exercise] as const));
}

export function estimateSectionExerciseDurationMinutes(entry: SessionExercise) {
  const activeSeconds = entry.sets * 45;
  const restSeconds = Math.max(entry.sets - 1, 0) * (entry.restSeconds ?? 90);
  return Math.ceil((activeSeconds + restSeconds) / 60);
}

export function estimateSessionDurationMinutes(session: RoutineSection) {
  const totalMinutes = session.exercises.reduce((accumulator, sessionExercise) => {
    return accumulator + estimateSectionExerciseDurationMinutes(sessionExercise);
  }, 0);

  return Math.max(totalMinutes, 20);
}

export function getWeekStart(date = new Date()) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + mondayOffset);
  return monday;
}

function sortSectionsByRoutineOrder(routine: RoutineDetailed) {
  const sectionMap = new Map(routine.sessions.map((section) => [section._id, section] as const));
  const orderedSections = routine.sessionOrder
    .map((sectionId) => sectionMap.get(sectionId))
    .filter((section): section is RoutineSection => Boolean(section));

  const remainingSections = routine.sessions
    .filter((section) => !routine.sessionOrder.includes(section._id))
    .sort((a, b) => a.order - b.order);

  return [...orderedSections, ...remainingSections];
}

export function buildWeeklyPlan(
  routine: RoutineDetailed,
  weekStart = getWeekStart(),
): WeeklyPlan {
  const sortedTemplate = [...routine.weeklyPlan].sort((a, b) => a.day - b.day);
  const orderedSections = sortSectionsByRoutineOrder(routine);

  let autoCursor = 0;

  const dayPlans: WeeklyDayPlan[] = sortedTemplate.map((dayTemplate) => {
    const currentDate = new Date(weekStart);
    currentDate.setDate(currentDate.getDate() + dayTemplate.day);

    if (dayTemplate.type === "rest" || orderedSections.length === 0) {
      return {
        dateISO: toLocalDateISO(currentDate),
        type: "rest",
        estimatedDurationMinutes: 0,
      };
    }

    const selectedSection = orderedSections[autoCursor % orderedSections.length];
    autoCursor += 1;

    return {
      dateISO: toLocalDateISO(currentDate),
      type: "train",
      sessionId: selectedSection._id,
      sessionName: selectedSection.name,
      estimatedDurationMinutes: estimateSessionDurationMinutes(selectedSection),
    };
  });

  return {
    weekStartISO: toLocalDateISO(weekStart),
    dayPlans,
  };
}

export function getTodayPlan(plan: WeeklyPlan, date = new Date()) {
  const todayISO = toLocalDateISO(date);
  return plan.dayPlans.find((dayPlan) => dayPlan.dateISO === todayISO);
}

export function getSessionById(
  routine: RoutineDetailed,
  sessionId?: RoutineSection["_id"],
) {
  if (!sessionId) {
    return undefined;
  }

  return routine.sessions.find((session) => session._id === sessionId);
}
