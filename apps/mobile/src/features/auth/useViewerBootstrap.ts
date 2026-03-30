import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

import { useAuth as useClerkAuth } from "@/features/auth/clerkCompat";
import { resolveAuthErrorMessage } from "@/features/auth/clerkErrors";

const convexSessionErrorMessage =
  "We signed you in, but couldn't establish your app session. Please try again.";
const accountDeletionErrorMessage =
  "Your account deletion is in progress. Please wait for it to finish before signing in again.";

export function useViewerBootstrap({ enabled = true }: { enabled?: boolean } = {}) {
  const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const viewer = useQuery(api.auth.getViewer, enabled ? {} : "skip");
  const ensureViewer = useMutation(api.auth.ensureViewer);
  const [isEnsuringViewer, setIsEnsuringViewer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setErrorMessage(null);
      return;
    }

    if (!isClerkLoaded || !isSignedIn) {
      setErrorMessage(null);
      return;
    }

    if (viewer?.deletionStatus) {
      setErrorMessage(accountDeletionErrorMessage);
      return;
    }

    if (isLoading || isAuthenticated) {
      setErrorMessage((currentError) =>
        currentError === convexSessionErrorMessage ? null : currentError,
      );
      return;
    }

    setErrorMessage((currentError) =>
      currentError ?? convexSessionErrorMessage,
    );
  }, [enabled, isAuthenticated, isClerkLoaded, isLoading, isSignedIn, viewer?.deletionStatus]);

  useEffect(() => {
    if (!enabled || !isAuthenticated || viewer !== null || isEnsuringViewer) {
      return;
    }

    let isCancelled = false;

    setIsEnsuringViewer(true);
    setErrorMessage(null);

    ensureViewer()
      .catch((error: unknown) => {
        if (!isCancelled) {
          setErrorMessage(
            resolveAuthErrorMessage(
              error,
              "We couldn't finish syncing your account.",
            ),
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsEnsuringViewer(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [enabled, ensureViewer, isAuthenticated, isEnsuringViewer, viewer]);

  const isReady =
    enabled &&
    isClerkLoaded &&
    isSignedIn &&
    isAuthenticated &&
    !isLoading &&
    !isEnsuringViewer &&
    viewer !== undefined &&
    viewer !== null &&
    !viewer.deletionStatus &&
    !errorMessage;

  return {
    errorMessage,
    isAuthenticated,
    isEnsuringViewer,
    isLoading,
    isReady,
    viewer,
  };
}
