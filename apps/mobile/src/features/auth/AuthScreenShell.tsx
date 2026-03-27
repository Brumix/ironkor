import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import GradientCard from "@/components/ui/GradientCard";
import SafeScreen from "@/components/ui/SafeScreen";
import { useTheme } from "@/theme";

import type { ReactNode } from "react";

export default function AuthScreenShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { theme } = useTheme();
  const screenStyles = styles(theme);

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={screenStyles.root}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={screenStyles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GradientCard
            colors={[
              theme.gradients.heroAccentStart,
              theme.gradients.heroAccentEnd,
              theme.gradients.heroSecondary,
            ]}
          >
            <AppChip label={eyebrow} variant="neutral" />
            <Text style={screenStyles.heroTitle}>{title}</Text>
            <Text style={screenStyles.heroBody}>{subtitle}</Text>
          </GradientCard>

          <AppCard style={screenStyles.card} variant="highlight">
            {children}
          </AppCard>

          {footer ? <View style={screenStyles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    content: {
      paddingHorizontal: theme.tokens.spacing.lg,
      paddingVertical: theme.tokens.spacing.lg,
      gap: theme.tokens.spacing.lg,
      flexGrow: 1,
    },
    card: {
      gap: theme.tokens.spacing.md,
    },
    heroTitle: {
      color: theme.colors.heroText,
      fontFamily: theme.tokens.typography.fontFamily.display,
      fontSize: theme.tokens.typography.fontSize["4xl"],
      fontWeight: theme.tokens.typography.fontWeight.black,
      letterSpacing: theme.tokens.typography.letterSpacing.tight,
    },
    heroBody: {
      color: theme.colors.heroTextMuted,
      fontSize: theme.tokens.typography.fontSize.md,
      lineHeight:
        theme.tokens.typography.fontSize.md *
        theme.tokens.typography.lineHeight.relaxed,
    },
    footer: {
      gap: theme.tokens.spacing.xs,
    },
  });
