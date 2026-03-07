import type {
  Exercise,
  RoutineDetailed,
  RoutineSessionDetailed,
  WeeklyDayPlan,
  WeeklyPlan,
} from "@/features/workout/types";

export function getExerciseMap(exercises: Exercise[]) {
  return new Map(exercises.map((exercise) => [exercise.id, exercise]));
}

export function estimateExerciseDurationMinutes(exercise: Exercise) {
  const activeSeconds = exercise.setsTarget * 45;
  const restSeconds = Math.max(exercise.setsTarget - 1, 0) * exercise.restSeconds;
  return Math.ceil((activeSeconds + restSeconds) / 60);
}

export function estimateSessionDurationMinutes(session: RoutineSessionDetailed) {
  const totalMinutes = session.exercises.reduce((accumulator, sessionExercise) => {
    return accumulator + estimateExerciseDurationMinutes(sessionExercise.exercise);
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

function sortSessionsByRoutineOrder(routine: RoutineDetailed) {
  const sessionMap = new Map(routine.sessions.map((session) => [session.id, session]));
  const orderedBySessionOrder = routine.sessionOrder
    .map((sessionId) => sessionMap.get(sessionId))
    .filter((session): session is RoutineSessionDetailed => Boolean(session));

  const remaining = routine.sessions
    .filter((session) => !routine.sessionOrder.includes(session.id))
    .sort((a, b) => a.order - b.order);

  return [...orderedBySessionOrder, ...remaining];
}

export function buildWeeklyPlan(routine: RoutineDetailed, weekStart = getWeekStart()): WeeklyPlan {
  const sortedTemplate = [...routine.weeklyPlan].sort((a, b) => a.day - b.day);
  const orderedSessions = sortSessionsByRoutineOrder(routine);
  const sessionMap = new Map(orderedSessions.map((session) => [session.id, session]));

  let autoCursor = 0;

  const dayPlans: WeeklyDayPlan[] = sortedTemplate.map((dayTemplate) => {
    const currentDate = new Date(weekStart);
    currentDate.setDate(currentDate.getDate() + dayTemplate.day);

    if (dayTemplate.type === "rest") {
      return {
        dateISO: currentDate.toISOString().slice(0, 10),
        type: "rest",
        estimatedDurationMinutes: 0,
      };
    }

    let selectedSession: RoutineSessionDetailed | undefined;
    if (dayTemplate.assignmentMode === "manual" && dayTemplate.manualSessionId) {
      selectedSession = sessionMap.get(dayTemplate.manualSessionId);
    }

    if (!selectedSession) {
      selectedSession = orderedSessions[autoCursor % Math.max(orderedSessions.length, 1)];
      autoCursor += 1;
    }

    if (!selectedSession) {
      return {
        dateISO: currentDate.toISOString().slice(0, 10),
        type: "rest",
        estimatedDurationMinutes: 0,
      };
    }

    return {
      dateISO: currentDate.toISOString().slice(0, 10),
      type: "train",
      sessionId: selectedSession.id,
      sessionName: selectedSession.name,
      estimatedDurationMinutes: estimateSessionDurationMinutes(selectedSession),
    };
  });

  return {
    weekStartISO: weekStart.toISOString().slice(0, 10),
    dayPlans,
  };
}

export function getTodayPlan(plan: WeeklyPlan, date = new Date()) {
  const todayISO = date.toISOString().slice(0, 10);
  return plan.dayPlans.find((dayPlan) => dayPlan.dateISO === todayISO);
}

export function getSessionById(routine: RoutineDetailed, sessionId?: string) {
  if (!sessionId) {
    return undefined;
  }

  return routine.sessions.find((session) => session.id === sessionId);
}
