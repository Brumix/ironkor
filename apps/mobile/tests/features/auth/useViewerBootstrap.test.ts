import { describe, expect, test } from "vitest";

import { isViewerBootstrapReady } from "@/features/auth/useViewerBootstrap";

import type { Id } from "@convex/_generated/dataModel";

const viewerId = "users_123" as Id<"users">;

describe("useViewerBootstrap helpers", () => {
  test("waits for the viewer query to resolve before marking bootstrap ready", () => {
    expect(
      isViewerBootstrapReady({
        enabled: true,
        errorMessage: null,
        isAuthenticated: true,
        isClerkLoaded: true,
        isEnsuringViewer: false,
        isLoading: false,
        isResolvingRestoreChoice: false,
        isSignedIn: true,
        restoreCandidate: null,
        viewer: null,
      }),
    ).toBe(false);
  });

  test("stays blocked while a restore candidate is waiting on user choice", () => {
    expect(
      isViewerBootstrapReady({
        enabled: true,
        errorMessage: null,
        isAuthenticated: true,
        isClerkLoaded: true,
        isEnsuringViewer: false,
        isLoading: false,
        isResolvingRestoreChoice: false,
        isSignedIn: true,
        restoreCandidate: {
          deletedAt: Date.now(),
          restoreEligibleUntil: Date.now() + 1_000,
          userId: viewerId,
        },
        viewer: null,
      }),
    ).toBe(false);
  });

  test("stays blocked while the restore choice is being submitted", () => {
    expect(
      isViewerBootstrapReady({
        enabled: true,
        errorMessage: null,
        isAuthenticated: true,
        isClerkLoaded: true,
        isEnsuringViewer: false,
        isLoading: false,
        isResolvingRestoreChoice: true,
        isSignedIn: true,
        restoreCandidate: null,
        viewer: {
          _id: viewerId,
          accountStatus: "active",
        },
      }),
    ).toBe(false);
  });

  test("marks the bootstrap as ready once the active viewer is available", () => {
    expect(
      isViewerBootstrapReady({
        enabled: true,
        errorMessage: null,
        isAuthenticated: true,
        isClerkLoaded: true,
        isEnsuringViewer: false,
        isLoading: false,
        isResolvingRestoreChoice: false,
        isSignedIn: true,
        restoreCandidate: null,
        viewer: {
          _id: viewerId,
          accountStatus: "active",
        },
      }),
    ).toBe(true);
  });
});
