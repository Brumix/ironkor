import Ionicons from "@expo/vector-icons/Ionicons";
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
  headerChip: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  };
  headerAction?: ReactNode;
  children: ReactNode;
  floatingAction?: ReactNode;
}

const mascotSource = mooseMascot as ImageSource;

export default function WorkoutPage({ headerChip, headerAction, children, floatingAction }: WorkoutPageProps) {
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
          marginBottom: theme.tokens.spacing.sm,
        },
        headerRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
        },
        headerLead: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
        },
        chip: {
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.xs,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1.5,
          borderTopColor: theme.isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          borderLeftColor: theme.isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          borderRightColor: theme.isDark ? "rgba(0,0,0,0.58)" : "#D2D8E2",
          borderBottomColor: theme.isDark ? "rgba(0,0,0,0.58)" : "#D2D8E2",
          borderRadius: theme.tokens.radius.pill,
          backgroundColor: theme.colors.surfaceAlt,
          paddingHorizontal: theme.tokens.spacing.sm + 1,
          paddingVertical: theme.tokens.spacing.xs + 1,
        },
        chipLabel: {
          color: theme.colors.text,
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
        },
        mascotWrap: {
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1.5,
          borderTopColor: theme.isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          borderLeftColor: theme.isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          borderRightColor: theme.isDark ? "rgba(0,0,0,0.58)" : "#D2D8E2",
          borderBottomColor: theme.isDark ? "rgba(0,0,0,0.58)" : "#D2D8E2",
          borderRadius: theme.tokens.radius.md,
          backgroundColor: theme.colors.surface,
          padding: theme.tokens.spacing.xxs + 2,
        },
        mascot: {
          width: 34,
          height: 34,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.screen}>
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
            <View style={styles.headerLead}>
              <View style={styles.chip}>
                <Ionicons color={theme.colors.textMuted} name={headerChip.icon} size={16} />
                <Text style={styles.chipLabel}>{headerChip.label}</Text>
              </View>
              {headerAction}
            </View>
            <View style={styles.mascotWrap}>
              <Image contentFit="cover" source={mascotSource} style={styles.mascot} />
            </View>
          </View>
        </Animated.View>
        {children}
      </ScrollView>

      {floatingAction}
    </View>
  );
}
