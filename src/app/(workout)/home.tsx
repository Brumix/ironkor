import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import GradientCard from "@/components/ui/GradientCard";
import MetricCard from "@/components/ui/MetricCard";
import ProgressBar from "@/components/ui/ProgressBar";
import QuickActionTile from "@/components/ui/QuickActionTile";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { buildWeeklyPlan, getSessionById, getTodayPlan } from "@/features/workout/selectors";
import { useTheme } from "@/theme";

import { api } from "@convex/_generated/api";

function resolveGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const activeRoutineData = useQuery(api.routines.getActiveDetailed);
  const activeRoutine = activeRoutineData ?? null;
  const weeklyPlan = activeRoutine ? buildWeeklyPlan(activeRoutine) : null;
  const todayPlan = weeklyPlan ? getTodayPlan(weeklyPlan) : null;
  const todaySession = activeRoutine ? getSessionById(activeRoutine, todayPlan?.sessionId) : null;

  const trainingDays = activeRoutine?.weeklyPlan.filter((entry) => entry.type === "train").length ?? 0;
  const totalExercises = activeRoutine?.sessions.reduce((sum, session) => sum + session.exercises.length, 0) ?? 0;
  const averageExercisesPerSession =
    activeRoutine && activeRoutine.sessions.length > 0
      ? Math.round(totalExercises / activeRoutine.sessions.length)
      : 0;
  const weeklyFocusRatio = Math.min(trainingDays / 7, 1);
  const isRestDay = !todaySession || todayPlan?.type === "rest";
  const greeting = resolveGreeting();
  const activeSessionName = isRestDay ? "Recover strong" : todaySession.name;
  const activeSessionExerciseCount = isRestDay ? 0 : todaySession.exercises.length;
  const activeSessionDuration = isRestDay ? 0 : (todayPlan?.estimatedDurationMinutes ?? 0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        helper: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        heroEyebrow: {
          color: theme.colors.heroTextMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
          textTransform: "uppercase",
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
        heroMetaRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.sm,
        },
        heroMetric: {
          flex: 1,
          minWidth: 110,
          backgroundColor: theme.colors.overlaySoft,
          borderRadius: theme.tokens.radius.md,
          padding: theme.tokens.spacing.md,
          gap: theme.tokens.spacing.xxs,
        },
        heroMetricLabel: {
          color: theme.colors.heroTextMuted,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.wide,
          textTransform: "uppercase",
        },
        heroMetricValue: {
          color: theme.colors.heroText,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
        },
        twoColumnRow: {
          flexDirection: "row",
          gap: theme.tokens.spacing.md,
        },
        column: {
          flex: 1,
          gap: theme.tokens.spacing.md,
        },
        sessionCard: {
          gap: theme.tokens.spacing.md,
        },
        sessionRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.md,
        },
        sessionIndex: {
          width: 42,
          height: 42,
          borderRadius: theme.tokens.radius.pill,
          backgroundColor: theme.colors.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        },
        sessionIndexText: {
          color: theme.colors.accent,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.black,
        },
        sessionBody: {
          flex: 1,
          gap: theme.tokens.spacing.xxs,
        },
        sessionName: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.xl,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        sessionMeta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
        },
        sessionTopRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
        },
        sessionTags: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.xs,
        },
        todayCard: {
          gap: theme.tokens.spacing.md,
        },
        todayTop: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.tokens.spacing.md,
        },
        todayTitle: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
          letterSpacing: theme.tokens.typography.letterSpacing.tight,
        },
        todayCopy: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        progressMetaRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
        },
        progressText: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.semibold,
        },
      }),
    [theme],
  );

  if (activeRoutineData === undefined) {
    return (
      <WorkoutPage headerChip={{ icon: "home-outline", label: "Dashboard" }}>
        <AppCard variant="muted">
          <Text style={styles.helper}>{"Syncing routines and today's plan..."}</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  if (!activeRoutine) {
    return (
      <WorkoutPage headerChip={{ icon: "home-outline", label: "Dashboard" }} subtitle="No active routine">
        <GradientCard>
          <AppChip label="Welcome" variant="neutral" />
          <Text style={styles.heroTitle}>{greeting}</Text>
          <Text style={styles.heroBody}>
            Build your first routine and turn IronKor into a fast, motivating logbook for every gym session.
          </Text>
        </GradientCard>

        <QuickActionTile
          icon="sparkles-outline"
          title="Create your first routine"
          subtitle="Set your split, training days, and exercises in one place."
          tone="accent"
          onPress={() => {
            router.push({ pathname: "/(workout)/routine-editor", params: { routineId: "new" } });
          }}
        />
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage headerChip={{ icon: "flash-outline", label: "Dashboard" }} subtitle={activeRoutine.name}>
      <Animated.View entering={FadeInDown.delay(30).springify().damping(18)}>
        <GradientCard>
          <AppChip label={greeting} variant="neutral" />
          <Text style={styles.heroEyebrow}>{"Today's focus"}</Text>
          <Text style={styles.heroTitle}>{activeSessionName}</Text>
          <Text style={styles.heroBody}>
            {isRestDay
              ? "Use the day to recover, reset, and keep momentum for the next lift."
              : `You have ${activeSessionExerciseCount} exercises lined up. Everything is laid out for a fast between-set flow.`}
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricLabel}>Training days</Text>
              <Text style={styles.heroMetricValue}>{trainingDays}/7</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricLabel}>Total exercises</Text>
              <Text style={styles.heroMetricValue}>{totalExercises}</Text>
            </View>
          </View>
        </GradientCard>
      </Animated.View>

      <SectionHeader
        title="Momentum"
        subtitle="Quick-glance numbers designed for fast gym use"
      />

      <Animated.View entering={FadeInUp.delay(70).springify().damping(18)} style={styles.twoColumnRow}>
        <View style={styles.column}>
          <MetricCard
            helper="Routine sessions ready to go"
            icon="barbell-outline"
            label="Sessions"
            tone="accent"
            value={activeRoutine.sessions.length}
          />
          <MetricCard
            helper="Average number of movements per session"
            icon="albums-outline"
            label="Avg Exercises"
            value={averageExercisesPerSession}
          />
        </View>

        <View style={styles.column}>
          <MetricCard
            helper={`${Math.round(weeklyFocusRatio * 100)}% of your week is allocated to training`}
            icon="pulse-outline"
            label="Weekly Focus"
            progress={weeklyFocusRatio}
            tone="warning"
            value={`${Math.round(weeklyFocusRatio * 100)}%`}
          />
          <MetricCard
            helper={isRestDay ? "Perfect for mobility and recovery." : "Ready to start right now."}
            icon={isRestDay ? "moon-outline" : "flash-outline"}
            label="Today"
            tone={isRestDay ? "default" : "success"}
            value={isRestDay ? "Rest" : "Train"}
          />
        </View>
      </Animated.View>

      <SectionHeader
        title="Quick actions"
        subtitle="Shortcuts for the tasks you use most between sets"
      />

      <Animated.View entering={FadeInUp.delay(100).springify().damping(18)} style={styles.twoColumnRow}>
        <QuickActionTile
          icon="calendar-outline"
          title="View plan"
          subtitle="See this week’s split and check upcoming sessions."
          tone="default"
          onPress={() => {
            router.push("/(workout)/plan");
          }}
        />
        <QuickActionTile
          icon="create-outline"
          title="Manage routine"
          subtitle="Adjust sessions, exercise order, and weekly structure."
          tone="accent"
          onPress={() => {
            router.push("/(workout)/routines");
          }}
        />
      </Animated.View>

      <SectionHeader
        title="Today"
        subtitle={isRestDay ? "Recovery still counts." : "Everything you need to start without friction."}
        action={
          !isRestDay ? (
            <AppButton
              accessibilityLabel="Start workout"
              icon={<Ionicons color={theme.colors.onAccent} name="play" size={16} />}
              label="Start"
              onPress={() => {
                router.push("/(workout)/start");
              }}
              size="sm"
              variant="accent"
            />
          ) : undefined
        }
      />

      <Animated.View entering={FadeInUp.delay(130).springify().damping(18)}>
        <AppCard style={styles.todayCard} variant={isRestDay ? "muted" : "highlight"}>
            <View style={styles.todayTop}>
              <View style={styles.sessionBody}>
                <AppChip label={isRestDay ? "Rest Day" : "Workout Ready"} variant={isRestDay ? "warning" : "accent"} />
                <Text style={styles.todayTitle}>{isRestDay ? "Recovery Mode" : todaySession.name}</Text>
              </View>
              <Ionicons color={isRestDay ? theme.colors.warning : theme.colors.accent} name={isRestDay ? "leaf-outline" : "flash"} size={20} />
            </View>

            <Text style={styles.todayCopy}>
              {isRestDay
                ? "Mobility, light cardio, and hydration keep the streak alive without draining your next heavy session."
                : `${activeSessionExerciseCount} exercises with an estimated ${activeSessionDuration} minute flow.`}
            </Text>

            <ProgressBar progress={isRestDay ? 0.45 : Math.min(activeSessionExerciseCount / 8, 1)} />
            <View style={styles.progressMetaRow}>
              <Text style={styles.progressText}>
                {isRestDay ? "Recovery target" : "Session density"}
              </Text>
              <Text style={styles.progressText}>
                {isRestDay ? "Light effort" : `${activeSessionExerciseCount} blocks`}
              </Text>
            </View>
        </AppCard>
      </Animated.View>

      <SectionHeader
        title="This split"
        subtitle="Sessions are organized as thumb-friendly cards for faster planning"
      />

      {activeRoutine.sessions.map((session, index) => (
        <Animated.View
          entering={FadeInUp.delay(150 + index * 35).springify().damping(20)}
          key={String(session._id)}
          layout={LinearTransition.springify().damping(20)}
        >
          <AppCard
            onPress={() => {
              router.push({
                pathname: "/(workout)/session-editor",
                params: {
                  routineId: String(activeRoutine._id),
                  sessionId: String(session._id),
                },
              });
            }}
            style={styles.sessionCard}
          >
            <View style={styles.sessionTopRow}>
              <View style={styles.sessionRow}>
                <View style={styles.sessionIndex}>
                  <Text style={styles.sessionIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.sessionBody}>
                  <Text style={styles.sessionName}>{session.name}</Text>
                  <Text style={styles.sessionMeta}>{session.exercises.length} exercises planned</Text>
                </View>
              </View>
              <Ionicons color={theme.colors.textSubtle} name="chevron-forward" size={18} />
            </View>

            <View style={styles.sessionTags}>
              <AppChip label={`Session ${index + 1}`} variant="neutral" />
              <AppChip label={`${session.exercises.length} movements`} variant="accent" />
            </View>
          </AppCard>
        </Animated.View>
      ))}
    </WorkoutPage>
  );
}
