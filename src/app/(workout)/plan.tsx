import { useQuery } from "convex/react";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import GradientCard from "@/components/ui/GradientCard";
import MetricCard from "@/components/ui/MetricCard";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { mapRoutineDetailed } from "@/features/workout/mappers";
import { buildWeeklyPlan } from "@/features/workout/selectors";
import { useTheme } from "@/theme";

import { api } from "@convex/_generated/api";

const WEEKDAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
};

export default function PlanScreen() {
  const { theme } = useTheme();
  const activeRoutineData = useQuery(api.routines.getActiveDetailed);
  const activeRoutine = activeRoutineData ? mapRoutineDetailed(activeRoutineData) : null;
  const weeklyPlan = activeRoutine ? buildWeeklyPlan(activeRoutine) : null;

  const trainingDays = weeklyPlan?.dayPlans.filter((dayPlan) => dayPlan.type === "train").length ?? 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        helper: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
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
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        metricRow: {
          flexDirection: "row",
          gap: theme.tokens.spacing.md,
        },
        metricColumn: {
          flex: 1,
        },
        dayCard: {
          gap: theme.tokens.spacing.md,
        },
        date: {
          color: theme.colors.textSubtle,
          fontSize: theme.tokens.typography.fontSize.sm,
          textTransform: "uppercase",
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
        },
        session: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        row: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: theme.tokens.spacing.md,
        },
        duration: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
        },
      }),
    [theme],
  );

  if (activeRoutineData === undefined) {
    return (
      <WorkoutPage headerChip={{ icon: "calendar-outline", label: "Weekly plan" }}>
        <AppCard variant="muted">
          <Text style={styles.helper}>Syncing current split and day assignments...</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  if (!activeRoutine || !weeklyPlan) {
    return (
      <WorkoutPage headerChip={{ icon: "calendar-outline", label: "Weekly plan" }} subtitle="No active plan">
        <AppCard variant="muted">
          <Text style={styles.helper}>Create and activate a routine to unlock your weekly schedule.</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage headerChip={{ icon: "calendar-outline", label: "Weekly plan" }} subtitle={activeRoutine.name}>
      <Animated.View entering={FadeInUp.delay(20).springify().damping(18)}>
        <GradientCard colors={[theme.gradients.heroNeutralStart, theme.gradients.heroNeutralEnd]}>
          <AppChip label="Seven day flow" variant="neutral" />
          <Text style={styles.heroTitle}>{trainingDays} training days</Text>
          <Text style={styles.heroBody}>
            Your week is organized for quick scanning so you always know whether to push, recover, or adjust.
          </Text>
        </GradientCard>
      </Animated.View>

      <SectionHeader
        title="Week overview"
        subtitle="A fast snapshot of your current split"
      />

      <Animated.View entering={FadeInUp.delay(50).springify().damping(18)} style={styles.metricRow}>
        <View style={styles.metricColumn}>
          <MetricCard helper="Workout days planned this week" icon="calendar-outline" label="Train Days" tone="accent" value={trainingDays} />
        </View>
        <View style={styles.metricColumn}>
          <MetricCard helper="Recovery days that protect consistency" icon="moon-outline" label="Recovery" value={7 - trainingDays} />
        </View>
      </Animated.View>

      <SectionHeader
        title="Daily schedule"
        subtitle="Workout and recovery cards with clear hierarchy"
      />

      {weeklyPlan.dayPlans.map((dayPlan, index) => (
        <Animated.View entering={FadeInUp.delay(80 + index * 24)} key={dayPlan.dateISO}>
          <AppCard style={styles.dayCard} variant={dayPlan.type === "train" ? "highlight" : "muted"}>
            <View style={styles.row}>
              <View style={{ flex: 1, gap: theme.tokens.spacing.xs }}>
                <Text style={styles.date}>
                  {new Date(dayPlan.dateISO).toLocaleDateString("en-US", WEEKDAY_FORMAT)}
                </Text>
                <Text style={styles.session}>{dayPlan.type === "train" ? dayPlan.sessionName ?? "Workout" : "Rest day"}</Text>
              </View>

              <AppChip
                label={dayPlan.type === "train" ? "Workout" : "Recovery"}
                variant={dayPlan.type === "train" ? "accent" : "warning"}
              />
            </View>

            <Text style={styles.duration}>
              {dayPlan.type === "train"
                ? `${dayPlan.estimatedDurationMinutes} min planned`
                : "Mobility, walking, and recharge"}
            </Text>
          </AppCard>
        </Animated.View>
      ))}
    </WorkoutPage>
  );
}
