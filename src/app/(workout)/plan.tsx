import { useQuery } from "convex/react";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { mapRoutineDetailed } from "@/features/workout/mappers";
import { buildWeeklyPlan } from "@/features/workout/selectors";
import { useTheme } from "@/theme";

import { api } from "@convex/_generated/api";

export default function PlanScreen() {
  const { theme } = useTheme();
  const activeRoutineData = useQuery(api.routines.getActiveDetailed);
  const activeRoutine = activeRoutineData ? mapRoutineDetailed(activeRoutineData) : null;
  const weeklyPlan = activeRoutine ? buildWeeklyPlan(activeRoutine) : null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        date: {
          color: theme.colors.textSubtle,
          fontSize: theme.tokens.typography.fontSize.sm,
          textTransform: "capitalize",
        },
        session: {
          marginTop: 3,
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.lg,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        right: {
          alignItems: "flex-end",
          gap: theme.tokens.spacing.xxs + 1,
        },
        duration: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
        },
        helper: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
      }),
    [theme],
  );

  if (activeRoutineData === undefined) {
    return (
      <WorkoutPage title="Plan" subtitle="Loading your weekly plan...">
        <AppCard variant="muted">
          <Text style={styles.helper}>Syncing current split and day assignments...</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  if (!activeRoutine || !weeklyPlan) {
    return (
      <WorkoutPage title="Plan" subtitle="Automatic weekly planning with training and recovery days.">
        <AppCard variant="muted">
          <Text style={styles.helper}>Create and activate a routine to unlock your weekly schedule.</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage title="Plan" subtitle="Automatic weekly planning with training and recovery days.">
      {weeklyPlan.dayPlans.map((dayPlan, index) => (
        <Animated.View entering={FadeInUp.delay(30 + index * 22)} key={dayPlan.dateISO}>
          <AppCard variant={dayPlan.type === "train" ? "default" : "muted"}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: theme.tokens.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.date}>
                  {new Date(dayPlan.dateISO).toLocaleDateString("en-US", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </Text>
                <Text style={styles.session}>{dayPlan.type === "train" ? dayPlan.sessionName ?? "Workout" : "Rest day"}</Text>
              </View>

              <View style={styles.right}>
                <AppChip label={dayPlan.type === "train" ? "Workout" : "Recovery"} variant={dayPlan.type === "train" ? "primary" : "neutral"} />
                {dayPlan.type === "train" ? (
                  <Text style={styles.duration}>{dayPlan.estimatedDurationMinutes} min</Text>
                ) : null}
              </View>
            </View>
          </AppCard>
        </Animated.View>
      ))}
    </WorkoutPage>
  );
}
