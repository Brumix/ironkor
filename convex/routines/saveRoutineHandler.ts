import { normalizeDisplayNameKey } from "@ironkor/shared/strings";
import type { RoutineSaveInput } from "@ironkor/shared/routines";

import {
  MAX_EXERCISES_PER_SESSION,
  MAX_ROUTINE_NAME_LENGTH,
  MAX_SESSIONS_PER_ROUTINE,
  MAX_SECTION_NAME_LENGTH,
  assert,
  buildProgrammingRecord,
  countTrainingDays,
  ensureUniqueRoutineName,
  getSessionExercisesBySession,
  getSessionsByRoutine,
  requireName,
  setRoutineActiveState,
} from "./helpers";
import { requireRoutineOwner, requireViewer } from "../authHelpers";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type SaveRoutineInput = RoutineSaveInput<
  Id<"routines">,
  Id<"routineSessions">,
  Id<"exercises">,
  Id<"sessionExercises">
>;

function normalizeWeeklyPlan(weeklyPlan: SaveRoutineInput["weeklyPlan"]) {
  assert(weeklyPlan.length === 7, "Weekly plan must include 7 days.");

  const seenDays = new Set<number>();
  const normalized = [...weeklyPlan]
    .sort((left, right) => left.day - right.day)
    .map((entry) => {
      assert(entry.day >= 0 && entry.day <= 6, "Weekly plan day must be between 0 and 6.");
      assert(!seenDays.has(entry.day), "Weekly plan cannot repeat days.");
      seenDays.add(entry.day);
      assert(
        entry.type === "train" || entry.type === "rest",
        "Weekly plan day type is invalid.",
      );
      return {
        day: entry.day,
        type: entry.type,
        assignmentMode: "auto" as const,
      };
    });

  assert(seenDays.size === 7, "Weekly plan must include all 7 days.");
  assert(
    normalized.some((entry) => entry.type === "train"),
    "Weekly plan must include at least one training day.",
  );

  return normalized;
}

function assertUniqueSessionNames(
  sessions: SaveRoutineInput["sessions"],
) {
  const seenNames = new Set<string>();
  const seenClientKeys = new Set<string>();

  for (const session of sessions) {
    assert(session.clientKey.trim().length > 0, "Section client key is required.");
    assert(!seenClientKeys.has(session.clientKey), "Section client keys must be unique.");
    seenClientKeys.add(session.clientKey);

    const normalizedName = normalizeDisplayNameKey(
      requireName(session.name, "Section name", MAX_SECTION_NAME_LENGTH),
    );
    assert(!seenNames.has(normalizedName), "This routine already has a section with this name.");
    seenNames.add(normalizedName);

    assert(
      session.exercises.length <= MAX_EXERCISES_PER_SESSION,
      `Sections can have at most ${MAX_EXERCISES_PER_SESSION} exercises.`,
    );
  }
}

async function assertExerciseIsAttachable(
  ctx: MutationCtx,
  viewerId: Id<"users">,
  exerciseId: Id<"exercises">,
  cache: Map<Id<"exercises">, Doc<"exercises">>,
) {
  const cached = cache.get(exerciseId);
  if (cached) {
    assert(cached.archivedAt === undefined, "Archived exercises cannot be attached.");
    if (cached.isCustom) {
      assert(cached.ownerId === viewerId, "Unauthorized.");
    }
    return cached;
  }

  const exercise = await ctx.db.get(exerciseId);
  assert(exercise, "Exercise not found.");
  assert(exercise.archivedAt === undefined, "Archived exercises cannot be attached.");
  if (exercise.isCustom) {
    assert(exercise.ownerId === viewerId, "Unauthorized.");
  }
  cache.set(exerciseId, exercise);
  return exercise;
}

async function syncSessionExercises(
  ctx: MutationCtx,
  args: {
    session: SaveRoutineInput["sessions"][number];
    sessionId: Id<"routineSessions">;
    viewerId: Id<"users">;
    now: number;
    exerciseCache: Map<Id<"exercises">, Doc<"exercises">>;
  },
) {
  const existingEntries = await getSessionExercisesBySession(
    ctx,
    args.sessionId,
    args.viewerId,
  );
  const existingById = new Map(existingEntries.map((entry) => [entry._id, entry] as const));
  const seenExistingIds = new Set<Id<"sessionExercises">>();

  for (const exercise of args.session.exercises) {
    await assertExerciseIsAttachable(
      ctx,
      args.viewerId,
      exercise.exerciseId,
      args.exerciseCache,
    );

    if (exercise.sessionExerciseId) {
      const existing = existingById.get(exercise.sessionExerciseId);
      assert(existing, "Invalid section exercise id for this section.");
      assert(
        !seenExistingIds.has(exercise.sessionExerciseId),
        "Section exercise ids must be unique within a section.",
      );
      seenExistingIds.add(exercise.sessionExerciseId);
    }
  }

  for (const existing of existingEntries) {
    if (!seenExistingIds.has(existing._id)) {
      await ctx.db.delete(existing._id);
    }
  }

  for (let index = 0; index < args.session.exercises.length; index += 1) {
    const exercise = args.session.exercises[index]!;
    const programming = buildProgrammingRecord(exercise);

    if (exercise.sessionExerciseId) {
      await ctx.db.patch(exercise.sessionExerciseId, {
        exerciseId: exercise.exerciseId,
        order: index,
        ...programming,
        updatedAt: args.now,
      });
      continue;
    }

    await ctx.db.insert("sessionExercises", {
      userId: args.viewerId,
      sessionId: args.sessionId,
      exerciseId: exercise.exerciseId,
      order: index,
      ...programming,
      updatedAt: args.now,
    });
  }

  await ctx.db.patch(args.sessionId, {
    exerciseCount: args.session.exercises.length,
    updatedAt: args.now,
  });
}

export async function saveRoutineHandler(
  ctx: MutationCtx,
  args: SaveRoutineInput,
) {
  const { viewer } = await requireViewer(ctx);
  const now = Date.now();
  const name = requireName(args.name, "Routine name", MAX_ROUTINE_NAME_LENGTH);
  const nameKey = normalizeDisplayNameKey(name);
  const weeklyPlan = normalizeWeeklyPlan(args.weeklyPlan);
  const daysPerWeek = countTrainingDays(weeklyPlan);

  assert(
    args.sessions.length <= MAX_SESSIONS_PER_ROUTINE,
    `Routines can have at most ${MAX_SESSIONS_PER_ROUTINE} sections.`,
  );
  assertUniqueSessionNames(args.sessions);

  const exerciseCache = new Map<Id<"exercises">, Doc<"exercises">>();
  const routineId = args.routineId;

  if (!routineId) {
    await ensureUniqueRoutineName(ctx, viewer._id, name);

    const createdRoutineId = await ctx.db.insert("routines", {
      userId: viewer._id,
      name,
      nameKey,
      daysPerWeek,
      isActive: false,
      sessionOrder: [],
      weeklyPlan,
      updatedAt: now,
    });

    const createdSessionIds: Id<"routineSessions">[] = [];
    for (let index = 0; index < args.sessions.length; index += 1) {
      const session = args.sessions[index]!;
      const sessionName = requireName(session.name, "Section name", MAX_SECTION_NAME_LENGTH);
      const sessionId = await ctx.db.insert("routineSessions", {
        userId: viewer._id,
        routineId: createdRoutineId,
        name: sessionName,
        nameKey: normalizeDisplayNameKey(sessionName),
        order: index,
        exerciseCount: session.exercises.length,
        updatedAt: now,
      });
      createdSessionIds.push(sessionId);

      await syncSessionExercises(ctx, {
        session,
        sessionId,
        viewerId: viewer._id,
        now,
        exerciseCache,
      });
    }

    await ctx.db.patch(createdRoutineId, {
      sessionOrder: createdSessionIds,
      updatedAt: now,
    });
    await setRoutineActiveState(ctx, viewer._id, createdRoutineId, true);
    return createdRoutineId;
  }

  const { routine } = await requireRoutineOwner(ctx, routineId);
  await ensureUniqueRoutineName(ctx, viewer._id, name, {
    excludeRoutineId: routine._id,
  });
  const existingSessions = await getSessionsByRoutine(ctx, routineId, viewer._id);
  const existingSessionById = new Map(
    existingSessions.map((session) => [session._id, session] as const),
  );
  const seenExistingSessionIds = new Set<Id<"routineSessions">>();

  for (const session of args.sessions) {
    if (!session.sessionId) {
      continue;
    }
    const existing = existingSessionById.get(session.sessionId);
    assert(existing, "Invalid section id for this routine.");
    assert(
      !seenExistingSessionIds.has(session.sessionId),
      "Section ids must be unique within a routine.",
    );
    seenExistingSessionIds.add(session.sessionId);
  }

  for (const existingSession of existingSessions) {
    if (seenExistingSessionIds.has(existingSession._id)) {
      continue;
    }

    const existingEntries = await getSessionExercisesBySession(
      ctx,
      existingSession._id,
      viewer._id,
    );
    for (const entry of existingEntries) {
      await ctx.db.delete(entry._id);
    }
    await ctx.db.delete(existingSession._id);
  }

  const orderedSessionIds: Id<"routineSessions">[] = [];
  for (let index = 0; index < args.sessions.length; index += 1) {
    const session = args.sessions[index]!;
    const sessionName = requireName(session.name, "Section name", MAX_SECTION_NAME_LENGTH);
    const sessionNameKey = normalizeDisplayNameKey(sessionName);

    if (session.sessionId) {
      await ctx.db.patch(session.sessionId, {
        name: sessionName,
        nameKey: sessionNameKey,
        order: index,
        exerciseCount: session.exercises.length,
        updatedAt: now,
      });
      orderedSessionIds.push(session.sessionId);

      await syncSessionExercises(ctx, {
        session,
        sessionId: session.sessionId,
        viewerId: viewer._id,
        now,
        exerciseCache,
      });
      continue;
    }

    const sessionId = await ctx.db.insert("routineSessions", {
      userId: viewer._id,
      routineId,
      name: sessionName,
      nameKey: sessionNameKey,
      order: index,
      exerciseCount: session.exercises.length,
      updatedAt: now,
    });
    orderedSessionIds.push(sessionId);

    await syncSessionExercises(ctx, {
      session,
      sessionId,
      viewerId: viewer._id,
      now,
      exerciseCache,
    });
  }

  await ctx.db.patch(routine._id, {
    name,
    nameKey,
    daysPerWeek,
    weeklyPlan,
    sessionOrder: orderedSessionIds,
    updatedAt: now,
  });

  return routine._id;
}
