import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import AppTextField from "@/components/ui/AppTextField";
import { activateAuthSession } from "@/features/auth/activateAuthSession";
import AuthScreenShell from "@/features/auth/AuthScreenShell";
import AuthSocialButtons from "@/features/auth/AuthSocialButtons";
import { useSignIn } from "@/features/auth/clerkCompat";
import {
  getClerkFieldError,
  getClerkGlobalError,
  resolveAuthErrorMessage,
} from "@/features/auth/clerkErrors";
import { useTheme } from "@/theme";

export default function SignInScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isLoaded, setActive, signIn } = useSignIn();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldStyles = useMemo(() => styles(theme), [theme]);

  async function handleSignIn() {
    if (!isLoaded || !emailAddress.trim() || !password) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitError(null);
    setTwoFactorMessage(null);

    try {
      const result = await signIn.create({
        strategy: "password",
        identifier: emailAddress.trim(),
        password,
      });

      if (result.status === "complete" && result.createdSessionId && setActive) {
        await activateAuthSession(setActive, result.createdSessionId, router);
        return;
      }

      if (result.status === "needs_new_password") {
        router.replace("/forgot-password");
        return;
      }

      if (result.status === "needs_second_factor") {
        const emailCodeFactor = result.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );

        if (!emailCodeFactor) {
          setTwoFactorMessage(
            "This account requires a second factor that isn't configured in the app yet. Complete it through Clerk and then sign in again.",
          );
          return;
        }

        await signIn.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId:
            "emailAddressId" in emailCodeFactor
              ? emailCodeFactor.emailAddressId
              : undefined,
        });
        setTwoFactorMessage("We sent a verification code to your email.");
        return;
      }

      setSubmitError(
        "This sign-in attempt is waiting on a step this screen doesn't recognize yet.",
      );
    } catch (caughtError: unknown) {
      setError(caughtError);
      setSubmitError(
        resolveAuthErrorMessage(caughtError, "Sign-in failed. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyEmailCode() {
    if (!isLoaded || !code.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitError(null);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code: code.trim(),
      });

      if (result.status === "complete" && result.createdSessionId && setActive) {
        await activateAuthSession(setActive, result.createdSessionId, router);
        return;
      }

      setSubmitError(
        "We couldn't complete the second-factor sign-in.",
      );
    } catch (caughtError: unknown) {
      setError(caughtError);
      setSubmitError(
        resolveAuthErrorMessage(
          caughtError,
          "The verification code wasn't accepted.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const showSecondFactor = isLoaded && signIn.status === "needs_second_factor";
  const identifierError = getClerkFieldError(error, "identifier");
  const passwordError = getClerkFieldError(error, "password");
  const codeError = getClerkFieldError(error, "code");
  const globalError = submitError ?? getClerkGlobalError(error);

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
      <AuthSocialButtons
        onAuthenticated={() => {
          router.replace("/(workout)/home");
        }}
      />

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
        fullWidth
        label={showSecondFactor ? "Verify code" : "Sign in"}
        loading={isSubmitting}
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
