import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";

interface OnboardingSummary {
  blocked: boolean;
  isComplete: boolean;
  resumeStep: number;
}

export function resolveOnboardingGateState(
  summary: OnboardingSummary | null | undefined,
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
  const summary = useQuery(api.profile.getViewerProfileSummary, enabled ? {} : "skip");
  const gateState = resolveOnboardingGateState(summary, enabled);

  return {
    ...gateState,
    summary,
  };
}
