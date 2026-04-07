import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppTextField from "@/components/ui/AppTextField";
import { captureAnalyticsEvent } from "@/config/posthog";
import { activateAuthSession } from "@/features/auth/activateAuthSession";
import AuthScreenShell from "@/features/auth/AuthScreenShell";
import AuthSocialButtons from "@/features/auth/AuthSocialButtons";
import { useSignUp } from "@/features/auth/clerkCompat";
import {
  getClerkFieldError,
  getClerkGlobalError,
  resolveAuthFormErrorMessage,
} from "@/features/auth/clerkErrors";
import { useTheme } from "@/theme";

export default function SignUpScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isLoaded, setActive, signUp } = useSignUp();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didAttemptSubmit, setDidAttemptSubmit] = useState(false);
  const fieldStyles = useMemo(() => styles(theme), [theme]);
  const confirmPasswordError =
    confirmPassword.length > 0
      ? password === confirmPassword
        ? null
        : "Passwords do not match."
      : didAttemptSubmit
        ? "Please confirm your password."
        : null;
  const isCreateAccountDisabled =
    isSubmitting ||
    !emailAddress.trim() ||
    !password ||
    !confirmPassword ||
    password !== confirmPassword;

  async function handleCreateAccount() {
    setDidAttemptSubmit(true);

    if (!isLoaded || !emailAddress.trim() || !password || !confirmPassword) {
      return;
    }

    if (password !== confirmPassword) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitError(null);

    try {
      const result = await signUp.create({
        emailAddress: emailAddress.trim(),
        password,
      });

      captureAnalyticsEvent("sign_up_submitted", {
        method: "email",
      });

      if (result.status === "complete" && result.createdSessionId && setActive) {
        await activateAuthSession(setActive, result.createdSessionId, router);
        return;
      }

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      router.push("/verify-email");
    } catch (caughtError: unknown) {
      setError(caughtError);
      setSubmitError(
        resolveAuthFormErrorMessage(caughtError, "We couldn't create your account.", {
          excludeFields: ["emailAddress", "password"],
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const emailError = getClerkFieldError(error, "emailAddress");
  const passwordError = getClerkFieldError(error, "password");
  const globalError =
    submitError ??
    getClerkGlobalError(error, {
      excludeFields: ["emailAddress", "password"],
    });

  return (
    <AuthScreenShell
      eyebrow="Create account"
      title="Build your private training space"
      subtitle="Use Ironkor to keep routines and custom exercises tied to your account from day one."
      footer={
        <View style={fieldStyles.footerRow}>
          <Text style={fieldStyles.footerText}>Already have an account?</Text>
          <Link href="/sign-in" style={fieldStyles.footerLink}>
            Sign in
          </Link>
        </View>
      }
    >
      <AuthSocialButtons />

      <View style={fieldStyles.dividerRow}>
        <View style={fieldStyles.dividerLine} />
        <Text style={fieldStyles.dividerText}>or sign up with email</Text>
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
      {emailError ? <Text style={fieldStyles.errorText}>{emailError}</Text> : null}

      <AppTextField
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        label="Password"
        onChangeText={setPassword}
        passwordRules="minlength: 8;"
        placeholder="Create a strong password"
        secureTextEntry
        textContentType="newPassword"
        value={password}
      />
      {passwordError ? <Text style={fieldStyles.errorText}>{passwordError}</Text> : null}

      <AppTextField
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        label="Confirm password"
        onChangeText={setConfirmPassword}
        placeholder="Re-enter your password"
        secureTextEntry
        textContentType="none"
        value={confirmPassword}
      />
      {confirmPasswordError ? (
        <Text style={fieldStyles.errorText}>{confirmPasswordError}</Text>
      ) : null}

      <Text style={fieldStyles.helperText}>
        We’ll email you a one-time verification code right after this step.
      </Text>
      {globalError ? <Text style={fieldStyles.errorText}>{globalError}</Text> : null}

      <AppButton
        disabled={isCreateAccountDisabled}
        fullWidth
        label="Create account"
        loading={isSubmitting}
        onPress={handleCreateAccount}
        variant="accent"
      />

      <View nativeID="clerk-captcha" />
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
  });
