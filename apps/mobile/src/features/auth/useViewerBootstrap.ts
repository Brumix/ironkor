import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { useAuth as useClerkAuth } from "@/features/auth/clerkCompat";
import { resolveAuthErrorMessage } from "@/features/auth/clerkErrors";

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
  const viewer = useQuery(api.auth.getViewer, enabled ? {} : "skip");
  const restoreCandidate = useQuery(api.auth.getRestoreCandidate, enabled ? {} : "skip");
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

        const resolvedMessage = resolveAuthErrorMessage(
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
          resolveAuthErrorMessage(
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
          resolveAuthErrorMessage(
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
