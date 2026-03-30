import { useCallback } from "react";

import { useAppUnlock } from "@/features/auth/AppUnlockProvider";
import { useAuth } from "@/features/auth/clerkCompat";

export function useSecureSignOut() {
  const { clearEnrollment } = useAppUnlock();
  const { signOut } = useAuth();

  return useCallback(async () => {
    let clearEnrollmentError: unknown = null;

    try {
      await clearEnrollment();
    } catch (error) {
      clearEnrollmentError = error;
    }

    await signOut();

    if (clearEnrollmentError) {
      throw clearEnrollmentError instanceof Error
        ? clearEnrollmentError
        : new Error("We couldn't clear the local unlock enrollment.");
    }
  }, [clearEnrollment, signOut]);
}
