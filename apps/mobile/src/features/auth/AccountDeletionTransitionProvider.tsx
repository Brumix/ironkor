import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/features/auth/clerkCompat";

interface AccountDeletionTransitionContextValue {
  beginAccountDeletionTransition: () => void;
  endAccountDeletionTransition: () => void;
  isAccountDeletionTransitioning: boolean;
}

const AccountDeletionTransitionContext =
  createContext<AccountDeletionTransitionContextValue | null>(null);

export function AccountDeletionTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const [isAccountDeletionTransitioning, setIsAccountDeletionTransitioning] =
    useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setIsAccountDeletionTransitioning(false);
    }
  }, [isLoaded, isSignedIn]);

  const beginAccountDeletionTransition = useCallback(() => {
    setIsAccountDeletionTransitioning(true);
  }, []);

  const endAccountDeletionTransition = useCallback(() => {
    setIsAccountDeletionTransitioning(false);
  }, []);

  const value = useMemo<AccountDeletionTransitionContextValue>(
    () => ({
      beginAccountDeletionTransition,
      endAccountDeletionTransition,
      isAccountDeletionTransitioning,
    }),
    [
      beginAccountDeletionTransition,
      endAccountDeletionTransition,
      isAccountDeletionTransitioning,
    ],
  );

  return (
    <AccountDeletionTransitionContext.Provider value={value}>
      {children}
    </AccountDeletionTransitionContext.Provider>
  );
}

export function useAccountDeletionTransition() {
  const context = useContext(AccountDeletionTransitionContext);

  if (!context) {
    throw new Error(
      "useAccountDeletionTransition must be used within AccountDeletionTransitionProvider.",
    );
  }

  return context;
}
