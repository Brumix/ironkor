import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, LinearTransition, ZoomIn } from "react-native-reanimated";

import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import ExerciseSetRow from "@/components/ui/ExerciseSetRow";
import GradientCard from "@/components/ui/GradientCard";
import MetricCard from "@/components/ui/MetricCard";
import ProgressBar from "@/components/ui/ProgressBar";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { mapRoutineDetailed } from "@/features/workout/mappers";
import { buildWeeklyPlan, getSessionById, getTodayPlan } from "@/features/workout/selectors";
import { useTheme } from "@/theme";

import { api } from "@convex/_generated/api";

export default function StartScreen() {
  const { theme } = useTheme();
  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([]);

  const activeRoutineData = useQuery(api.routines.getActiveDetailed);
  const activeRoutine = activeRoutineData ? mapRoutineDetailed(activeRoutineData) : null;
  const weeklyPlan = activeRoutine ? buildWeeklyPlan(activeRoutine) : null;
  const todayPlan = weeklyPlan ? getTodayPlan(weeklyPlan) : null;
  const todaySession = activeRoutine ? getSessionById(activeRoutine, todayPlan?.sessionId) : null;

  const totalExercises = todaySession?.exercises.length ?? 0;
  const completedCount = completedExerciseIds.length;
  const completionProgress = totalExercises > 0 ? completedCount / totalExercises : 0;
  const isWorkoutComplete = totalExercises > 0 && completedCount === totalExercises;
  const estimatedRestMinutes = todaySession
    ? Math.round(todaySession.exercises.reduce((sum, entry) => sum + entry.exercise.restSeconds, 0) / 60)
    : 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
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
        heroMeta: {
          color: theme.colors.heroTextMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.medium,
        },
        progressLabel: {
          color: theme.colors.heroTextMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.medium,
        },
        progressRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.tokens.spacing.sm,
        },
        progressCount: {
          color: theme.colors.heroText,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        exerciseListHeader: {
          color: theme.colors.textSubtle,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.wider,
          textTransform: "uppercase",
          paddingHorizontal: theme.tokens.spacing.xs,
        },
        completeTitle: {
          color: theme.colors.heroText,
          fontSize: theme.tokens.typography.fontSize["3xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        completeMeta: {
          color: theme.colors.heroTextMuted,
          fontSize: theme.tokens.typography.fontSize.md,
        },
        completionBadge: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.xs,
          backgroundColor: theme.colors.overlaySoft,
          borderRadius: theme.tokens.radius.pill,
          paddingHorizontal: theme.tokens.spacing.md,
          paddingVertical: theme.tokens.spacing.xs,
          alignSelf: "flex-start",
        },
        completionBadgeText: {
          color: theme.colors.heroText,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        restTitle: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        metricsRow: {
          flexDirection: "row",
          gap: theme.tokens.spacing.md,
        },
        metricColumn: {
          flex: 1,
        },
      }),
    [theme],
  );

  if (activeRoutineData === undefined) {
    return (
      <WorkoutPage headerChip={{ icon: "play-outline", label: "Workout" }}>
        <AppCard variant="muted">
          <Text style={styles.body}>Preparing session details...</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  if (!activeRoutine || !todayPlan || todayPlan.type === "rest" || !todaySession) {
    return (
      <WorkoutPage headerChip={{ icon: "moon-outline", label: "Rest day" }} subtitle="Recovery">
        <GradientCard colors={[theme.gradients.heroNeutralStart, theme.gradients.heroNeutralEnd]}>
          <AppChip label="Recovery mode" variant="warning" />
          <Text style={styles.heroTitle}>Active recovery</Text>
          <Text style={styles.heroMeta}>
            {"Walk, stretch, and recharge so tomorrow's performance feels strong instead of rushed."}
          </Text>
        </GradientCard>

        <AppCard variant="muted">
          <Text style={styles.restTitle}>Suggested focus</Text>
          <Text style={styles.body}>20-30 minutes of light cardio, mobility, and hydration is enough to keep momentum.</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage headerChip={{ icon: "flash-outline", label: "Workout" }} subtitle={todaySession.name}>
      <Animated.View entering={FadeInDown.delay(30).springify().damping(18)}>
        {isWorkoutComplete ? (
          <Animated.View entering={ZoomIn.springify().damping(18)}>
            <GradientCard
              colors={[theme.gradients.successStart, theme.gradients.successEnd]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
            >
              <View style={styles.completionBadge}>
                <Ionicons color={theme.colors.heroText} name="checkmark-circle" size={16} />
                <Text style={styles.completionBadgeText}>Workout complete</Text>
              </View>
              <Text style={styles.completeTitle}>{todaySession.name}</Text>
              <Text style={styles.completeMeta}>
                {completedCount} of {totalExercises} exercises done. Great work staying consistent.
              </Text>
            </GradientCard>
          </Animated.View>
        ) : (
          <GradientCard>
            <AppChip label="Live session" variant="neutral" />
            <Text style={styles.heroTitle}>{todaySession.name}</Text>
            <Text style={styles.heroMeta}>Move quickly between sets and tap each card as you complete it.</Text>
            <ProgressBar progress={completionProgress} />
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>{Math.round(completionProgress * 100)}% complete</Text>
              <Text style={styles.progressCount}>
                {completedCount}/{totalExercises}
              </Text>
            </View>
          </GradientCard>
        )}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(60).springify().damping(18)} style={styles.metricsRow}>
        <View style={styles.metricColumn}>
          <MetricCard
            helper="Exercises left in this session"
            icon="albums-outline"
            label="Remaining"
            tone="accent"
            value={Math.max(totalExercises - completedCount, 0)}
          />
        </View>
        <View style={styles.metricColumn}>
          <MetricCard
            helper="Approximate rest time across the workout"
            icon="timer-outline"
            label="Rest"
            value={`${estimatedRestMinutes}m`}
          />
        </View>
      </Animated.View>

      <SectionHeader
        title="Exercise flow"
        subtitle="Tap cards as you finish sets for satisfying visual feedback"
      />

      <Animated.View entering={FadeInUp.delay(80)} style={{ paddingHorizontal: theme.tokens.spacing.xs }}>
        <Text style={styles.exerciseListHeader}>Exercises</Text>
      </Animated.View>

      {todaySession.exercises.map((sessionExercise, index) => {
        const exercise = sessionExercise.exercise;
        const isCompleted = completedExerciseIds.includes(sessionExercise.id);

        return (
          <Animated.View
            entering={FadeInUp.delay(100 + index * 35).springify().damping(20)}
            key={sessionExercise.id}
            layout={LinearTransition.springify().damping(20)}
          >
            <ExerciseSetRow
              index={index}
              isCompleted={isCompleted}
              name={exercise.name}
              reps={exercise.repsTarget}
              restSeconds={exercise.restSeconds}
              sets={exercise.setsTarget}
              onToggle={() => {
                setCompletedExerciseIds((current) =>
                  current.includes(sessionExercise.id)
                    ? current.filter((id) => id !== sessionExercise.id)
                    : [...current, sessionExercise.id],
                );
              }}
            />
          </Animated.View>
        );
      })}
    </WorkoutPage>
  );
}
