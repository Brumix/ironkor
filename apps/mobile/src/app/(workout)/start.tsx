import { api } from "@convex/_generated/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { captureAnalyticsEvent } from "@/config/posthog";
import { buildWeeklyPlan, getSessionById, getTodayPlan } from "@/features/workout/selectors";
import type { RoutineSection } from "@/features/workout/types";
import { useTheme } from "@/theme";

function resolveWorkoutDurationMinutes(startedAt: number | null) {
  if (startedAt === null) {
    return 0;
  }

  return Math.max(0, Math.round((Date.now() - startedAt) / 60000));
}

function countTotalSets(exercises: RoutineSection["exercises"]) {
  return exercises.reduce((sum, entry) => sum + entry.sets, 0);
}

function countCompletedSets(
  exercises: RoutineSection["exercises"],
  completedExerciseIds: string[],
) {
  return exercises.reduce(
    (sum, entry) =>
      completedExerciseIds.includes(String(entry._id)) ? sum + entry.sets : sum,
    0,
  );
}

export default function StartScreen() {
  const { theme } = useTheme();
  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([]);
  const completionCapturedRef = useRef(false);
  const startedCapturedRef = useRef(false);
  const abandonmentCapturedRef = useRef(false);
  const workoutStartedAtRef = useRef<number | null>(null);
  const activeRoutineIdRef = useRef<string | null>(null);
  const todaySessionIdRef = useRef<string | null>(null);
  const completedSetCountRef = useRef(0);
  const trackedWorkoutKeyRef = useRef<string | null>(null);

  const activeRoutineData = useQuery(api.routines.getActiveDetailed);
  const activeRoutine = activeRoutineData ?? null;
  const weeklyPlan = activeRoutine ? buildWeeklyPlan(activeRoutine) : null;
  const todayPlan = weeklyPlan ? getTodayPlan(weeklyPlan) : null;
  const todaySession = activeRoutine ? getSessionById(activeRoutine, todayPlan?.sessionId) : null;

  const totalExercises = todaySession?.exercises.length ?? 0;
  const completedCount = completedExerciseIds.length;
  const completionProgress = totalExercises > 0 ? completedCount / totalExercises : 0;
  const isWorkoutComplete = totalExercises > 0 && completedCount === totalExercises;
  const totalSetCount = todaySession ? countTotalSets(todaySession.exercises) : 0;
  const completedSetCount = todaySession
    ? countCompletedSets(todaySession.exercises, completedExerciseIds)
    : 0;
  const estimatedRestMinutes = todaySession
    ? Math.round(todaySession.exercises.reduce((sum, entry) => sum + (entry.restSeconds ?? 0), 0) / 60)
    : 0;
  const workoutTrackingKey =
    activeRoutine && todaySession
      ? `${String(activeRoutine._id)}:${String(todaySession._id)}`
      : null;

  const captureWorkoutAbandoned = useCallback(() => {
    if (
      !startedCapturedRef.current ||
      completionCapturedRef.current ||
      abandonmentCapturedRef.current
    ) {
      return;
    }

    const routineId = activeRoutineIdRef.current;
    const sessionId = todaySessionIdRef.current;
    if (!routineId || !sessionId) {
      return;
    }

    abandonmentCapturedRef.current = true;
    captureAnalyticsEvent("workout_abandoned", {
      routine_id: routineId,
      session_id: sessionId,
      duration_minutes: resolveWorkoutDurationMinutes(workoutStartedAtRef.current),
      completed_sets: completedSetCountRef.current,
    });
  }, []);

  useEffect(() => {
    activeRoutineIdRef.current = activeRoutine ? String(activeRoutine._id) : null;
    todaySessionIdRef.current = todaySession ? String(todaySession._id) : null;
    completedSetCountRef.current = completedSetCount;
  }, [activeRoutine, completedSetCount, todaySession]);

  useEffect(() => {
    if (!workoutTrackingKey || !activeRoutine || !todaySession) {
      trackedWorkoutKeyRef.current = null;
      workoutStartedAtRef.current = null;
      startedCapturedRef.current = false;
      completionCapturedRef.current = false;
      abandonmentCapturedRef.current = false;
      return;
    }

    if (trackedWorkoutKeyRef.current === workoutTrackingKey) {
      return;
    }

    trackedWorkoutKeyRef.current = workoutTrackingKey;
    workoutStartedAtRef.current = Date.now();
    startedCapturedRef.current = true;
    completionCapturedRef.current = false;
    abandonmentCapturedRef.current = false;

    captureAnalyticsEvent("workout_started", {
      routine_id: String(activeRoutine._id),
      session_id: String(todaySession._id),
      planned_exercise_count: totalExercises,
    });
  }, [activeRoutine, todaySession, totalExercises, workoutTrackingKey]);

  useEffect(() => {
    if (
      !isWorkoutComplete ||
      !activeRoutine ||
      !todaySession ||
      completionCapturedRef.current
    ) {
      return;
    }

    completionCapturedRef.current = true;
    captureAnalyticsEvent("workout_completed", {
      routine_id: String(activeRoutine._id),
      session_id: String(todaySession._id),
      exercise_count: totalExercises,
      duration_minutes: resolveWorkoutDurationMinutes(workoutStartedAtRef.current),
      completed_sets: totalSetCount,
    });
  }, [activeRoutine, isWorkoutComplete, todaySession, totalExercises, totalSetCount]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        captureWorkoutAbandoned();
      };
    }, [captureWorkoutAbandoned]),
  );

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
        const sessionExerciseKey = String(sessionExercise._id);
        const isCompleted = completedExerciseIds.includes(sessionExerciseKey);

        return (
          <Animated.View
            entering={FadeInUp.delay(100 + index * 35).springify().damping(20)}
            key={sessionExerciseKey}
            layout={LinearTransition.springify().damping(20)}
          >
            <ExerciseSetRow
              index={index}
              isCompleted={isCompleted}
              name={exercise.name}
              reps={sessionExercise.repsText}
              restSeconds={sessionExercise.restSeconds}
              sets={sessionExercise.sets}
              targetWeightKg={sessionExercise.targetWeightKg}
              onToggle={() => {
                setCompletedExerciseIds((current) =>
                  current.includes(sessionExerciseKey)
                    ? current.filter((id) => id !== sessionExerciseKey)
                    : [...current, sessionExerciseKey],
                );
              }}
            />
          </Animated.View>
        );
      })}
    </WorkoutPage>
  );
}
