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

type UserDoc = Doc<"users">;
type ReaderCtx = QueryCtx | MutationCtx;

const USER_LOOKUP_LIMIT = 20;

export const ACCOUNT_RESTORE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

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
  const activeUsers = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier_and_accountStatus", (q) =>
      q.eq("tokenIdentifier", tokenIdentifier).eq("accountStatus", "active"),
    )
    .take(2);
  if (activeUsers.length > 0) {
    return pickMostRecentUser(activeUsers);
  }

  const users = await listUsersByTokenIdentifier(ctx, tokenIdentifier);
  return pickMostRecentUser(users.filter(isActiveUser));
}

export async function getRestoreCandidateByTokenIdentifier(
  ctx: { db: DatabaseReader },
  tokenIdentifier: string,
  now = Date.now(),
) {
  const users = await listUsersByTokenIdentifier(ctx, tokenIdentifier);
  const restoreCandidates = users
    .filter((user) => isRestoreCandidateEligible(user, now))
    .sort((left, right) => {
      const deletedAtDelta = getDeletedAtTimestamp(right) - getDeletedAtTimestamp(left);
      if (deletedAtDelta !== 0) {
        return deletedAtDelta;
      }
      return right._creationTime - left._creationTime;
    });

  return restoreCandidates[0] ?? null;
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
    tokenIdentifier: identity.tokenIdentifier,
  };
}

export function getDeletedAtTimestamp(user: UserDoc) {
  return user.deletedAt ?? user.deletionRequestedAt ?? user.updatedAt ?? user._creationTime;
}

export function getRestoreEligibleUntilTimestamp(user: UserDoc) {
  return user.restoreEligibleUntil ?? (getDeletedAtTimestamp(user) + ACCOUNT_RESTORE_WINDOW_MS);
}

export function isDeletedUser(user: UserDoc) {
  return user.accountStatus === "deleted" || (
    user.accountStatus === undefined &&
    (
      user.deletionStatus !== undefined ||
      user.deletionRequestedAt !== undefined ||
      user.deletionJobId !== undefined
    )
  );
}

export function isActiveUser(user: UserDoc) {
  return !isDeletedUser(user);
}

export function isRestoreCandidateEligible(user: UserDoc, now = Date.now()) {
  const restoreDecision = user.restoreDecision ?? "pending";
  return (
    isDeletedUser(user) &&
    restoreDecision === "pending" &&
    getRestoreEligibleUntilTimestamp(user) > now
  );
}

async function listUsersByTokenIdentifier(
  ctx: { db: DatabaseReader },
  tokenIdentifier: string,
) {
  return ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .take(USER_LOOKUP_LIMIT);
}

function pickMostRecentUser<T extends { _creationTime: number }>(users: T[]) {
  return [...users].sort((left, right) => right._creationTime - left._creationTime)[0] ?? null;
}
