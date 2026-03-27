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

interface SessionState {
  isLoaded: boolean;
  session: SessionLike | null;
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

interface ClerkProviderShimProps {
  children: ReactNode;
  publishableKey: string;
  taskUrls?: Record<string, string>;
}

interface ClerkExpoRuntimeModule {
  ClerkProvider: ComponentType<ClerkProviderShimProps>;
  useAuth: () => AuthState;
}

interface ClerkReactRuntimeModule {
  useSession: () => SessionState;
  useSignIn: () => SignInState;
  useSignUp: () => SignUpState;
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
let clerkReactModule: ClerkReactRuntimeModule | null = null;
let clerkErrorModule: ClerkErrorRuntimeModule | null = null;
let convexClerkModule: ConvexClerkRuntimeModule | null = null;
let clerkRuntimeError: unknown = null;
let clerkSSORuntimeError: unknown = null;

function rejectUnavailable() {
  return Promise.reject(new Error("Clerk auth is unavailable in this native client."));
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  clerkExpoModule = require("@clerk/clerk-expo/dist/provider/ClerkProvider") as ClerkExpoRuntimeModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clerkAuthModule = require("@clerk/clerk-expo/dist/hooks/useAuth") as Pick<
    ClerkExpoRuntimeModule,
    "useAuth"
  >;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  clerkReactModule = require("@clerk/clerk-react") as ClerkReactRuntimeModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  clerkErrorModule = require("@clerk/clerk-react/errors") as ClerkErrorRuntimeModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  convexClerkModule = require("convex/react-clerk") as ConvexClerkRuntimeModule;
  clerkExpoModule.useAuth = clerkAuthModule.useAuth;
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
  return (
    clerkExpoModule !== null &&
    clerkReactModule !== null &&
    clerkErrorModule !== null &&
    convexClerkModule !== null
  );
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
  if (!clerkReactModule) {
    return sessionFallback;
  }

  return clerkReactModule.useSession();
}

export function useSignIn() {
  if (!clerkReactModule) {
    return signInFallback;
  }

  return clerkReactModule.useSignIn();
}

export function useSignUp() {
  if (!clerkReactModule) {
    return signUpFallback;
  }

  return clerkReactModule.useSignUp();
}

export function useSSO() {
  const { isLoaded: isSignInLoaded, setActive, signIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();

  return {
    startSSOFlow: async ({
      strategy,
    }: {
      strategy: string;
    }): Promise<SSOResult> => {
      if (!isSignInLoaded || !isSignUpLoaded) {
        return {
          createdSessionId: null,
          authSessionResult: null,
          setActive,
          signIn,
          signUp,
        };
      }

      try {
        const WebBrowser = await import("expo-web-browser");
        const Linking = await import("expo-linking");
        const redirectUrl = Linking.createURL("sso-callback");

        await signIn.create({
          strategy,
          redirectUrl,
        });

        const externalVerificationRedirectURL =
          signIn.firstFactorVerification?.externalVerificationRedirectURL;

        if (!externalVerificationRedirectURL) {
          throw new Error("Missing external verification redirect URL for SSO flow.");
        }

        const authSessionResult = await WebBrowser.openAuthSessionAsync(
          externalVerificationRedirectURL.toString(),
          redirectUrl,
        );

        if (authSessionResult.type !== "success" || !authSessionResult.url) {
          return {
            createdSessionId: null,
            authSessionResult,
            setActive,
            signIn,
            signUp,
          };
        }

        const params = new URL(authSessionResult.url).searchParams;
        const rotatingTokenNonce = params.get("rotating_token_nonce") ?? "";

        await signIn.reload({
          rotatingTokenNonce,
        });

        if (signIn.firstFactorVerification?.status === "transferable") {
          await signUp.create({
            transfer: true,
          });
        }

        clerkSSORuntimeError = null;

        return {
          createdSessionId: signUp.createdSessionId ?? signIn.createdSessionId ?? null,
          authSessionResult,
          setActive,
          signIn,
          signUp,
        };
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
  children,
  ...props
}: {
  children: ReactNode;
  publishableKey: string;
  taskUrls?: Record<string, string>;
}) {
  if (!clerkExpoModule) {
    return <>{children}</>;
  }

  const Provider = clerkExpoModule.ClerkProvider;
  return <Provider {...props}>{children}</Provider>;
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
