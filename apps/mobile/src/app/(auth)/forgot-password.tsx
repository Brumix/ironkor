import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppTextField from "@/components/ui/AppTextField";
import { activateAuthSession } from "@/features/auth/activateAuthSession";
import AuthScreenShell from "@/features/auth/AuthScreenShell";
import { useSignIn } from "@/features/auth/clerkCompat";
import {
  getClerkFieldError,
  getClerkGlobalError,
  resolveAuthErrorMessage,
} from "@/features/auth/clerkErrors";
import { useTheme } from "@/theme";

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isLoaded, setActive, signIn } = useSignIn();

  const [emailAddress, setEmailAddress] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldStyles = useMemo(() => styles(theme), [theme]);

  async function sendCode() {
    if (!isLoaded || !emailAddress.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitError(null);
    try {
      const createResult = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: emailAddress.trim(),
      });

      const resetFactor = (createResult.supportedFirstFactors ?? []).find(
        (factor) => factor.strategy === "reset_password_email_code",
      );

      if (resetFactor) {
        await signIn.prepareFirstFactor({
          strategy: "reset_password_email_code",
          emailAddressId: resetFactor.emailAddressId,
        });
      }

      setCodeSent(true);
    } catch (caughtError: unknown) {
      setError(caughtError);
      setSubmitError(
        resolveAuthErrorMessage(
          caughtError,
          "We couldn't start password reset.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyCode() {
    if (!isLoaded || !code.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitError(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
      });

      if (result.status === "needs_new_password") {
        return;
      }

      setSubmitError(
        "That reset code wasn't accepted.",
      );
    } catch (caughtError: unknown) {
      setError(caughtError);
      setSubmitError(
        resolveAuthErrorMessage(
          caughtError,
          "That reset code wasn't accepted.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitNewPassword() {
    if (!isLoaded || !password) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitError(null);
    try {
      const result = await signIn.resetPassword({
        password,
        signOutOfOtherSessions: true,
      });

      if (result.status === "complete" && result.createdSessionId && setActive) {
        await activateAuthSession(setActive, result.createdSessionId, router);
        return;
      }

      if (result.status === "needs_second_factor") {
        setSubmitError(
          "Your account now requires a second factor. Finish the remaining security step before entering the workout app.",
        );
        return;
      }

      setSubmitError(
        "We couldn't finish signing you back in after resetting your password.",
      );
    } catch (caughtError: unknown) {
      setError(caughtError);
      setSubmitError(
        resolveAuthErrorMessage(
          caughtError,
          "We couldn't update your password.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const identifierError = getClerkFieldError(error, "identifier");
  const codeError = getClerkFieldError(error, "code");
  const passwordError = getClerkFieldError(error, "password");
  const globalError = submitError ?? getClerkGlobalError(error);
  const showResetForm = isLoaded && signIn.status === "needs_new_password";

  return (
    <AuthScreenShell
      eyebrow="Recover account"
      title="Reset your password"
      subtitle="We’ll send a secure reset code to the email tied to your Ironkor account."
      footer={
        <View style={fieldStyles.footerRow}>
          <Text style={fieldStyles.footerText}>Remembered it?</Text>
          <Link href="/sign-in" style={fieldStyles.footerLink}>
            Back to sign in
          </Link>
        </View>
      }
    >
      {!codeSent ? (
        <>
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
          {globalError ? <Text style={fieldStyles.errorText}>{globalError}</Text> : null}
          <AppButton
            fullWidth
            label="Send reset code"
            loading={isSubmitting}
            onPress={sendCode}
            variant="accent"
          />
        </>
      ) : !showResetForm ? (
        <>
          <AppTextField
            keyboardType="numeric"
            label="Verification code"
            onChangeText={setCode}
            placeholder="Enter the reset code"
            value={code}
          />
          {codeError ? <Text style={fieldStyles.errorText}>{codeError}</Text> : null}
          {globalError ? <Text style={fieldStyles.errorText}>{globalError}</Text> : null}
          <AppButton
            fullWidth
            label="Verify code"
            loading={isSubmitting}
            onPress={verifyCode}
            variant="accent"
          />
        </>
      ) : (
        <>
          <AppTextField
            autoCapitalize="none"
            autoCorrect={false}
            label="New password"
            onChangeText={setPassword}
            placeholder="Choose a new password"
            secureTextEntry
            textContentType="newPassword"
            value={password}
          />
          {passwordError ? <Text style={fieldStyles.errorText}>{passwordError}</Text> : null}
          {globalError ? <Text style={fieldStyles.errorText}>{globalError}</Text> : null}
          <AppButton
            fullWidth
            label="Set new password"
            loading={isSubmitting}
            onPress={submitNewPassword}
            variant="accent"
          />
        </>
      )}
    </AuthScreenShell>
  );
}

const styles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
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
  });
