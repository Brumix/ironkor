import { describe, expect, test } from "vitest";

import { resolveOnboardingGateState } from "@/features/onboarding/useOnboardingGate";

describe("resolveOnboardingGateState", () => {
  test("returns a loading state while the summary query is unresolved", () => {
    expect(resolveOnboardingGateState(undefined, true)).toEqual({
      blocked: false,
      isComplete: false,
      isLoading: true,
      resumeStep: 0,
    });
  });

  test("blocks brand-new users until onboarding is complete", () => {
    expect(
      resolveOnboardingGateState(
        {
          blocked: true,
          isComplete: false,
          resumeStep: 3,
        },
        true,
      ),
    ).toEqual({
      blocked: true,
      isComplete: false,
      isLoading: false,
      resumeStep: 3,
    });
  });

  test("stays open for completed profiles", () => {
    expect(
      resolveOnboardingGateState(
        {
          blocked: false,
          isComplete: true,
          resumeStep: 0,
        },
        true,
      ),
    ).toEqual({
      blocked: false,
      isComplete: true,
      isLoading: false,
      resumeStep: 0,
    });
  });
});
