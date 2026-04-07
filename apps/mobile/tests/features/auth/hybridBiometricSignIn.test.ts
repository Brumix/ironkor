import { describe, expect, test, vi } from "vitest";

import {
  completeHybridSignIn,
  getBiometricSignInLabel,
  resolveHybridSignInStep,
  shouldShowBiometricSignInAction,
} from "@/features/auth/hybridBiometricSignIn";

describe("hybridBiometricSignIn", () => {
  test("shows biometric sign-in only when credentials exist and no second factor is pending", () => {
    expect(
      shouldShowBiometricSignInAction({
        biometricType: "face-recognition",
        hasCredentials: true,
        isAwaitingSecondFactor: false,
      }),
    ).toBe(true);

    expect(
      shouldShowBiometricSignInAction({
        biometricType: null,
        hasCredentials: true,
        isAwaitingSecondFactor: false,
      }),
    ).toBe(false);

    expect(
      shouldShowBiometricSignInAction({
        biometricType: "fingerprint",
        hasCredentials: true,
        isAwaitingSecondFactor: true,
      }),
    ).toBe(false);
  });

  test("maps biometric types to platform-aware sign-in labels", () => {
    expect(
      getBiometricSignInLabel({
        biometricType: "face-recognition",
        platform: "ios",
      }),
    ).toBe("Sign in with Face ID");

    expect(
      getBiometricSignInLabel({
        biometricType: "fingerprint",
        platform: "ios",
      }),
    ).toBe("Sign in with Touch ID");

    expect(
      getBiometricSignInLabel({
        biometricType: "fingerprint",
        platform: "android",
      }),
    ).toBe("Sign in with fingerprint");
  });

  test("routes biometric sign-in completions through session activation", async () => {
    const activateSession = vi.fn(() => Promise.resolve());

    await completeHybridSignIn({
      activateSession,
      sessionId: "sess_biometric",
    });

    expect(activateSession).toHaveBeenCalledWith("sess_biometric");
  });

  test("password-origin completions also only activate the session", async () => {
    const activateSession = vi.fn(() => Promise.resolve());

    await completeHybridSignIn({
      activateSession,
      sessionId: "sess_password",
    });

    expect(activateSession).toHaveBeenCalledWith("sess_password");

    expect(
      resolveHybridSignInStep({
        status: "needs_second_factor",
        supportedSecondFactors: [{ strategy: "email_code" }],
      }),
    ).toEqual({
      emailAddressId: undefined,
      type: "needs_second_factor_email_code",
    });
  });
});
