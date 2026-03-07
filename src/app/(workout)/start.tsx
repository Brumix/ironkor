import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import PressableScale from "@/components/ui/PressableScale";
import ProgressBar from "@/components/ui/ProgressBar";
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

  const completionProgress = todaySession
    ? completedExerciseIds.length / Math.max(todaySession.exercises.length, 1)
    : 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        title: {
          color: theme.colors.text,
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
        },
        body: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        sessionRow: {
          borderRadius: theme.tokens.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceAlt,
          padding: theme.tokens.spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
        },
        sessionIndex: {
          width: 32,
          height: 32,
          borderRadius: theme.tokens.radius.pill,
          overflow: "hidden",
          textAlign: "center",
          textAlignVertical: "center",
          backgroundColor: theme.colors.surfaceMuted,
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        sessionName: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.lg,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        sessionMeta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          marginTop: 1,
        },
      }),
    [theme],
  );

  if (activeRoutineData === undefined) {
    return (
      <WorkoutPage title="Start" subtitle="Loading today's workout...">
        <AppCard variant="muted">
          <Text style={styles.body}>Preparing session details and weekly schedule.</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  if (!activeRoutine || !todayPlan || todayPlan.type === "rest" || !todaySession) {
    return (
      <WorkoutPage title="Start" subtitle="Today is a recovery day. Keep momentum with light activity.">
        <AppCard variant="muted">
          <AppChip label="Rest day" variant="warning" />
          <Text style={styles.title}>Active recovery</Text>
          <Text style={styles.body}>20-30 min walk, mobility work, and hydration target.</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      title="Start"
      subtitle={`Today's workout: ${todaySession.name} • ${todayPlan.estimatedDurationMinutes} min`}
    >
      <Animated.View entering={FadeInDown.delay(30)}>
        <AppCard style={{ backgroundColor: theme.gradients.heroPrimary }}>
          <Text style={styles.title}>{todaySession.name}</Text>
          <Text style={styles.body}>
            {todaySession.exercises.length} exercises • Tap each block when completed
          </Text>
          <ProgressBar progress={completionProgress} />
          <Text style={styles.body}>{Math.round(completionProgress * 100)}% complete</Text>
        </AppCard>
      </Animated.View>

      {todaySession.exercises.map((sessionExercise, index) => {
        const exercise = sessionExercise.exercise;
        const isCompleted = completedExerciseIds.includes(sessionExercise.id);

        return (
          <Animated.View key={sessionExercise.id} layout={LinearTransition.springify()}>
            <PressableScale
              onPress={() => {
                setCompletedExerciseIds((current) =>
                  current.includes(sessionExercise.id)
                    ? current.filter((id) => id !== sessionExercise.id)
                    : [...current, sessionExercise.id],
                );
              }}
              style={[
                styles.sessionRow,
                isCompleted && {
                  borderColor: theme.colors.success,
                  backgroundColor: theme.colors.successSoft,
                },
              ]}
            >
              <Text style={styles.sessionIndex}>{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionName}>{exercise.name}</Text>
                <Text style={styles.sessionMeta}>
                  {exercise.setsTarget} sets • {exercise.repsTarget} reps • {exercise.restSeconds}s rest
                </Text>
              </View>
              <AppChip label={isCompleted ? "Done" : "Pending"} variant={isCompleted ? "success" : "neutral"} />
            </PressableScale>
          </Animated.View>
        );
      })}
    </WorkoutPage>
  );
}
