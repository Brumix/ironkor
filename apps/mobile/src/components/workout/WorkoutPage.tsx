import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

import type { ComponentType, ReactNode } from "react";
import type { ScrollViewProps } from "react-native";

function transparentize(color: string) {
  return color.startsWith("#") && color.length === 7 ? `${color}00` : "transparent";
}

interface WorkoutPageProps {
  headerChip: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  };
  title?: string | null;
  subtitle?: string;
  headerAction?: ReactNode;
  headerActionPosition?: "left" | "right";
  headerLeftAction?: ReactNode;
  headerRightAction?: ReactNode;
  stickyHeader?: boolean;
  scrollComponent?: ComponentType<ScrollViewProps>;
  scrollProps?: ScrollViewProps;
  children: ReactNode;
}

export default function WorkoutPage({
  headerChip,
  title,
  subtitle,
  headerAction,
  headerActionPosition = "right",
  headerLeftAction,
  headerRightAction,
  stickyHeader = false,
  scrollComponent: ScrollComponent = ScrollView,
  scrollProps,
  children,
}: WorkoutPageProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const headerTitle = title === undefined ? (subtitle ?? headerChip.label) : title;
  const resolvedLeftAction = headerLeftAction ?? (headerActionPosition === "left" ? headerAction : null);
  const resolvedRightAction = headerRightAction ?? (headerActionPosition === "right" ? headerAction : null);
  const {
    contentContainerStyle,
    keyboardShouldPersistTaps,
    showsVerticalScrollIndicator,
    ...restScrollProps
  } = scrollProps ?? {};
  const stickyHeaderFadeEnd = transparentize(theme.colors.background);

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
        stickyHeaderShell: {
          position: "relative",
          overflow: "visible",
          paddingTop: insets.top + theme.tokens.spacing.sm,
          paddingHorizontal: theme.tokens.spacing.xl,
          paddingBottom: theme.tokens.spacing.md,
          backgroundColor: theme.colors.background,
          zIndex: 2,
        },
        stickyHeaderFade: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -(theme.tokens.spacing.xs + 1),
          height: theme.tokens.spacing.sm,
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
        chipRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
          flexWrap: "wrap",
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
    [insets.top, theme],
  );

  const headerContent = (
    <Animated.View
      entering={FadeInDown.duration(theme.tokens.motion.normal).springify()}
      style={styles.header}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLead}>
          <View style={styles.titleRow}>
            <View style={styles.chipRow}>
              {resolvedLeftAction}
              <View style={styles.chip}>
                <Ionicons color={theme.colors.accent} name={headerChip.icon} size={14} />
                <Text style={styles.chipLabel}>{headerChip.label}</Text>
              </View>
            </View>
            {headerTitle ? <Text style={styles.title}>{headerTitle}</Text> : null}
            {subtitle && subtitle !== headerTitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {resolvedRightAction ? <View style={styles.headerAction}>{resolvedRightAction}</View> : null}
      </View>
    </Animated.View>
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

      {stickyHeader ? (
        <View style={styles.stickyHeaderShell}>
          {headerContent}
          <LinearGradient
            colors={[theme.colors.background, stickyHeaderFadeEnd]}
            pointerEvents="none"
            style={styles.stickyHeaderFade}
          />
        </View>
      ) : null}

      <ScrollComponent
        {...restScrollProps}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: stickyHeader
              ? theme.tokens.spacing.lg
              : insets.top + theme.tokens.spacing.lg,
            paddingBottom: insets.bottom + 140,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? "handled"}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator ?? false}
      >
        {stickyHeader ? null : headerContent}
        {children}
      </ScrollComponent>
    </View>
  );
}
