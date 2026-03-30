export interface AppUnlockOptions {
  authenticationPrompt?: string;
  keychainAccessible?: number;
  requireAuthentication: boolean;
}

export interface AppUnlockDeleteOptions {
  keychainAccessible?: number;
}

export interface AppUnlockStore {
  canUseBiometricAuthentication: () => boolean;
  deleteItemAsync: (key: string, options?: AppUnlockDeleteOptions) => Promise<void>;
  getItemAsync: (key: string, options?: AppUnlockOptions) => Promise<string | null>;
  setItemAsync: (key: string, value: string, options?: AppUnlockOptions) => Promise<void>;
}

export type AppUnlockRestoreResult =
  | {
      status: "locked";
      error: unknown;
    }
  | {
      status: "unavailable" | "unlocked";
    };

export const APP_UNLOCK_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
export const APP_UNLOCK_KEY = "ironkor.auth.local_unlock";
export const APP_UNLOCK_VALUE = "enabled";
export const APP_UNLOCK_PROMPT = "Unlock Ironkor";

export function getAppUnlockOptions({
  platform,
  prompt = APP_UNLOCK_PROMPT,
  whenPasscodeSetThisDeviceOnly,
}: {
  platform: string;
  prompt?: string;
  whenPasscodeSetThisDeviceOnly?: number;
}): AppUnlockOptions {
  if (platform === "ios") {
    return {
      authenticationPrompt: prompt,
      keychainAccessible: whenPasscodeSetThisDeviceOnly,
      requireAuthentication: true,
    };
  }

  return {
    authenticationPrompt: prompt,
    requireAuthentication: true,
  };
}

export function getAppUnlockDeleteOptions({
  platform,
  whenPasscodeSetThisDeviceOnly,
}: {
  platform: string;
  whenPasscodeSetThisDeviceOnly?: number;
}): AppUnlockDeleteOptions {
  if (platform === "ios") {
    return {
      keychainAccessible: whenPasscodeSetThisDeviceOnly,
    };
  }

  return {};
}

export async function restoreAppUnlock({
  platform,
  store,
  whenPasscodeSetThisDeviceOnly,
}: {
  platform: string;
  store: AppUnlockStore;
  whenPasscodeSetThisDeviceOnly?: number;
}): Promise<AppUnlockRestoreResult> {
  if (!store.canUseBiometricAuthentication()) {
    return { status: "unavailable" };
  }

  const options = getAppUnlockOptions({
    platform,
    whenPasscodeSetThisDeviceOnly,
  });

  try {
    const storedValue = await store.getItemAsync(APP_UNLOCK_KEY, options);

    if (storedValue === APP_UNLOCK_VALUE) {
      return { status: "unlocked" };
    }

    await store.setItemAsync(APP_UNLOCK_KEY, APP_UNLOCK_VALUE, options);
    return { status: "unlocked" };
  } catch (error) {
    return {
      error,
      status: "locked",
    };
  }
}

export async function clearAppUnlockEnrollment({
  platform,
  store,
  whenPasscodeSetThisDeviceOnly,
}: {
  platform: string;
  store: AppUnlockStore;
  whenPasscodeSetThisDeviceOnly?: number;
}) {
  await store.deleteItemAsync(
    APP_UNLOCK_KEY,
    getAppUnlockDeleteOptions({
      platform,
      whenPasscodeSetThisDeviceOnly,
    }),
  );
}

export function shouldRelock({
  idleTimeoutMs = APP_UNLOCK_IDLE_TIMEOUT_MS,
  lastBackgroundedAt,
  now,
}: {
  idleTimeoutMs?: number;
  lastBackgroundedAt: number | null;
  now: number;
}) {
  if (lastBackgroundedAt === null) {
    return false;
  }

  return now - lastBackgroundedAt >= idleTimeoutMs;
}

export function resolveAppUnlockErrorMessage(error: unknown) {
  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : typeof error === "string" && error.trim().length > 0
        ? error
        : null;

  if (!message) {
    return "We couldn't verify your device identity. Try again.";
  }

  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes("cancel")) {
    return "Biometric unlock was cancelled. Try again to open Ironkor.";
  }

  if (normalizedMessage.includes("invalidate")) {
    return "Your biometric unlock changed on this device. Please verify again.";
  }

  return message;
}
