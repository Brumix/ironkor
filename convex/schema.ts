import { defineSchema } from "convex/server";

import { exercises } from "./schemas/exercises";
import { routines } from "./schemas/routines";
import { routineSessions } from "./schemas/routineSessions";
import { sessionExercises } from "./schemas/sessionExercises";

export default defineSchema({
  routines,
  routineSessions,
  exercises,
  sessionExercises,
});
