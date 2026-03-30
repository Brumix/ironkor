import { Link, Redirect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppTextField from "@/components/ui/AppTextField";
import { activateAuthSession } from "@/features/auth/activateAuthSession";
import AuthScreenShell from "@/features/auth/AuthScreenShell";
import { useSignUp } from "@/features/auth/clerkCompat";
import {
  getClerkFieldError,
  getClerkGlobalError,
  resolveAuthFormErrorMessage,
} from "@/features/auth/clerkErrors";
import { useTheme } from "@/theme";

export default function VerifyEmailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const signUpState = useSignUp();
  const [code, setCode] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldStyles = useMemo(() => styles(theme), [theme]);
  if (!signUpState.isLoaded) {
    return <Redirect href="/sign-up" />;
  }

  const { setActive, signUp } = signUpState;
  const requiresEmailVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  if (!requiresEmailVerification) {
    return <Redirect href="/sign-up" />;
  }

  async function handleVerifyCode() {
    if (!code.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status === "complete" && result.createdSessionId && setActive) {
        await activateAuthSession(setActive, result.createdSessionId, router);
        return;
      }

      setSubmitError(
        "Your account still needs another verification step.",
      );
    } catch (caughtError: unknown) {
      setError(caughtError);
      setSubmitError(
        resolveAuthFormErrorMessage(
          caughtError,
          "That verification code wasn't accepted.",
          { excludeFields: ["code"] },
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setIsSubmitting(true);
    setError(null);
    setSubmitError(null);
    try {
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
    } catch (caughtError: unknown) {
      setError(caughtError);
      setSubmitError(
        resolveAuthFormErrorMessage(
          caughtError,
          "We couldn't resend the verification code.",
          { excludeFields: ["code"] },
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const codeError = getClerkFieldError(error, "code");
  const globalError =
    submitError ??
    getClerkGlobalError(error, {
      excludeFields: ["code"],
    });

  return (
    <AuthScreenShell
      eyebrow="Verify email"
      title="Almost there"
      subtitle="Enter the one-time code we sent to your inbox to activate your Ironkor account."
      footer={
        <View style={fieldStyles.footerRow}>
          <Text style={fieldStyles.footerText}>Typed the wrong email?</Text>
          <Link href="/sign-up" style={fieldStyles.footerLink}>
            Go back
          </Link>
        </View>
      }
    >
      <AppTextField
        keyboardType="numeric"
        label="Verification code"
        onChangeText={setCode}
        placeholder="Enter your code"
        value={code}
      />
      {codeError ? <Text style={fieldStyles.errorText}>{codeError}</Text> : null}
      {globalError ? <Text style={fieldStyles.errorText}>{globalError}</Text> : null}

      <AppButton
        fullWidth
        label="Verify email"
        loading={isSubmitting}
        onPress={handleVerifyCode}
        variant="accent"
      />
      <AppButton
        fullWidth
        label="Send a new code"
        loading={isSubmitting}
        onPress={handleResend}
        variant="secondary"
      />
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
