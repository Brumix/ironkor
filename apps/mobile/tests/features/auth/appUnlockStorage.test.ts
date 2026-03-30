import { describe, expect, test, vi } from "vitest";

import {
  APP_UNLOCK_KEY,
  APP_UNLOCK_VALUE,
  clearAppUnlockEnrollment,
  getAppUnlockDeleteOptions,
  getAppUnlockOptions,
  restoreAppUnlock,
  shouldRelock,
} from "@/features/auth/appUnlockStorage";

function createStore(overrides?: Partial<Parameters<typeof restoreAppUnlock>[0]["store"]>) {
  return {
    canUseBiometricAuthentication: vi.fn(() => true),
    deleteItemAsync: vi.fn(() => Promise.resolve()),
    getItemAsync: vi.fn(() => Promise.resolve(APP_UNLOCK_VALUE)),
    setItemAsync: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe("appUnlockStorage", () => {
  test("builds strict iOS options", () => {
    expect(
      getAppUnlockOptions({
        platform: "ios",
        whenPasscodeSetThisDeviceOnly: 99,
      }),
    ).toEqual({
      authenticationPrompt: "Unlock Ironkor",
      keychainAccessible: 99,
      requireAuthentication: true,
    });
  });

  test("deletes enrollment without forcing reauthentication", () => {
    expect(
      getAppUnlockDeleteOptions({
        platform: "ios",
        whenPasscodeSetThisDeviceOnly: 99,
      }),
    ).toEqual({
      keychainAccessible: 99,
    });
  });

  test("unlocks immediately when an enrollment already exists", async () => {
    const store = createStore();

    await expect(
      restoreAppUnlock({
        platform: "ios",
        store,
        whenPasscodeSetThisDeviceOnly: 99,
      }),
    ).resolves.toEqual({ status: "unlocked" });

    expect(store.getItemAsync).toHaveBeenCalledWith(APP_UNLOCK_KEY, {
      authenticationPrompt: "Unlock Ironkor",
      keychainAccessible: 99,
      requireAuthentication: true,
    });
    expect(store.setItemAsync).not.toHaveBeenCalled();
  });

  test("creates a new enrollment when none exists", async () => {
    const store = createStore({
      getItemAsync: vi.fn(() => Promise.resolve(null)),
    });

    await expect(
      restoreAppUnlock({
        platform: "android",
        store,
      }),
    ).resolves.toEqual({ status: "unlocked" });

    expect(store.setItemAsync).toHaveBeenCalledWith(APP_UNLOCK_KEY, APP_UNLOCK_VALUE, {
      authenticationPrompt: "Unlock Ironkor",
      requireAuthentication: true,
    });
  });

  test("returns unavailable when biometrics cannot be used", async () => {
    const store = createStore({
      canUseBiometricAuthentication: vi.fn(() => false),
    });

    await expect(
      restoreAppUnlock({
        platform: "android",
        store,
      }),
    ).resolves.toEqual({ status: "unavailable" });
  });

  test("locks when biometric verification fails", async () => {
    const store = createStore({
      getItemAsync: vi.fn(() => Promise.reject(new Error("User canceled authentication"))),
    });

    const result = await restoreAppUnlock({
      platform: "android",
      store,
    });

    expect(result.status).toBe("locked");
    if (result.status === "locked") {
      expect(result.error).toBeInstanceOf(Error);
    }
  });

  test("clears enrollment with the same storage key and options", async () => {
    const store = createStore();

    await clearAppUnlockEnrollment({
      platform: "ios",
      store,
      whenPasscodeSetThisDeviceOnly: 99,
    });

    expect(store.deleteItemAsync).toHaveBeenCalledWith(APP_UNLOCK_KEY, {
      keychainAccessible: 99,
    });
  });

  test("relocks only after the idle threshold", () => {
    expect(
      shouldRelock({
        lastBackgroundedAt: null,
        now: 1000,
      }),
    ).toBe(false);

    expect(
      shouldRelock({
        idleTimeoutMs: 1000,
        lastBackgroundedAt: 1000,
        now: 1500,
      }),
    ).toBe(false);

    expect(
      shouldRelock({
        idleTimeoutMs: 1000,
        lastBackgroundedAt: 1000,
        now: 2001,
      }),
    ).toBe(true);
  });
});
