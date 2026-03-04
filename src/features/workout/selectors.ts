import { mockExercises, mockRoutine } from "@/features/workout/mockData";
import type {
  Exercise,
  WeeklyDayPlan,
  WeeklyPlan,
  WorkoutRoutine,
  WorkoutSessionTemplate,
} from "@/features/workout/types";

const TRAINING_DAY_MAP: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export function getExerciseMap(exercises: Exercise[]) {
  return new Map(exercises.map((exercise) => [exercise.id, exercise]));
}

export function estimateExerciseDurationMinutes(exercise: Exercise) {
  const activeSeconds = exercise.setsTarget * 45;
  const restSeconds = Math.max(exercise.setsTarget - 1, 0) * exercise.restSeconds;
  return Math.ceil((activeSeconds + restSeconds) / 60);
}

export function estimateSessionDurationMinutes(session: WorkoutSessionTemplate, exerciseMap: Map<string, Exercise>) {
  const totalMinutes = session.exerciseIds.reduce((accumulator, exerciseId) => {
    const exercise = exerciseMap.get(exerciseId);
    if (!exercise) {
      return accumulator;
    }

    return accumulator + estimateExerciseDurationMinutes(exercise);
  }, 0);

  return Math.max(totalMinutes, 30);
}

export function getWeekStart(date = new Date()) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + mondayOffset);
  return monday;
}

export function buildWeeklyPlan(
  routine: WorkoutRoutine,
  exercises: Exercise[],
  weekStart = getWeekStart(),
): WeeklyPlan {
  const trainingDays = TRAINING_DAY_MAP[Math.min(Math.max(routine.daysPerWeek, 1), 7)] ?? TRAINING_DAY_MAP[4];
  const exerciseMap = getExerciseMap(exercises);

  let sessionCursor = 0;

  const dayPlans: WeeklyDayPlan[] = Array.from({ length: 7 }, (_, dayIndex) => {
    const currentDate = new Date(weekStart);
    currentDate.setDate(currentDate.getDate() + dayIndex);

    if (!trainingDays.includes(dayIndex)) {
      return {
        dateISO: currentDate.toISOString().slice(0, 10),
        type: "rest",
        estimatedDurationMinutes: 0,
      };
    }

    const session = routine.sessions[sessionCursor % routine.sessions.length];
    sessionCursor += 1;

    return {
      dateISO: currentDate.toISOString().slice(0, 10),
      type: "train",
      sessionId: session.id,
      estimatedDurationMinutes: estimateSessionDurationMinutes(session, exerciseMap),
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

export function getSessionById(routine: WorkoutRoutine, sessionId?: string) {
  if (!sessionId) {
    return undefined;
  }

  return routine.sessions.find((session) => session.id === sessionId);
}

export function getMockWeeklyPlan() {
  return buildWeeklyPlan(mockRoutine, mockExercises);
}
