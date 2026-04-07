import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { weeklyPlanEntry } from "./schemas/routines";
import {
  deleteSessionExerciseHandler,
  reorderSessionExercisesHandler,
  updateSessionExerciseProgrammingHandler,
  upsertSessionExerciseHandler,
} from "./routines/exerciseMutations";
import {
  getActiveDetailedHandler,
  getDetailedByIdHandler,
  listSummariesHandler,
} from "./routines/queries";
import {
  createHandler,
  deleteRoutineHandler,
  setActiveHandler,
  toggleActiveHandler,
  updateHandler,
} from "./routines/routineMutations";
import { saveRoutineHandler } from "./routines/saveRoutineHandler";
import {
  deleteSessionHandler,
  reorderSessionsHandler,
  upsertSessionHandler,
} from "./routines/sessionMutations";
import { updateWeeklyPlanHandler } from "./routines/weeklyPlanMutations";

const saveRoutineExerciseValidator = v.object({
  sessionExerciseId: v.optional(v.id("sessionExercises")),
  exerciseId: v.id("exercises"),
  sets: v.number(),
  repsText: v.string(),
  targetWeightKg: v.optional(v.number()),
  restSeconds: v.optional(v.number()),
  notes: v.optional(v.string()),
  tempo: v.optional(v.string()),
  rir: v.optional(v.number()),
});

const saveRoutineSessionValidator = v.object({
  sessionId: v.optional(v.id("routineSessions")),
  clientKey: v.string(),
  name: v.string(),
  exercises: v.array(saveRoutineExerciseValidator),
});

const saveRoutineWeeklyPlanValidator = v.object({
  day: v.number(),
  type: v.union(v.literal("train"), v.literal("rest")),
});

export const listSummaries = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: listSummariesHandler,
});

export const getDetailedById = query({
  args: {
    routineId: v.id("routines"),
  },
  handler: getDetailedByIdHandler,
});

export const getActiveDetailed = query({
  args: {},
  handler: getActiveDetailedHandler,
});

export const create = mutation({
  args: {
    name: v.string(),
    daysPerWeek: v.number(),
    isActive: v.optional(v.boolean()),
  },
  handler: createHandler,
});

export const update = mutation({
  args: {
    routineId: v.id("routines"),
    name: v.optional(v.string()),
    daysPerWeek: v.optional(v.number()),
  },
  handler: updateHandler,
});

export const saveRoutine = mutation({
  args: {
    routineId: v.optional(v.id("routines")),
    name: v.string(),
    weeklyPlan: v.array(saveRoutineWeeklyPlanValidator),
    sessions: v.array(saveRoutineSessionValidator),
  },
  handler: saveRoutineHandler,
});

export const deleteRoutine = mutation({
  args: {
    routineId: v.id("routines"),
  },
  handler: deleteRoutineHandler,
});

export const setActive = mutation({
  args: {
    routineId: v.id("routines"),
  },
  handler: setActiveHandler,
});

export const toggleActive = mutation({
  args: {
    routineId: v.id("routines"),
    isActive: v.boolean(),
  },
  handler: toggleActiveHandler,
});

export const upsertSession = mutation({
  args: {
    routineId: v.id("routines"),
    sessionId: v.optional(v.id("routineSessions")),
    name: v.string(),
  },
  handler: upsertSessionHandler,
});

export const deleteSession = mutation({
  args: {
    routineId: v.id("routines"),
    sessionId: v.id("routineSessions"),
  },
  handler: deleteSessionHandler,
});

export const reorderSessions = mutation({
  args: {
    routineId: v.id("routines"),
    orderedSessionIds: v.array(v.id("routineSessions")),
  },
  handler: reorderSessionsHandler,
});

export const upsertSessionExercise = mutation({
  args: {
    sessionId: v.id("routineSessions"),
    sessionExerciseId: v.optional(v.id("sessionExercises")),
    exerciseId: v.id("exercises"),
    sets: v.optional(v.number()),
    repsText: v.optional(v.string()),
    targetWeightKg: v.optional(v.number()),
    restSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
    tempo: v.optional(v.string()),
    rir: v.optional(v.number()),
  },
  handler: upsertSessionExerciseHandler,
});

export const updateSessionExerciseProgramming = mutation({
  args: {
    sessionId: v.id("routineSessions"),
    sessionExerciseId: v.id("sessionExercises"),
    sets: v.optional(v.number()),
    repsText: v.optional(v.string()),
    targetWeightKg: v.optional(v.number()),
    restSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
    tempo: v.optional(v.string()),
    rir: v.optional(v.number()),
  },
  handler: updateSessionExerciseProgrammingHandler,
});

export const deleteSessionExercise = mutation({
  args: {
    sessionId: v.id("routineSessions"),
    sessionExerciseId: v.id("sessionExercises"),
  },
  handler: deleteSessionExerciseHandler,
});

export const reorderSessionExercises = mutation({
  args: {
    sessionId: v.id("routineSessions"),
    orderedSessionExerciseIds: v.array(v.id("sessionExercises")),
  },
  handler: reorderSessionExercisesHandler,
});

export const updateWeeklyPlan = mutation({
  args: {
    routineId: v.id("routines"),
    weeklyPlan: v.array(weeklyPlanEntry),
  },
  handler: updateWeeklyPlanHandler,
});
