export type HybridSignInOrigin = "local-credentials" | "password" | null;
export type LocalCredentialBiometricType = "face-recognition" | "fingerprint";

export interface HybridSignInResult {
  createdSessionId?: string | null;
  status: string;
  supportedSecondFactors?: {
    emailAddressId?: string;
    strategy: string;
  }[];
}

export type HybridSignInStep =
  | {
      sessionId: string;
      type: "complete";
    }
  | {
      type: "needs_new_password";
    }
  | {
      emailAddressId?: string;
      type: "needs_second_factor_email_code";
    }
  | {
      type: "unsupported_second_factor";
    }
  | {
      type: "unsupported";
    };

export function getBiometricSignInLabel({
  biometricType,
  platform,
}: {
  biometricType: LocalCredentialBiometricType | null;
  platform: string;
}) {
  if (!biometricType) {
    return null;
  }

  if (biometricType === "face-recognition") {
    return platform === "ios"
      ? "Sign in with Face ID"
      : "Sign in with face recognition";
  }

  return platform === "ios"
    ? "Sign in with Touch ID"
    : "Sign in with fingerprint";
}

export function shouldShowBiometricSignInAction({
  biometricType,
  hasCredentials,
  isAwaitingSecondFactor,
}: {
  biometricType: LocalCredentialBiometricType | null;
  hasCredentials: boolean;
  isAwaitingSecondFactor: boolean;
}) {
  return hasCredentials && biometricType !== null && !isAwaitingSecondFactor;
}

export function resolveHybridSignInStep(
  result: HybridSignInResult,
): HybridSignInStep {
  if (result.status === "complete" && result.createdSessionId) {
    return {
      sessionId: result.createdSessionId,
      type: "complete",
    };
  }

  if (result.status === "needs_new_password") {
    return { type: "needs_new_password" };
  }

  if (result.status === "needs_second_factor") {
    const emailCodeFactor = result.supportedSecondFactors?.find(
      (factor) => factor.strategy === "email_code",
    );

    if (!emailCodeFactor) {
      return { type: "unsupported_second_factor" };
    }

    return {
      emailAddressId: emailCodeFactor.emailAddressId,
      type: "needs_second_factor_email_code",
    };
  }

  return { type: "unsupported" };
}

export async function completeHybridSignIn({
  activateSession,
  sessionId,
}: {
  activateSession: (sessionId: string) => Promise<void>;
  sessionId: string;
}) {
  await activateSession(sessionId);
}
