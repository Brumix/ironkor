import { useCallback } from "react";

import { useAppUnlock } from "@/features/auth/AppUnlockProvider";
import { useAuth, useLocalCredentials } from "@/features/auth/clerkCompat";
import { runSecureSignOutCleanup } from "@/features/auth/secureSignOutCleanup";

export function useSecureSignOut() {
  const { clearEnrollment } = useAppUnlock();
  const { clearCredentials, userOwnsCredentials } = useLocalCredentials();
  const { signOut } = useAuth();

  return useCallback(async () => {
    const cleanupError = await runSecureSignOutCleanup({
      clearEnrollment,
      clearLocalCredentials: clearCredentials,
      shouldClearLocalCredentials: userOwnsCredentials === true,
    });

    await signOut();

    if (cleanupError) {
      throw cleanupError;
    }
  }, [clearCredentials, clearEnrollment, signOut, userOwnsCredentials]);
}
