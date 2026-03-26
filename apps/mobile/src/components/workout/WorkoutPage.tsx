import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

import type { ReactNode } from "react";

interface WorkoutPageProps {
  headerChip: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  };
  title?: string | null;
  subtitle?: string;
  headerAction?: ReactNode;
  headerActionPosition?: "left" | "right";
  children: ReactNode;
}

export default function WorkoutPage({
  headerChip,
  title,
  subtitle,
  headerAction,
  headerActionPosition = "right",
  children,
}: WorkoutPageProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const headerTitle = title === undefined ? (subtitle ?? headerChip.label) : title;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        glowOverlay: {
          position: "absolute",
          top: -40,
          left: 0,
          right: 0,
          height: 260,
          pointerEvents: "none",
        },
        lowerGlowOverlay: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 180,
          pointerEvents: "none",
        },
        content: {
          paddingHorizontal: theme.tokens.spacing.xl,
          gap: theme.tokens.spacing.lg,
        },
        header: {
          marginBottom: theme.tokens.spacing.xs,
        },
        headerRow: {
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          gap: theme.tokens.spacing.md,
        },
        headerLead: {
          flex: 1,
          gap: theme.tokens.spacing.sm,
        },
        headerAction: {
          paddingTop: theme.tokens.spacing.xxs,
        },
        headerActionLeft: {
          paddingTop: theme.tokens.spacing.xs,
        },
        chip: {
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.xs,
          borderRadius: theme.tokens.radius.pill,
          borderWidth: 1,
          borderColor: theme.colors.borderAccent,
          backgroundColor: theme.colors.accentSoft,
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xs,
        },
        chipLabel: {
          color: theme.colors.accent,
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
        },
        title: {
          color: theme.colors.text,
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontSize: theme.tokens.typography.fontSize["4xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        subtitle: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.medium,
        },
        titleRow: {
          gap: theme.tokens.spacing.xs,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[theme.gradients.screenGlowTop, "transparent"]}
        pointerEvents="none"
        style={styles.glowOverlay}
      />
      <LinearGradient
        colors={["transparent", theme.gradients.screenGlowBottom]}
        pointerEvents="none"
        style={styles.lowerGlowOverlay}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + theme.tokens.spacing.lg,
            paddingBottom: insets.bottom + 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(theme.tokens.motion.normal).springify()} style={styles.header}>
          <View style={styles.headerRow}>
            {headerAction && headerActionPosition === "left" ? (
              <View style={[styles.headerAction, styles.headerActionLeft]}>{headerAction}</View>
            ) : null}
            <View style={styles.headerLead}>
              <View style={styles.titleRow}>
                <View style={styles.chip}>
                  <Ionicons color={theme.colors.accent} name={headerChip.icon} size={14} />
                  <Text style={styles.chipLabel}>{headerChip.label}</Text>
                </View>
                {headerTitle ? <Text style={styles.title}>{headerTitle}</Text> : null}
                {subtitle && subtitle !== headerTitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
            </View>
            {headerAction && headerActionPosition === "right" ? (
              <View style={styles.headerAction}>{headerAction}</View>
            ) : null}
          </View>
        </Animated.View>
        {children}
      </ScrollView>
    </View>
  );
}
