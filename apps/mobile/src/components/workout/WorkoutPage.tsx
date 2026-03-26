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
  subtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  floatingAction?: ReactNode;
}

export default function WorkoutPage({ headerChip, subtitle, headerAction, children, floatingAction }: WorkoutPageProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const headerTitle = subtitle ?? headerChip.label;

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
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: theme.tokens.spacing.md,
        },
        headerLead: {
          flex: 1,
          gap: theme.tokens.spacing.sm,
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
            <View style={styles.headerLead}>
              <View style={styles.titleRow}>
                <View style={styles.chip}>
                  <Ionicons color={theme.colors.accent} name={headerChip.icon} size={14} />
                  <Text style={styles.chipLabel}>{headerChip.label}</Text>
                </View>
                <Text style={styles.title}>{headerTitle}</Text>
                {subtitle && subtitle !== headerTitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                {headerAction}
              </View>
            </View>
          </View>
        </Animated.View>
        {children}
      </ScrollView>

      {floatingAction}
    </View>
  );
}
