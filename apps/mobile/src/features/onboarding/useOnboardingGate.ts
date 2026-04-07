import { api } from "@convex/_generated/api";
import { useQueries, type RequestForQueries } from "convex/react";
import { useMemo } from "react";

import { resolveStartupErrorMessage } from "@/features/errors/startupErrors";

import type { FunctionReturnType } from "convex/server";

type OnboardingSummary = FunctionReturnType<typeof api.profile.getViewerProfileSummary>;
type OnboardingGateSummary = Pick<OnboardingSummary, "blocked" | "isComplete" | "resumeStep">;

export function resolveOnboardingGateState(
  summary: OnboardingGateSummary | null | undefined,
  enabled: boolean,
) {
  if (!enabled) {
    return {
      blocked: false,
      isComplete: false,
      isLoading: false,
      resumeStep: 0,
    };
  }

  if (summary === undefined) {
    return {
      blocked: false,
      isComplete: false,
      isLoading: true,
      resumeStep: 0,
    };
  }

  if (summary === null) {
    return {
      blocked: false,
      isComplete: false,
      isLoading: false,
      resumeStep: 0,
    };
  }

  return {
    blocked: summary.blocked,
    isComplete: summary.isComplete,
    isLoading: false,
    resumeStep: summary.resumeStep,
  };
}

export function useOnboardingGate({ enabled = true }: { enabled?: boolean } = {}) {
  const onboardingQueries = useMemo<RequestForQueries>(
    () =>
      enabled
        ? {
            summary: {
              query: api.profile.getViewerProfileSummary,
              args: {},
            },
          }
        : ({} as RequestForQueries),
    [enabled],
  );
  const queryResults = useQueries(onboardingQueries);
  const summaryResult = queryResults.summary as OnboardingSummary | Error | undefined;
  const error = summaryResult instanceof Error ? summaryResult : null;
  const summary = summaryResult instanceof Error ? undefined : summaryResult;

  if (error) {
    return {
      blocked: false,
      error,
      errorMessage: resolveStartupErrorMessage(
        error,
        "We couldn't load your profile for this environment.",
      ),
      isComplete: false,
      isLoading: false,
      resumeStep: 0,
      summary: null,
    };
  }

  const gateState = resolveOnboardingGateState(summary, enabled);

  return {
    ...gateState,
    error: null,
    errorMessage: null,
    summary,
  };
}
