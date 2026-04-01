import { defineSchema } from "convex/server";

import {
  accountDeletionJobChunks,
  accountDeletionJobs,
} from "./schemas/accountDeletionJobs";
import { exercises } from "./schemas/exercises";
import { routines } from "./schemas/routines";
import { routineSessions } from "./schemas/routineSessions";
import { sessionExercises } from "./schemas/sessionExercises";
import { users } from "./schemas/users";

export default defineSchema({
  users,
  accountDeletionJobs,
  accountDeletionJobChunks,
  routines,
  routineSessions,
  exercises,
  sessionExercises,
});
