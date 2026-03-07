import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

import type { ReactNode } from "react";

interface WorkoutPageProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  floatingAction?: ReactNode;
}

export default function WorkoutPage({ title, subtitle, children, floatingAction }: WorkoutPageProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        content: {
          paddingHorizontal: theme.tokens.spacing.xl,
          gap: theme.tokens.spacing.md,
        },
        header: {
          marginBottom: theme.tokens.spacing.xs,
          gap: theme.tokens.spacing.xs,
        },
        title: {
          color: theme.colors.text,
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontSize: theme.tokens.typography.fontSize["4xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          lineHeight:
            theme.tokens.typography.fontSize["4xl"] * theme.tokens.typography.lineHeight.tight,
          letterSpacing: -0.6,
        },
        subtitle: {
          color: theme.colors.textMuted,
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
          maxWidth: "92%",
        },
        glowTop: {
          position: "absolute",
          top: -90,
          right: -70,
          width: 210,
          height: 210,
          borderRadius: 999,
        },
        glowBottom: {
          position: "absolute",
          bottom: 90,
          left: -60,
          width: 170,
          height: 170,
          borderRadius: 999,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.glowTop, { backgroundColor: theme.gradients.screenGlowTop }]} />
      <View style={[styles.glowBottom, { backgroundColor: theme.gradients.screenGlowBottom }]} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + theme.tokens.spacing.md,
            paddingBottom: insets.bottom + 132,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(theme.tokens.motion.normal)} style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
        {children}
      </ScrollView>

      {floatingAction}
    </View>
  );
}
