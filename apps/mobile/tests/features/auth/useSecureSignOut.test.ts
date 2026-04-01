import { describe, expect, test, vi } from "vitest";

import { runSecureSignOutCleanup } from "@/features/auth/secureSignOutCleanup";

describe("runSecureSignOutCleanup", () => {
  test("clears app unlock enrollment and owned local credentials", async () => {
    const clearEnrollment = vi.fn(() => Promise.resolve());
    const clearLocalCredentials = vi.fn(() => Promise.resolve());

    await expect(
      runSecureSignOutCleanup({
        clearEnrollment,
        clearLocalCredentials,
        shouldClearLocalCredentials: true,
      }),
    ).resolves.toBeNull();

    expect(clearEnrollment).toHaveBeenCalledTimes(1);
    expect(clearLocalCredentials).toHaveBeenCalledTimes(1);
  });

  test("skips local credentials when they do not belong to the signed-in user", async () => {
    const clearEnrollment = vi.fn(() => Promise.resolve());
    const clearLocalCredentials = vi.fn(() => Promise.resolve());

    await expect(
      runSecureSignOutCleanup({
        clearEnrollment,
        clearLocalCredentials,
        shouldClearLocalCredentials: false,
      }),
    ).resolves.toBeNull();

    expect(clearEnrollment).toHaveBeenCalledTimes(1);
    expect(clearLocalCredentials).not.toHaveBeenCalled();
  });

  test("still attempts both cleanup steps and surfaces the first cleanup error", async () => {
    const clearEnrollment = vi.fn(() =>
      Promise.reject(new Error("unlock cleanup failed")),
    );
    const clearLocalCredentials = vi.fn(() => Promise.resolve());

    const cleanupError = await runSecureSignOutCleanup({
      clearEnrollment,
      clearLocalCredentials,
      shouldClearLocalCredentials: true,
    });

    expect(clearEnrollment).toHaveBeenCalledTimes(1);
    expect(clearLocalCredentials).toHaveBeenCalledTimes(1);
    expect(cleanupError).toEqual(new Error("unlock cleanup failed"));
  });
});
