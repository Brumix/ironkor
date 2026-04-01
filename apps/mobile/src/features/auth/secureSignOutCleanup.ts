function normalizeCleanupError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

export async function runSecureSignOutCleanup({
  clearEnrollment,
  clearLocalCredentials,
  shouldClearLocalCredentials,
}: {
  clearEnrollment: () => Promise<void>;
  clearLocalCredentials: () => Promise<void>;
  shouldClearLocalCredentials: boolean;
}) {
  let cleanupError: Error | null = null;

  try {
    await clearEnrollment();
  } catch (error) {
    cleanupError = normalizeCleanupError(
      error,
      "We couldn't clear the local unlock enrollment.",
    );
  }

  if (shouldClearLocalCredentials) {
    try {
      await clearLocalCredentials();
    } catch (error) {
      cleanupError ??= normalizeCleanupError(
        error,
        "We couldn't clear biometric sign-in on this device.",
      );
    }
  }

  return cleanupError;
}
