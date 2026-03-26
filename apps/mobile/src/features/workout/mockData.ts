import type {
  ExerciseLookupItem,
  WorkoutLog,
  WorkoutRoutine,
} from "@/features/workout/types";

export const mockRoutine: WorkoutRoutine = {
  id: "routine-push-legs-pull",
  name: "Push / Legs / Pull",
  daysPerWeek: 4,
  sessions: [
    {
      id: "push",
      name: "Push",
      exerciseIds: ["bench-press", "incline-db-press", "shoulder-press", "triceps-pushdown"],
    },
    {
      id: "legs",
      name: "Legs",
      exerciseIds: ["squat", "romanian-deadlift", "leg-press", "calf-raises"],
    },
    {
      id: "pull",
      name: "Pull",
      exerciseIds: ["pull-up", "barbell-row", "lat-pulldown", "biceps-curl"],
    },
  ],
};

export const mockExercises: ExerciseLookupItem[] = [
  { id: "bench-press", name: "Bench Press" },
  { id: "incline-db-press", name: "Incline Press" },
  { id: "shoulder-press", name: "Shoulder Press" },
  { id: "triceps-pushdown", name: "Triceps Pushdown" },
  { id: "squat", name: "Back Squat" },
  { id: "romanian-deadlift", name: "Romanian Deadlift" },
  { id: "leg-press", name: "Leg Press" },
  { id: "calf-raises", name: "Calf Raises" },
  { id: "pull-up", name: "Pull-Up" },
  { id: "barbell-row", name: "Barbell Row" },
  { id: "lat-pulldown", name: "Lat Pulldown" },
  { id: "biceps-curl", name: "Biceps Curl" },
];

export const mockLogs: WorkoutLog[] = [
  {
    id: "log-2026-03-03",
    dateISO: "2026-03-03",
    sessionName: "Push",
    durationMinutes: 64,
    notes: "Great energy, increase press by 2.5kg next session.",
    entries: [
      {
        exerciseId: "bench-press",
        performedSets: [
          { reps: 8, loadKg: 60 },
          { reps: 8, loadKg: 60 },
          { reps: 7, loadKg: 62.5 },
          { reps: 6, loadKg: 62.5 },
        ],
      },
      {
        exerciseId: "shoulder-press",
        performedSets: [
          { reps: 10, loadKg: 30 },
          { reps: 9, loadKg: 30 },
          { reps: 8, loadKg: 30 },
        ],
      },
    ],
  },
  {
    id: "log-2026-03-01",
    dateISO: "2026-03-01",
    sessionName: "Legs",
    durationMinutes: 71,
    notes: "Focused on squat technique.",
    entries: [
      {
        exerciseId: "squat",
        performedSets: [
          { reps: 8, loadKg: 80 },
          { reps: 7, loadKg: 82.5 },
          { reps: 7, loadKg: 82.5 },
          { reps: 6, loadKg: 85 },
        ],
      },
      {
        exerciseId: "leg-press",
        performedSets: [
          { reps: 12, loadKg: 160 },
          { reps: 12, loadKg: 160 },
          { reps: 10, loadKg: 170 },
        ],
      },
    ],
  },
];
