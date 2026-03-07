import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import AppChip from "@/components/ui/AppChip";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import ProgressBar from "@/components/ui/ProgressBar";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkoutPage from "@/components/workout/WorkoutPage";
import { mapRoutineDetailed } from "@/features/workout/mappers";
import { buildWeeklyPlan, getSessionById, getTodayPlan } from "@/features/workout/selectors";
import { useTheme } from "@/theme";

import { api } from "@convex/_generated/api";

export default function HomeScreen() {
  const { theme } = useTheme();
  const activeRoutineData = useQuery(api.routines.getActiveDetailed);
  const activeRoutine = activeRoutineData ? mapRoutineDetailed(activeRoutineData) : null;
  const weeklyPlan = activeRoutine ? buildWeeklyPlan(activeRoutine) : null;
  const todayPlan = weeklyPlan ? getTodayPlan(weeklyPlan) : null;
  const todaySession = activeRoutine ? getSessionById(activeRoutine, todayPlan?.sessionId) : null;

  const trainingDays = activeRoutine?.weeklyPlan.filter((entry) => entry.type === "train").length ?? 0;
  const weeklyFocusRatio = Math.min(trainingDays / 7, 1);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        centered: {
          alignItems: "flex-start",
          gap: theme.tokens.spacing.sm,
        },
        helper: {
          color: theme.colors.textMuted,
          fontFamily: theme.tokens.typography.fontFamily.body,
          fontSize: theme.tokens.typography.fontSize.md,
          lineHeight: theme.tokens.typography.fontSize.md * theme.tokens.typography.lineHeight.relaxed,
        },
        heroTitle: {
          color: theme.colors.text,
          fontFamily: theme.tokens.typography.fontFamily.display,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
        },
        heroMeta: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.md,
          fontWeight: theme.tokens.typography.fontWeight.medium,
        },
        sessionRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
          borderRadius: theme.tokens.radius.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.tokens.spacing.md,
        },
        sessionIndex: {
          width: 30,
          height: 30,
          borderRadius: theme.tokens.radius.pill,
          textAlign: "center",
          textAlignVertical: "center",
          overflow: "hidden",
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
      <WorkoutPage headerChip={{ icon: "home-outline", label: "No routine" }}>
        <AppCard variant="muted">
          <Text style={styles.helper}>Syncing routines and weekly sessions...</Text>
        </AppCard>
      </WorkoutPage>
    );
  }

  if (!activeRoutine) {
    return (
      <WorkoutPage
        headerChip={{ icon: "home-outline", label: "No routine" }}
        floatingAction={
          <FloatingActionButton
            accessibilityLabel="Create routine"
            iconName="add"
            onPress={() => {
              router.push({ pathname: "/(workout)/routine-editor", params: { routineId: "new" } });
            }}
          />
        }
      >
        <AppCard variant="muted" style={styles.centered}>
          <Text style={styles.helper}>No active routine yet.</Text>
          <AppButton
            accessibilityLabel="Create routine"
            icon={<Ionicons color={theme.colors.onPrimary} name="add-outline" size={18} />}
            onPress={() => {
              router.push({ pathname: "/(workout)/routine-editor", params: { routineId: "new" } });
            }}
          />
        </AppCard>
      </WorkoutPage>
    );
  }

  return (
    <WorkoutPage
      headerChip={{ icon: "sparkles-outline", label: "Active" }}
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Start workout"
          iconName="flash"
          onPress={() => {
            router.push("/(workout)/start");
          }}
        />
      }
    >
      <Animated.View entering={FadeInUp.delay(30)}>
        <AppCard style={{ backgroundColor: theme.gradients.heroPrimary }}>
          <AppChip label="Active routine" variant="primary" />
          <Text style={styles.heroTitle}>{activeRoutine.name}</Text>
          <Text style={styles.heroMeta}>
            {activeRoutine.daysPerWeek} days/week • {activeRoutine.sessions.length} sessions
          </Text>
          <ProgressBar progress={weeklyFocusRatio} />
          <Text style={styles.heroMeta}>Weekly focus {Math.round(weeklyFocusRatio * 100)}%</Text>
        </AppCard>
      </Animated.View>

      <SectionHeader
        action={
          <AppButton
            accessibilityLabel="Open weekly plan"
            icon={<Ionicons color={theme.colors.text} name="calendar-outline" size={16} />}
            onPress={() => {
              router.push("/(workout)/plan");
            }}
            size="sm"
            variant="ghost"
          />
        }
        title="Today"
      />

      <AppCard variant="muted">
        <Text style={styles.heroTitle}>{todaySession?.name ?? "Recovery session"}</Text>
        <Text style={styles.heroMeta}>
          {todaySession
            ? `${todaySession.exercises.length} exercises • ${todayPlan?.estimatedDurationMinutes ?? 0} min`
            : "Rest day. Light mobility and walk recommended."}
        </Text>
      </AppCard>

      <SectionHeader title="Routine sessions" />
      {activeRoutine.sessions.map((session, index) => (
        <Animated.View entering={FadeInUp.delay(80 + index * 30)} key={session.id}>
          <View style={styles.sessionRow}>
            <Text style={styles.sessionIndex}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionName}>{session.name}</Text>
              <Text style={styles.sessionMeta}>{session.exercises.length} planned exercises</Text>
            </View>
          </View>
        </Animated.View>
      ))}
    </WorkoutPage>
  );
}
