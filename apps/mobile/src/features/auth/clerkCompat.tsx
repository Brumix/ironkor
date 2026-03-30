import type { ClerkProviderProps as ClerkExpoProviderProps } from "@clerk/clerk-expo/dist/provider/ClerkProvider";
import type { ComponentType, ReactNode } from "react";

export interface ClerkFieldError {
  longMessage?: string;
  message?: string;
  meta?: unknown;
}

export interface ClerkAPIResponseErrorShape {
  errors: ClerkFieldError[];
}

interface AuthState {
  getToken: (options?: { skipCache?: boolean; template?: string }) => Promise<string | null>;
  isLoaded: boolean;
  isSignedIn: boolean;
  orgId: string | null;
  orgRole: string | null;
  sessionClaims: {
    aud?: string | string[] | null;
  } | null;
  signOut: () => Promise<void>;
}

interface SessionLike {
  currentTask?: {
    key: string;
  };
}

interface EmailAddressLike {
  emailAddress: string;
}

interface ExternalAccountLike {
  provider: string;
}

interface UserLike {
  externalAccounts: ExternalAccountLike[];
  fullName: string | null;
  hasImage: boolean;
  imageUrl: string;
  passwordEnabled: boolean;
  primaryEmailAddress: EmailAddressLike | null;
  verifiedExternalAccounts?: ExternalAccountLike[];
}

interface SessionState {
  isLoaded: boolean;
  session: SessionLike | null;
}

type UserState =
  | {
      isLoaded: false;
      isSignedIn: undefined;
      user: undefined;
    }
  | {
      isLoaded: true;
      isSignedIn: false;
      user: null;
    }
  | {
      isLoaded: true;
      isSignedIn: true;
      user: UserLike;
    };

interface ClerkClientLike {
  lastAuthenticationStrategy: string | null;
}

interface ClerkState {
  client: ClerkClientLike | undefined;
  loaded: boolean;
}

interface SupportedSecondFactor {
  strategy: string;
  emailAddressId?: string;
}

interface SupportedFirstFactor {
  strategy: string;
  emailAddressId?: string;
}

interface SignInResult {
  status: string;
  createdSessionId?: string | null;
  supportedSecondFactors?: SupportedSecondFactor[];
  supportedFirstFactors?: SupportedFirstFactor[];
}

interface SignInResource {
  createdSessionId?: string | null;
  firstFactorVerification?: {
    externalVerificationRedirectURL?: URL | { toString: () => string };
    status?: string;
  };
  status?: string;
  create: (params: {
    strategy: string;
    identifier?: string;
    password?: string;
    redirectUrl?: string;
  }) => Promise<SignInResult>;
  prepareSecondFactor: (params: {
    strategy: string;
    emailAddressId?: string;
  }) => Promise<unknown>;
  attemptSecondFactor: (params: {
    strategy: string;
    code: string;
  }) => Promise<SignInResult>;
  prepareFirstFactor: (params: {
    strategy: string;
    emailAddressId?: string;
  }) => Promise<unknown>;
  attemptFirstFactor: (params: {
    strategy: string;
    code: string;
  }) => Promise<SignInResult>;
  reload: (params: {
    rotatingTokenNonce: string;
  }) => Promise<unknown>;
  resetPassword: (params: {
    password: string;
    signOutOfOtherSessions: boolean;
  }) => Promise<SignInResult>;
}

interface SignInState {
  isLoaded: boolean;
  signIn: SignInResource;
  setActive?: (params: {
    session: string;
    navigate: ({ session }: { session: SessionLike }) => void | Promise<void>;
  }) => Promise<void>;
}

interface SignUpResult {
  status: string;
  createdSessionId?: string | null;
}

interface SignUpResource {
  createdSessionId?: string | null;
  status: string;
  unverifiedFields: string[];
  missingFields: string[];
  create: (params: {
    emailAddress?: string;
    password?: string;
    transfer?: boolean;
    unsafeMetadata?: unknown;
  }) => Promise<SignUpResult>;
  prepareEmailAddressVerification: (params: {
    strategy: string;
  }) => Promise<unknown>;
  attemptEmailAddressVerification: (params: {
    code: string;
  }) => Promise<SignUpResult>;
}

interface SignUpState {
  isLoaded: boolean;
  signUp: SignUpResource;
  setActive?: (params: {
    session: string;
    navigate: ({ session }: { session: SessionLike }) => void | Promise<void>;
  }) => Promise<void>;
}

interface SSOResult {
  createdSessionId: string | null;
  authSessionResult: unknown;
  setActive?: SignInState["setActive"];
  signIn?: unknown;
  signUp?: unknown;
}

interface SSOStartParams {
  authSessionOptions?: {
    showInRecents?: boolean;
  };
  identifier?: string;
  redirectUrl?: string;
  strategy: string;
  unsafeMetadata?: unknown;
}

interface ClerkExpoRuntimeModule {
  ClerkProvider: ComponentType<ClerkExpoProviderProps>;
  useAuth: () => AuthState;
  useClerk: () => ClerkState;
  useSession: () => SessionState;
  useSignIn: () => SignInState;
  useSignUp: () => SignUpState;
  useSSO: () => {
    startSSOFlow: (params: SSOStartParams) => Promise<SSOResult>;
  };
  useUser: () => UserState;
}

interface ClerkErrorRuntimeModule {
  isClerkAPIResponseError: (error: unknown) => boolean;
}

interface ConvexClerkProviderProps {
  children: ReactNode;
  client: unknown;
  useAuth: () => AuthState;
}

interface ConvexClerkRuntimeModule {
  ConvexProviderWithClerk: ComponentType<ConvexClerkProviderProps>;
}

let clerkExpoModule: ClerkExpoRuntimeModule | null = null;
let clerkErrorModule: ClerkErrorRuntimeModule | null = null;
let convexClerkModule: ConvexClerkRuntimeModule | null = null;
let clerkRuntimeError: unknown = null;
let clerkSSORuntimeError: unknown = null;

function rejectUnavailable() {
  return Promise.reject(new Error("Clerk auth is unavailable in this native client."));
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  clerkExpoModule = require("@clerk/clerk-expo") as ClerkExpoRuntimeModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  clerkErrorModule = require("@clerk/clerk-react/errors") as ClerkErrorRuntimeModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  convexClerkModule = require("convex/react-clerk") as ConvexClerkRuntimeModule;
} catch (error) {
  clerkRuntimeError = error;
}

const authFallback: AuthState = {
  getToken: () => Promise.resolve(null),
  isLoaded: false,
  isSignedIn: false,
  orgId: null,
  orgRole: null,
  sessionClaims: null,
  signOut: () => Promise.resolve(),
};

const sessionFallback: SessionState = {
  isLoaded: false,
  session: null,
};

const userFallback: UserState = {
  isLoaded: false,
  isSignedIn: undefined,
  user: undefined,
};

const clerkFallback: ClerkState = {
  client: undefined,
  loaded: false,
};

const signInFallback: SignInState = {
  isLoaded: false,
  signIn: {
    status: undefined,
    create: rejectUnavailable,
    prepareSecondFactor: rejectUnavailable,
    attemptSecondFactor: rejectUnavailable,
    prepareFirstFactor: rejectUnavailable,
    attemptFirstFactor: rejectUnavailable,
    reload: rejectUnavailable,
    resetPassword: rejectUnavailable,
  },
  setActive: undefined,
};

const signUpFallback: SignUpState = {
  isLoaded: false,
  signUp: {
    status: "missing_requirements",
    unverifiedFields: [],
    missingFields: [],
    create: rejectUnavailable,
    prepareEmailAddressVerification: rejectUnavailable,
    attemptEmailAddressVerification: rejectUnavailable,
  },
  setActive: undefined,
};

export function getClerkRuntimeError() {
  return clerkRuntimeError;
}

export function isClerkRuntimeAvailable() {
  return clerkExpoModule !== null && clerkErrorModule !== null && convexClerkModule !== null;
}

export function getClerkSSORuntimeError() {
  return clerkSSORuntimeError;
}

export function useAuth() {
  if (!clerkExpoModule) {
    return authFallback;
  }

  return clerkExpoModule.useAuth();
}

export function useSession() {
  if (!clerkExpoModule) {
    return sessionFallback;
  }

  return clerkExpoModule.useSession();
}

export function useUser() {
  if (!clerkExpoModule) {
    return userFallback;
  }

  return clerkExpoModule.useUser();
}

export function useClerk() {
  if (!clerkExpoModule) {
    return clerkFallback;
  }

  return clerkExpoModule.useClerk();
}

export function useSignIn() {
  if (!clerkExpoModule) {
    return signInFallback;
  }

  return clerkExpoModule.useSignIn();
}

export function useSignUp() {
  if (!clerkExpoModule) {
    return signUpFallback;
  }

  return clerkExpoModule.useSignUp();
}

export function useSSO() {
  if (!clerkExpoModule) {
    return {
      startSSOFlow: (): Promise<SSOResult> => {
        const error =
          clerkRuntimeError instanceof Error
            ? clerkRuntimeError
            : new Error("Clerk auth is unavailable in this native client.");
        clerkSSORuntimeError = error;
        return Promise.reject(error);
      },
    };
  }

  const { startSSOFlow } = clerkExpoModule.useSSO();

  return {
    startSSOFlow: async (params: SSOStartParams): Promise<SSOResult> => {
      try {
        const result = await startSSOFlow(params);
        clerkSSORuntimeError = null;
        return result;
      } catch (error) {
        clerkSSORuntimeError = error;
        throw error;
      }
    },
  };
}

export function isClerkAPIResponseError(error: unknown): error is ClerkAPIResponseErrorShape {
  if (!clerkErrorModule) {
    return false;
  }

  return clerkErrorModule.isClerkAPIResponseError(error);
}

export function ClerkProvider({
  ...props
}: ClerkExpoProviderProps) {
  if (!clerkExpoModule) {
    return <>{props.children}</>;
  }

  const Provider = clerkExpoModule.ClerkProvider;
  return <Provider {...props}>{props.children}</Provider>;
}

export function ConvexProviderWithClerk({
  children,
  client,
  useAuth: useAuthProp,
}: {
  children: ReactNode;
  client: unknown;
  useAuth: typeof useAuth;
}) {
  if (!convexClerkModule) {
    return <>{children}</>;
  }

  const Provider = convexClerkModule.ConvexProviderWithClerk;
  return (
    <Provider client={client as never} useAuth={useAuthProp as never}>
      {children}
    </Provider>
  );
}
