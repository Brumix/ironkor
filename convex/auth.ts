import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import {
  getViewerByTokenIdentifier as findViewerByTokenIdentifier,
  getIdentitySnapshot,
  requireIdentity,
} from "./authHelpers";

export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return findViewerByTokenIdentifier(ctx, identity.tokenIdentifier);
  },
});

export const ensureViewer = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const snapshot = getIdentitySnapshot(identity);
    const now = Date.now();

    const existing = await findViewerByTokenIdentifier(ctx, snapshot.tokenIdentifier);
    if (existing) {
      await ctx.db.patch(existing._id, {
        clerkUserId: snapshot.clerkUserId,
        displayName: snapshot.displayName,
        imageUrl: snapshot.imageUrl,
        primaryEmail: snapshot.primaryEmail,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      ...snapshot,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteMyAccount = action({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const viewer = await ctx.runQuery(internal.auth.getViewerByTokenIdentifier, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("Missing CLERK_SECRET_KEY.");
    }

    const clerkUserId = viewer?.clerkUserId ?? identity.subject;
    const response = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
        },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Unable to delete Clerk account: ${body}`);
    }

    if (viewer?._id) {
      await ctx.runMutation(internal.auth.purgeViewerData, {
        viewerId: viewer._id,
      });
    }

    return { deleted: true };
  },
});

export const getViewerByTokenIdentifier = internalQuery({
  args: {
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    return findViewerByTokenIdentifier(ctx, args.tokenIdentifier);
  },
});

export const purgeViewerData = internalMutation({
  args: {
    viewerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const viewer = await ctx.db.get(args.viewerId);
    if (!viewer) {
      return { deleted: false };
    }

    const routines = await ctx.db
      .query("routines")
      .withIndex("by_userId_and_updatedAt", (q) => q.eq("userId", args.viewerId))
      .collect();

    for (const routine of routines) {
      const sessions = await ctx.db
        .query("routineSessions")
        .withIndex("by_userId_and_routine", (q) =>
          q.eq("userId", args.viewerId).eq("routineId", routine._id),
        )
        .collect();

      for (const session of sessions) {
        const sessionExercises = await ctx.db
          .query("sessionExercises")
          .withIndex("by_userId_and_session", (q) =>
            q.eq("userId", args.viewerId).eq("sessionId", session._id),
          )
          .collect();

        for (const entry of sessionExercises) {
          await ctx.db.delete(entry._id);
        }

        await ctx.db.delete(session._id);
      }

      await ctx.db.delete(routine._id);
    }

    const customExercises = await ctx.db
      .query("exercises")
      .withIndex("by_ownerId_and_nameText", (q) => q.eq("ownerId", args.viewerId))
      .collect();

    for (const exercise of customExercises) {
      await ctx.db.delete(exercise._id);
    }

    await ctx.db.delete(args.viewerId);
    return { deleted: true };
  },
});
