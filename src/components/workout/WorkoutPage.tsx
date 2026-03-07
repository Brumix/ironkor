import { Image } from "expo-image";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import mooseMascot from "@/assets/moose.png";
import { useTheme } from "@/theme";

import type { ImageSource } from "expo-image";
import type { ReactNode } from "react";

interface WorkoutPageProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  floatingAction?: ReactNode;
}

const mascotSource = mooseMascot as ImageSource;

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
        headerRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: theme.tokens.spacing.sm,
        },
        headingBlock: {
          flex: 1,
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
        mascotWrap: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.tokens.radius.md,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.tokens.spacing.xs,
          paddingTop: theme.tokens.spacing.xs,
          paddingBottom: theme.tokens.spacing.xxs + 1,
          alignItems: "center",
          gap: theme.tokens.spacing.xxs + 1,
        },
        mascot: {
          width: 46,
          height: 46,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        mascotLabel: {
          color: theme.colors.textMuted,
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
        },
        bandTop: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 70,
        },
        bandBottom: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 58,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.bandTop, { backgroundColor: theme.gradients.screenGlowTop }]} />
      <View style={[styles.bandBottom, { backgroundColor: theme.gradients.screenGlowBottom }]} />

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
          <View style={styles.headerRow}>
            <View style={styles.headingBlock}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <View style={styles.mascotWrap}>
              <Image contentFit="cover" source={mascotSource} style={styles.mascot} />
              <Text style={styles.mascotLabel}>Coach Moose</Text>
            </View>
          </View>
        </Animated.View>
        {children}
      </ScrollView>

      {floatingAction}
    </View>
  );
}
