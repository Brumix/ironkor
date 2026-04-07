import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  type AppStateStatus,
  Platform,
} from "react-native";

import {
  APP_UNLOCK_IDLE_TIMEOUT_MS,
  clearAppUnlockEnrollment,
  resolveAppUnlockErrorMessage,
  restoreAppUnlock,
  shouldRelock,
} from "@/features/auth/appUnlockStorage";
import { useAuth } from "@/features/auth/clerkCompat";
import {
  canSecureStoreUseBiometricAuthentication,
  getSecureStoreModule,
  isSecureStoreRuntimeAvailable,
} from "@/features/auth/secureStoreCompat";

export type AppUnlockStatus =
  | "checking"
  | "locked"
  | "unlocking"
  | "unavailable"
  | "unlocked";

interface AppUnlockContextValue {
  clearEnrollment: () => Promise<void>;
  errorMessage: string | null;
  isSupported: boolean;
  lock: () => void;
  status: AppUnlockStatus;
  unlock: () => Promise<boolean>;
}

const AppUnlockContext = createContext<AppUnlockContextValue | null>(null);

export function AppUnlockProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [status, setStatus] = useState<AppUnlockStatus>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isMountedRef = useRef(true);
  const lastBackgroundedAtRef = useRef<number | null>(null);
  const hasInitializedSignedInSessionRef = useRef(false);
  const secureStore = getSecureStoreModule();
  const secureStoreAdapter = useMemo(() => {
    if (!secureStore) {
      return null;
    }

    return {
      canUseBiometricAuthentication: canSecureStoreUseBiometricAuthentication,
      deleteItemAsync: secureStore.deleteItemAsync,
      getItemAsync: secureStore.getItemAsync,
      setItemAsync: secureStore.setItemAsync,
    };
  }, [secureStore]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearEnrollment = useCallback(async () => {
    if (!secureStoreAdapter || !secureStore) {
      return;
    }

    await clearAppUnlockEnrollment({
      platform: Platform.OS,
      store: secureStoreAdapter,
      whenPasscodeSetThisDeviceOnly: secureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });
  }, [secureStore, secureStoreAdapter]);

  const unlock = useCallback(async () => {
    if (!isLoaded) {
      if (isMountedRef.current) {
        setStatus("checking");
        setErrorMessage(null);
      }
      return false;
    }

    if (!isSignedIn) {
      if (isMountedRef.current) {
        setIsSupported(false);
        setStatus("unlocked");
        setErrorMessage(null);
      }
      return true;
    }

    if (!isSecureStoreRuntimeAvailable() || !secureStoreAdapter || !secureStore) {
      if (isMountedRef.current) {
        setIsSupported(false);
        setStatus("unavailable");
        setErrorMessage(null);
      }
      return true;
    }

    setStatus("unlocking");
    setErrorMessage(null);

    const result = await restoreAppUnlock({
      platform: Platform.OS,
      store: secureStoreAdapter,
      whenPasscodeSetThisDeviceOnly: secureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });

    if (!isMountedRef.current) {
      return result.status === "unlocked" || result.status === "unavailable";
    }

    switch (result.status) {
      case "unavailable":
        setIsSupported(false);
        setStatus("unavailable");
        return true;
      case "unlocked":
        setIsSupported(true);
        setStatus("unlocked");
        return true;
      case "locked":
        setIsSupported(true);
        setErrorMessage(resolveAppUnlockErrorMessage(result.error));
        setStatus("locked");
        return false;
    }
  }, [isLoaded, isSignedIn, secureStore, secureStoreAdapter]);

  const lock = useCallback(() => {
    if (!isLoaded || !isSignedIn || !isSupported) {
      return;
    }

    setStatus("locked");
  }, [isLoaded, isSignedIn, isSupported]);

  useEffect(() => {
    if (!isLoaded) {
      hasInitializedSignedInSessionRef.current = false;
      setStatus("checking");
      setErrorMessage(null);
      return;
    }

    if (!isSignedIn) {
      hasInitializedSignedInSessionRef.current = false;
      lastBackgroundedAtRef.current = null;
      setIsSupported(false);
      setStatus("unlocked");
      setErrorMessage(null);
      return;
    }

    if (hasInitializedSignedInSessionRef.current) {
      return;
    }

    hasInitializedSignedInSessionRef.current = true;
    void unlock();
  }, [isLoaded, isSignedIn, unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === "background" || nextAppState === "inactive") {
        lastBackgroundedAtRef.current = Date.now();
        return;
      }

      if (
        previousAppState !== "background" &&
        previousAppState !== "inactive"
      ) {
        return;
      }

      if (
        !isLoaded ||
        !isSignedIn ||
        !isSupported ||
        !shouldRelock({
          lastBackgroundedAt: lastBackgroundedAtRef.current,
          now: Date.now(),
        })
      ) {
        return;
      }

      lastBackgroundedAtRef.current = null;
      void unlock();
    });

    return () => {
      subscription.remove();
    };
  }, [isLoaded, isSignedIn, isSupported, unlock]);

  const value = useMemo<AppUnlockContextValue>(
    () => ({
      clearEnrollment,
      errorMessage,
      isSupported,
      lock,
      status,
      unlock,
    }),
    [clearEnrollment, errorMessage, isSupported, lock, status, unlock],
  );

  return (
    <AppUnlockContext.Provider value={value}>
      {children}
    </AppUnlockContext.Provider>
  );
}

export function useAppUnlock() {
  const context = useContext(AppUnlockContext);

  if (!context) {
    throw new Error("useAppUnlock must be used within an AppUnlockProvider.");
  }

  return context;
}

export { APP_UNLOCK_IDLE_TIMEOUT_MS };
