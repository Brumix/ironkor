import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import { activateAuthSession } from "@/features/auth/activateAuthSession";
import { getClerkSSORuntimeError, useSSO } from "@/features/auth/clerkCompat";
import { resolveAuthErrorMessage } from "@/features/auth/clerkErrors";
import { useTheme } from "@/theme";

export default function AuthSocialButtons() {
  const { theme } = useTheme();
  const buttonStyles = styles(theme);
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const ssoRuntimeError = getClerkSSORuntimeError();

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (ssoRuntimeError) {
    return (
      <View style={buttonStyles.section}>
        <Text style={buttonStyles.helper}>
          Social sign-in is temporarily unavailable in this client build. Continue with email and password.
        </Text>
      </View>
    );
  }

  async function handleGoogle() {
    if (isGoogleLoading) {
      return;
    }

    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
      });
      if (createdSessionId && setActive) {
        await activateAuthSession(setActive, createdSessionId, router);
      }
    } catch (error: unknown) {
      const message = resolveAuthErrorMessage(
        error,
        "Google sign-in could not be completed.",
      );
      if (!message.includes("canceled")) {
        setErrorMessage(
          ssoRuntimeError
            ? "Social sign-in needs a rebuilt native client with Expo auth modules available."
            : message,
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleApple() {
    if (Platform.OS !== "ios" || isAppleLoading) {
      return;
    }

    setErrorMessage(null);
    setIsAppleLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_apple",
      });
      if (createdSessionId && setActive) {
        await activateAuthSession(setActive, createdSessionId, router);
      }
    } catch (error: unknown) {
      const message = resolveAuthErrorMessage(
        error,
        "Apple sign-in could not be completed.",
      );
      if (!message.includes("canceled")) {
        setErrorMessage(
          ssoRuntimeError
            ? "Social sign-in needs a rebuilt native client with Expo auth modules available."
            : message,
        );
      }
    } finally {
      setIsAppleLoading(false);
    }
  }

  return (
    <View style={buttonStyles.section}>
      <AppButton
        icon={<Ionicons color={theme.colors.text} name="logo-google" size={18} />}
        label="Continue with Google"
        loading={isGoogleLoading}
        onPress={handleGoogle}
        size="md"
        variant="secondary"
        fullWidth
      />
      {Platform.OS === "ios" ? (
        <AppButton
          icon={<Ionicons color={theme.colors.text} name="logo-apple" size={18} />}
          label="Continue with Apple"
          loading={isAppleLoading}
          onPress={handleApple}
          size="md"
          variant="ghost"
          fullWidth
        />
      ) : null}
      {errorMessage ? <Text style={buttonStyles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    section: {
      gap: theme.tokens.spacing.sm,
    },
    error: {
      color: theme.colors.error,
      fontSize: theme.tokens.typography.fontSize.sm,
    },
    helper: {
      color: theme.colors.textMuted,
      fontSize: theme.tokens.typography.fontSize.sm,
      lineHeight:
        theme.tokens.typography.fontSize.sm *
        theme.tokens.typography.lineHeight.relaxed,
    },
  });
