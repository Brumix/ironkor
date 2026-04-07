import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQueries, type RequestForQueries } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth as useClerkAuth } from "@/features/auth/clerkCompat";
import { resolveStartupErrorMessage } from "@/features/errors/startupErrors";

import type { Doc, Id } from "@convex/_generated/dataModel";

const convexSessionErrorMessage =
  "We signed you in, but couldn't establish your app session. Please try again.";
const restoreDecisionRequiredMessage =
  "Choose whether to restore your previous Ironkor account or start fresh.";

type ViewerBootstrapState = Pick<Doc<"users">, "_id" | "accountStatus"> | null | undefined;
type RestoreCandidateState =
  | {
      deletedAt: number;
      restoreEligibleUntil: number;
      userId: Id<"users">;
    }
  | null
  | undefined;

export function isViewerBootstrapReady({
  enabled,
  errorMessage,
  isAuthenticated,
  isClerkLoaded,
  isEnsuringViewer,
  isLoading,
  isResolvingRestoreChoice,
  isSignedIn,
  restoreCandidate,
  viewer,
}: {
  enabled: boolean;
  errorMessage: string | null;
  isAuthenticated: boolean;
  isClerkLoaded: boolean;
  isEnsuringViewer: boolean;
  isLoading: boolean;
  isResolvingRestoreChoice: boolean;
  isSignedIn: boolean;
  restoreCandidate: RestoreCandidateState;
  viewer: ViewerBootstrapState;
}) {
  return (
    enabled &&
    isClerkLoaded &&
    isSignedIn &&
    isAuthenticated &&
    !isLoading &&
    !isEnsuringViewer &&
    !isResolvingRestoreChoice &&
    viewer !== undefined &&
    viewer !== null &&
    restoreCandidate === null &&
    !errorMessage
  );
}

export function useViewerBootstrap({ enabled = true }: { enabled?: boolean } = {}) {
  const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const bootstrapQueries = useMemo<RequestForQueries>(
    () =>
      enabled
        ? {
            restoreCandidate: {
              query: api.auth.getRestoreCandidate,
              args: {},
            },
            viewer: {
              query: api.auth.getViewer,
              args: {},
            },
          }
        : ({} as RequestForQueries),
    [enabled],
  );
  const bootstrapResults = useQueries(bootstrapQueries);
  const viewerQueryResult = bootstrapResults.viewer as ViewerBootstrapState | Error | undefined;
  const restoreCandidateQueryResult = bootstrapResults.restoreCandidate as
    | RestoreCandidateState
    | Error
    | undefined;
  const bootstrapQueryError =
    viewerQueryResult instanceof Error
      ? viewerQueryResult
      : restoreCandidateQueryResult instanceof Error
        ? restoreCandidateQueryResult
        : null;
  const viewer =
    viewerQueryResult instanceof Error ? undefined : viewerQueryResult;
  const restoreCandidate =
    restoreCandidateQueryResult instanceof Error
      ? undefined
      : restoreCandidateQueryResult;
  const ensureViewer = useMutation(api.auth.ensureViewer);
  const restoreDeletedAccount = useMutation(api.auth.restoreDeletedAccount);
  const declineDeletedAccountRestore = useMutation(api.auth.declineDeletedAccountRestore);
  const [isEnsuringViewer, setIsEnsuringViewer] = useState(false);
  const [isResolvingRestoreChoice, setIsResolvingRestoreChoice] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setErrorMessage(null);
      return;
    }

    if (!isClerkLoaded || !isSignedIn) {
      setErrorMessage(null);
      return;
    }

    if (bootstrapQueryError) {
      setErrorMessage(
        resolveStartupErrorMessage(
          bootstrapQueryError,
          "We couldn't finish loading your workspace.",
        ),
      );
      return;
    }

    if (restoreCandidate) {
      setErrorMessage((currentError) =>
        currentError === convexSessionErrorMessage ? restoreDecisionRequiredMessage : currentError,
      );
      return;
    }

    if (isLoading || isAuthenticated) {
      setErrorMessage((currentError) =>
        currentError === convexSessionErrorMessage ||
        currentError === restoreDecisionRequiredMessage
          ? null
          : currentError,
      );
      return;
    }

    setErrorMessage((currentError) => currentError ?? convexSessionErrorMessage);
  }, [
    enabled,
    bootstrapQueryError,
    isAuthenticated,
    isClerkLoaded,
    isLoading,
    isSignedIn,
    restoreCandidate,
  ]);

  useEffect(() => {
    if (
      !enabled ||
      !isAuthenticated ||
      bootstrapQueryError !== null ||
      viewer !== null ||
      restoreCandidate !== null ||
      isEnsuringViewer ||
      isResolvingRestoreChoice
    ) {
      return;
    }

    setIsEnsuringViewer(true);
    setErrorMessage(null);

    ensureViewer()
      .catch((error: unknown) => {
        if (!isMountedRef.current) {
          return;
        }

        const resolvedMessage = resolveStartupErrorMessage(
          error,
          "We couldn't finish syncing your account.",
        );

        if (resolvedMessage === "Restore decision required.") {
          setErrorMessage(restoreDecisionRequiredMessage);
          return;
        }

        setErrorMessage(resolvedMessage);
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsEnsuringViewer(false);
        }
      });
  }, [
    enabled,
    ensureViewer,
    bootstrapQueryError,
    isAuthenticated,
    isEnsuringViewer,
    isResolvingRestoreChoice,
    restoreCandidate,
    viewer,
  ]);

  async function handleRestorePreviousAccount() {
    if (isResolvingRestoreChoice) {
      return;
    }

    setIsResolvingRestoreChoice(true);
    setErrorMessage(null);
    try {
      await restoreDeletedAccount({});
    } catch (error: unknown) {
      if (isMountedRef.current) {
        setErrorMessage(
          resolveStartupErrorMessage(
            error,
            "We couldn't restore your previous Ironkor account.",
          ),
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsResolvingRestoreChoice(false);
      }
    }
  }

  async function handleStartFreshAccount() {
    if (isResolvingRestoreChoice) {
      return;
    }

    setIsResolvingRestoreChoice(true);
    setErrorMessage(null);
    try {
      await declineDeletedAccountRestore({});
      await ensureViewer();
    } catch (error: unknown) {
      if (isMountedRef.current) {
        setErrorMessage(
          resolveStartupErrorMessage(
            error,
            "We couldn't create a fresh Ironkor account for this session.",
          ),
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsResolvingRestoreChoice(false);
      }
    }
  }

  const isReady = isViewerBootstrapReady({
    enabled,
    errorMessage,
    isAuthenticated,
    isClerkLoaded,
    isEnsuringViewer,
    isLoading,
    isResolvingRestoreChoice,
    isSignedIn,
    restoreCandidate,
    viewer,
  });

  return {
    errorMessage,
    isAuthenticated,
    isEnsuringViewer,
    isLoading,
    isReady,
    isResolvingRestoreChoice,
    restoreCandidate,
    restorePreviousAccount: handleRestorePreviousAccount,
    startFreshAccount: handleStartFreshAccount,
    viewer,
  };
}
