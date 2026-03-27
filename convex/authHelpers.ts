import { ConvexError } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type {
  ActionCtx,
  DatabaseReader,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";

type Identity = NonNullable<
  Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>
>;

type ReaderCtx = QueryCtx | MutationCtx;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ConvexError(message);
  }
}

export async function requireIdentity(
  ctx: Pick<QueryCtx | MutationCtx | ActionCtx, "auth">,
): Promise<Identity> {
  const identity = await ctx.auth.getUserIdentity();
  invariant(identity, "Not authenticated.");
  return identity;
}

export async function getViewerByTokenIdentifier(
  ctx: { db: DatabaseReader },
  tokenIdentifier: string,
) {
  return ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", tokenIdentifier),
    )
    .unique();
}

export async function requireViewer(ctx: ReaderCtx) {
  const identity = await requireIdentity(ctx);
  const viewer = await getViewerByTokenIdentifier(ctx, identity.tokenIdentifier);
  invariant(viewer, "Viewer profile not found.");
  return { identity, viewer };
}

export async function requireRoutineOwner(
  ctx: ReaderCtx,
  routineId: Id<"routines">,
) {
  const { viewer } = await requireViewer(ctx);
  const routine = await ctx.db.get(routineId);
  invariant(routine, "Routine not found.");
  invariant(routine.userId === viewer._id, "Unauthorized.");
  return { viewer, routine };
}

export async function requireSessionOwner(
  ctx: ReaderCtx,
  sessionId: Id<"routineSessions">,
) {
  const { viewer } = await requireViewer(ctx);
  const session = await ctx.db.get(sessionId);
  invariant(session, "Section not found.");
  invariant(session.userId === viewer._id, "Unauthorized.");

  const routine = await ctx.db.get(session.routineId);
  invariant(routine, "Routine not found.");
  invariant(routine.userId === viewer._id, "Unauthorized.");
  return { viewer, session, routine };
}

export async function requireSessionExerciseOwner(
  ctx: ReaderCtx,
  sessionExerciseId: Id<"sessionExercises">,
) {
  const { viewer } = await requireViewer(ctx);
  const sessionExercise = await ctx.db.get(sessionExerciseId);
  invariant(sessionExercise, "Section exercise not found.");
  invariant(sessionExercise.userId === viewer._id, "Unauthorized.");
  return { viewer, sessionExercise };
}

export async function requireCustomExerciseOwner(
  ctx: ReaderCtx,
  exerciseId: Id<"exercises">,
) {
  const { viewer } = await requireViewer(ctx);
  const exercise = await ctx.db.get(exerciseId);
  invariant(exercise, "Exercise not found.");
  invariant(exercise.isCustom, "Only custom exercises can be edited.");
  invariant(exercise.ownerId === viewer._id, "Unauthorized.");
  return { viewer, exercise };
}

export function getIdentitySnapshot(identity: Identity) {
  return {
    clerkUserId: identity.subject,
    displayName: identity.name ?? undefined,
    imageUrl: identity.pictureUrl ?? undefined,
    primaryEmail: identity.email ?? undefined,
    tokenIdentifier: identity.tokenIdentifier,
  };
}

export async function listViewerRoutines(
  ctx: { db: DatabaseReader },
  userId: Doc<"users">["_id"],
  limit?: number,
) {
  const query = ctx.db
    .query("routines")
    .withIndex("by_userId_and_updatedAt", (q) => q.eq("userId", userId))
    .order("desc");

  if (typeof limit === "number") {
    return query.take(limit);
  }

  return query.collect();
}
