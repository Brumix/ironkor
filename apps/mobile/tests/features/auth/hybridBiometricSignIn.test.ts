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

  test("routes biometric sign-in completions through session activation without re-storing credentials", async () => {
    const activateSession = vi.fn(() => Promise.resolve());
    const setCredentials = vi.fn(() => Promise.resolve());

    await completeHybridSignIn({
      activateSession,
      localCredentials: { setCredentials },
      passwordCredentials: null,
      sessionId: "sess_biometric",
      signInOrigin: "local-credentials",
    });

    expect(activateSession).toHaveBeenCalledWith("sess_biometric");
    expect(setCredentials).not.toHaveBeenCalled();
  });

  test("stores local credentials only after a password-origin sign-in has completed", async () => {
    const activateSession = vi.fn(() => Promise.resolve());
    const setCredentials = vi.fn(() => Promise.resolve());

    await completeHybridSignIn({
      activateSession,
      localCredentials: { setCredentials },
      passwordCredentials: {
        identifier: "athlete@ironkor.app",
        password: "super-secret",
      },
      sessionId: "sess_password",
      signInOrigin: "password",
    });

    expect(activateSession).toHaveBeenCalledWith("sess_password");
    expect(setCredentials).toHaveBeenCalledWith({
      identifier: "athlete@ironkor.app",
      password: "super-secret",
    });

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
