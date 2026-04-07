interface ClerkTokenCacheLike {
  getToken: (key: string) => Promise<string | null>;
  saveToken: (key: string, token: string) => Promise<void>;
}

interface SecureStoreModuleLike {
  AFTER_FIRST_UNLOCK: number;
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: number;
  canUseBiometricAuthentication?: () => boolean;
  deleteItemAsync: (key: string, options?: object) => Promise<void>;
  getItemAsync: (key: string, options?: object) => Promise<string | null>;
  setItemAsync: (key: string, value: string, options?: object) => Promise<void>;
}

let secureStoreModule: SecureStoreModuleLike | null = null;
let secureStoreTokenCache: ClerkTokenCacheLike | undefined;
let secureStoreRuntimeError: unknown = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  secureStoreModule = require("expo-secure-store") as SecureStoreModuleLike;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tokenCacheModule = require("@clerk/clerk-expo/token-cache") as {
    tokenCache?: ClerkTokenCacheLike;
  };
  secureStoreTokenCache = tokenCacheModule.tokenCache;
} catch (error) {
  secureStoreRuntimeError = error;
}

export function getSecureStoreRuntimeError() {
  return secureStoreRuntimeError;
}

export function isSecureStoreRuntimeAvailable() {
  return secureStoreModule !== null;
}

export function getSecureStoreTokenCache() {
  return secureStoreTokenCache;
}

export function getSecureStoreModule() {
  return secureStoreModule;
}

export function canSecureStoreUseBiometricAuthentication() {
  if (!secureStoreModule?.canUseBiometricAuthentication) {
    return false;
  }

  try {
    return secureStoreModule.canUseBiometricAuthentication();
  } catch {
    return false;
  }
}
