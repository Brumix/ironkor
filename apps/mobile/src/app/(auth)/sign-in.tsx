import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppTextField from "@/components/ui/AppTextField";
import { captureAnalyticsEvent } from "@/config/posthog";
import { activateAuthSession } from "@/features/auth/activateAuthSession";
import AuthScreenShell from "@/features/auth/AuthScreenShell";
import AuthSocialButtons from "@/features/auth/AuthSocialButtons";
import { useLocalCredentials, useSignIn } from "@/features/auth/clerkCompat";
import {
  getClerkFieldError,
  getClerkGlobalError,
  resolveAuthFormErrorMessage,
} from "@/features/auth/clerkErrors";
import {
  completeHybridSignIn,
  getBiometricSignInLabel,
  resolveHybridSignInStep,
  shouldShowBiometricSignInAction,
} from "@/features/auth/hybridBiometricSignIn";
import { useTheme } from "@/theme";

export default function SignInScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isLoaded, setActive, signIn } = useSignIn();
  const localCredentials = useLocalCredentials();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionMode, setSubmissionMode] = useState<
    "local-credentials" | "password" | "second-factor" | null
  >(null);

  const fieldStyles = useMemo(() => styles(theme), [theme]);
  const showSecondFactor = isLoaded && signIn.status === "needs_second_factor";
  const showBiometricSignIn = shouldShowBiometricSignInAction({
    biometricType: localCredentials.biometricType,
    hasCredentials: localCredentials.hasCredentials,
    isAwaitingSecondFactor: showSecondFactor,
  });
  const biometricSignInLabel =
    getBiometricSignInLabel({
      biometricType: localCredentials.biometricType,
      platform: Platform.OS,
    }) ?? "Sign in with biometrics";

  async function handleSignInResult(
    result: Awaited<ReturnType<typeof signIn.create>>,
    method: "password" | "biometric" | "second-factor" = "password",
  ) {
    const nextStep = resolveHybridSignInStep(result);

    switch (nextStep.type) {
      case "complete":
        if (!setActive) {
          setSubmitError("This sign-in attempt completed, but the app can't activate the session yet.");
          return;
        }

        await completeHybridSignIn({
          activateSession: async (sessionId) => {
            await activateAuthSession(setActive, sessionId, router);
          },
          sessionId: nextStep.sessionId,
        });
        captureAnalyticsEvent("sign_in_completed", { method });
        return;
      case "needs_new_password":
        router.replace("/forgot-password");
        return;
      case "needs_second_factor_email_code":
        await signIn.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId: nextStep.emailAddressId,
        });
        setTwoFactorMessage("We sent a verification code to your email.");
        return;
      case "unsupported_second_factor":
        setTwoFactorMessage(
          "This account requires a second factor that isn't configured in the app yet. Complete it through Clerk and then sign in again.",
        );
        return;
      case "unsupported":
        setSubmitError(
          "This sign-in attempt is waiting on a step this screen doesn't recognize yet.",
        );
        return;
    }
  }

  async function handleSignIn() {
    if (!isLoaded || !emailAddress.trim() || !password) {
      return;
    }

    const trimmedIdentifier = emailAddress.trim();

    setSubmissionMode("password");
    setError(null);
    setSubmitError(null);
    setTwoFactorMessage(null);

    try {
      const result = await signIn.create({
        strategy: "password",
        identifier: trimmedIdentifier,
        password,
      });
      await handleSignInResult(result, "password");
    } catch (caughtError: unknown) {
      setError(caughtError);
      setSubmitError(
        resolveAuthFormErrorMessage(caughtError, "Sign-in failed. Please try again.", {
          excludeFields: ["identifier", "password"],
        }),
      );
    } finally {
      setSubmissionMode(null);
    }
  }

  async function handleVerifyEmailCode() {
    if (!isLoaded || !code.trim()) {
      return;
    }

    setSubmissionMode("second-factor");
    setError(null);
    setSubmitError(null);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code: code.trim(),
      });
      await handleSignInResult(result, "second-factor");
    } catch (caughtError: unknown) {
      setError(caughtError);
      setSubmitError(
        resolveAuthFormErrorMessage(
          caughtError,
          "The verification code wasn't accepted.",
          { excludeFields: ["code"] },
        ),
      );
    } finally {
      setSubmissionMode(null);
    }
  }

  async function handleBiometricSignIn() {
    if (!isLoaded) {
      return;
    }

    setSubmissionMode("local-credentials");
    setError(null);
    setSubmitError(null);
    setTwoFactorMessage(null);

    try {
      const result = await localCredentials.authenticate();
      await handleSignInResult(result, "biometric");
    } catch (caughtError: unknown) {
      setError(caughtError);
      setSubmitError(
        resolveAuthFormErrorMessage(
          caughtError,
          "Biometric sign-in failed. Use your password or try again.",
          {
            excludeFields: ["identifier", "password"],
          },
        ),
      );
    } finally {
      setSubmissionMode(null);
    }
  }

  const identifierError = getClerkFieldError(error, "identifier");
  const passwordError = getClerkFieldError(error, "password");
  const codeError = getClerkFieldError(error, "code");
  const globalError =
    submitError ??
    getClerkGlobalError(error, {
      excludeFields: ["identifier", "password", "code"],
    });
  const isSubmitting = submissionMode !== null;

  return (
    <AuthScreenShell
      eyebrow="Welcome back"
      title="Train with confidence"
      subtitle="Sign in to sync your routines, custom exercises, and active plan across your device."
      footer={
        <View style={fieldStyles.footerRow}>
          <Text style={fieldStyles.footerText}>Need an account?</Text>
          <Link href="/sign-up" style={fieldStyles.footerLink}>
            Create one
          </Link>
        </View>
      }
    >
      <AuthSocialButtons />

      {showBiometricSignIn ? (
        <AppButton
          disabled={isSubmitting && submissionMode !== "local-credentials"}
          fullWidth
          label={biometricSignInLabel}
          loading={submissionMode === "local-credentials"}
          onPress={handleBiometricSignIn}
          variant="secondary"
        />
      ) : null}

      <View style={fieldStyles.dividerRow}>
        <View style={fieldStyles.dividerLine} />
        <Text style={fieldStyles.dividerText}>or use email</Text>
        <View style={fieldStyles.dividerLine} />
      </View>

      <AppTextField
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        label="Email address"
        onChangeText={setEmailAddress}
        placeholder="you@ironkor.app"
        textContentType="emailAddress"
        value={emailAddress}
      />
      {identifierError ? <Text style={fieldStyles.errorText}>{identifierError}</Text> : null}

      <AppTextField
        autoCapitalize="none"
        autoCorrect={false}
        label="Password"
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry
        textContentType="password"
        value={password}
      />
      {passwordError ? <Text style={fieldStyles.errorText}>{passwordError}</Text> : null}

      {showSecondFactor ? (
        <>
          <AppTextField
            keyboardType="numeric"
            label="Verification code"
            onChangeText={setCode}
            placeholder="Enter the code we emailed"
            value={code}
          />
          {codeError ? <Text style={fieldStyles.errorText}>{codeError}</Text> : null}
        </>
      ) : null}

      {twoFactorMessage ? <Text style={fieldStyles.helperText}>{twoFactorMessage}</Text> : null}
      {globalError ? <Text style={fieldStyles.errorText}>{globalError}</Text> : null}

      <AppButton
        disabled={
          isSubmitting &&
          submissionMode !== "password" &&
          submissionMode !== "second-factor"
        }
        fullWidth
        label={showSecondFactor ? "Verify code" : "Sign in"}
        loading={
          submissionMode === "password" || submissionMode === "second-factor"
        }
        onPress={showSecondFactor ? handleVerifyEmailCode : handleSignIn}
        variant="accent"
      />

      <Link href="/forgot-password" style={fieldStyles.secondaryLink}>
        Forgot your password?
      </Link>
    </AuthScreenShell>
  );
}

const styles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    dividerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.tokens.spacing.sm,
    },
    dividerLine: {
      backgroundColor: theme.colors.borderSoft,
      flex: 1,
      height: 1,
    },
    dividerText: {
      color: theme.colors.textSubtle,
      fontSize: theme.tokens.typography.fontSize.xs,
      fontWeight: theme.tokens.typography.fontWeight.semibold,
      letterSpacing: theme.tokens.typography.letterSpacing.wide,
      textTransform: "uppercase",
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.tokens.typography.fontSize.sm,
    },
    footerLink: {
      color: theme.colors.accent,
      fontSize: theme.tokens.typography.fontSize.sm,
      fontWeight: theme.tokens.typography.fontWeight.bold,
    },
    footerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.tokens.spacing.xs,
      justifyContent: "center",
    },
    footerText: {
      color: theme.colors.textMuted,
      fontSize: theme.tokens.typography.fontSize.sm,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: theme.tokens.typography.fontSize.sm,
      lineHeight:
        theme.tokens.typography.fontSize.sm *
        theme.tokens.typography.lineHeight.relaxed,
    },
    secondaryLink: {
      alignSelf: "center",
      color: theme.colors.textMuted,
      fontSize: theme.tokens.typography.fontSize.sm,
      fontWeight: theme.tokens.typography.fontWeight.semibold,
    },
  });
