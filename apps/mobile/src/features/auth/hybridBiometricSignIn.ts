export type HybridSignInOrigin = "local-credentials" | "password" | null;
export type LocalCredentialBiometricType = "face-recognition" | "fingerprint";

export interface PasswordCredentials {
  identifier: string;
  password: string;
}

export interface HybridSignInResult {
  createdSessionId?: string | null;
  status: string;
  supportedSecondFactors?: {
    emailAddressId?: string;
    strategy: string;
  }[];
}

export interface LocalCredentialsManager {
  setCredentials: (credentials: PasswordCredentials) => Promise<void>;
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
  localCredentials,
  passwordCredentials,
  sessionId,
  signInOrigin,
}: {
  activateSession: (sessionId: string) => Promise<void>;
  localCredentials?: LocalCredentialsManager | null;
  passwordCredentials: PasswordCredentials | null;
  sessionId: string;
  signInOrigin: HybridSignInOrigin;
}) {
  await activateSession(sessionId);

  if (
    signInOrigin !== "password" ||
    !passwordCredentials ||
    !localCredentials
  ) {
    return;
  }

  try {
    await localCredentials.setCredentials(passwordCredentials);
  } catch {
    // Local credential storage is additive; a completed sign-in should still succeed.
  }
}
