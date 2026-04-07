import { api } from "@convex/_generated/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  LinearTransition,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";

import type { UserUnitSystem } from "@ironkor/shared/enums";

import AppButton from "@/components/ui/AppButton";
import AppCard from "@/components/ui/AppCard";
import GradientCard from "@/components/ui/GradientCard";
import ProgressBar from "@/components/ui/ProgressBar";
import SafeScreen from "@/components/ui/SafeScreen";
import { useAppAlert } from "@/components/ui/useAppAlert";
import { captureAnalyticsEvent } from "@/config/posthog";
import { useAccountDeletionTransition } from "@/features/auth/AccountDeletionTransitionProvider";
import AccountRestoreChoiceModal from "@/features/auth/AccountRestoreChoiceModal";
import { useAppUnlock } from "@/features/auth/AppUnlockProvider";
import AuthLoadingScreen from "@/features/auth/AuthLoadingScreen";
import { useAuth, useSession } from "@/features/auth/clerkCompat";
import LocalUnlockScreen from "@/features/auth/LocalUnlockScreen";
import { useSecureSignOut } from "@/features/auth/useSecureSignOut";
import { useViewerBootstrap } from "@/features/auth/useViewerBootstrap";
import AppErrorScreen from "@/features/errors/AppErrorScreen";
import BodyDataSelectors from "@/features/onboarding/body-data-selectors";
import {
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  SESSION_DURATION_OPTIONS,
  TRAINING_ENVIRONMENT_OPTIONS,
  UNIT_SYSTEM_OPTIONS,
  WORKOUTS_PER_WEEK_OPTIONS,
  type ChoiceOption,
} from "@/features/onboarding/catalog";
import {
  formatHeightValue,
  formatWeightValue,
  getExperienceLabel,
  getGoalLabel,
  getTrainingEnvironmentLabel,
  getUnitSystemLabel,
  normalizeHeightCmForUnitSystem,
  normalizeWeightKgForUnitSystem,
  toProfileHeightInput,
  toProfileWeightInput,
} from "@/features/onboarding/helpers";
import {
  buildInitialOnboardingFormState,
  resolveCreateResumeIndex,
  type OnboardingFormState,
} from "@/features/onboarding/state";
import { useOnboardingGate } from "@/features/onboarding/useOnboardingGate";
import { useTheme } from "@/theme";

type StepKey =
  | "welcome"
  | "goal"
  | "experience"
  | "rhythm"
  | "environment"
  | "body"
  | "review";

interface StepDefinition {
  eyebrow: string;
  iconName: keyof typeof Ionicons.glyphMap;
  key: StepKey;
  subtitle: string;
  title: string;
}

const CREATE_STEPS: StepDefinition[] = [
  {
    key: "welcome",
    eyebrow: "New account",
    iconName: "sparkles-outline",
    title: "Set up the training space you actually want to use",
    subtitle:
      "A few answers help Ironkor feel personal from the first lift without slowing you down.",
  },
  {
    key: "goal",
    eyebrow: "Primary goal",
    iconName: "flag-outline",
    title: "What should your training default toward?",
    subtitle:
      "Choose the result you care about most right now. You can update it later in Settings.",
  },
  {
    key: "experience",
    eyebrow: "Experience",
    iconName: "school-outline",
    title: "How experienced are you in the gym?",
    subtitle:
      "We’ll use this to keep the app’s assumptions closer to your pace and confidence level.",
  },
  {
    key: "rhythm",
    eyebrow: "Training rhythm",
    iconName: "calendar-outline",
    title: "What does a realistic week look like?",
    subtitle:
      "This keeps future planning grounded in the schedule you can actually stick to.",
  },
  {
    key: "environment",
    eyebrow: "Setup",
    iconName: "options-outline",
    title: "Where do you train and which units feel natural?",
    subtitle:
      "A couple of preferences now prevent awkward defaults later when logging workouts or body data.",
  },
  {
    key: "body",
    eyebrow: "Body profile",
    iconName: "body-outline",
    title: "Add body data if you want better progress context",
    subtitle:
      "Weight becomes your first body-data entry. Height stays as part of your profile. Both are optional.",
  },
  {
    key: "review",
    eyebrow: "Review",
    iconName: "checkmark-circle-outline",
    title: "Everything looks ready",
    subtitle:
      "Take one last look, then we’ll open your gym logbook with the right defaults in place.",
  },
];

function clampIndex(value: number, length: number) {
  return Math.min(Math.max(0, value), Math.max(0, length - 1));
}

function fireHaptic(kind: "light" | "success" | "error") {
  const promise =
    kind === "success"
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : kind === "error"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        : Haptics.selectionAsync();

  void promise.catch(() => undefined);
}

function ChoiceCard<TValue extends string | number>({
  onPress,
  option,
  selected,
}: {
  onPress: () => void;
  option: ChoiceOption<TValue>;
  selected: boolean;
}) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          flex: 1,
          gap: theme.tokens.spacing.xs,
        },
        description: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          lineHeight:
            theme.tokens.typography.fontSize.sm *
            theme.tokens.typography.lineHeight.relaxed,
        },
        iconWrap: {
          alignItems: "center",
          borderRadius: theme.tokens.radius.pill,
          height: 42,
          justifyContent: "center",
          width: 42,
        },
        label: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.lg,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        row: {
          alignItems: "center",
          flexDirection: "row",
          gap: theme.tokens.spacing.md,
        },
      }),
    [theme],
  );

  return (
    <AppCard
      onPress={onPress}
      pressedScale={0.985}
      style={{
        backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surface,
        borderColor: selected ? theme.colors.borderAccent : theme.colors.borderSoft,
      }}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: selected
                ? theme.colors.accent
                : theme.colors.secondarySoft,
            },
          ]}
        >
          <Ionicons
            color={selected ? theme.colors.onAccent : theme.colors.textMuted}
            name={option.iconName}
            size={20}
          />
        </View>
        <View style={styles.body}>
          <Text style={styles.label}>{option.label}</Text>
          <Text style={styles.description}>{option.description}</Text>
        </View>
        <Ionicons
          color={selected ? theme.colors.accent : theme.colors.textSubtle}
          name={selected ? "checkmark-circle" : "ellipse-outline"}
          size={22}
        />
      </View>
    </AppCard>
  );
}

export default function OnboardingFlow() {
  const { theme } = useTheme();
  const { showAlert, AlertModal } = useAppAlert();
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();
  const { isAccountDeletionTransitioning } = useAccountDeletionTransition();
  const secureSignOut = useSecureSignOut();
  const {
    errorMessage: unlockErrorMessage,
    status: unlockStatus,
    unlock,
  } = useAppUnlock();
  const isUnlocked = unlockStatus === "unavailable" || unlockStatus === "unlocked";
  const {
    errorMessage,
    isReady,
    isResolvingRestoreChoice,
    restoreCandidate,
    restorePreviousAccount,
    startFreshAccount,
  } = useViewerBootstrap({
    enabled:
      isSignedIn &&
      !session?.currentTask &&
      isUnlocked &&
      !isAccountDeletionTransitioning,
  });
  const onboardingGate = useOnboardingGate({ enabled: isReady });
  const saveOnboardingDraft = useMutation(api.profile.saveOnboardingDraft);
  const completeOnboarding = useMutation(api.profile.completeOnboarding);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [formState, setFormState] = useState<OnboardingFormState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!onboardingGate.summary || hasInitializedRef.current) {
      return;
    }

    setFormState(buildInitialOnboardingFormState(onboardingGate.summary));
    setCurrentStepIndex(resolveCreateResumeIndex(onboardingGate.summary.resumeStep, CREATE_STEPS.length));
    hasInitializedRef.current = true;
  }, [onboardingGate.summary]);

  if (!isLoaded) {
    return <AuthLoadingScreen message="Preparing your session..." title="Loading Ironkor" />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  if (session?.currentTask) {
    return <Redirect href="/auth-task" />;
  }

  if (isAccountDeletionTransitioning) {
    return (
      <AuthLoadingScreen
        message="Signing you out and preserving your previous Ironkor account..."
        title="Deleting your account"
      />
    );
  }

  if (!isUnlocked) {
    if (unlockStatus === "checking" || unlockStatus === "unlocking") {
      return (
        <AuthLoadingScreen
          message="Verifying your device identity..."
          title="Unlocking Ironkor"
        />
      );
    }

    return (
      <LocalUnlockScreen
        errorMessage={unlockErrorMessage}
        onSignOut={() => {
          void secureSignOut().catch(() => undefined);
        }}
        onUnlock={() => {
          void unlock();
        }}
      />
    );
  }

  if (restoreCandidate) {
    return (
      <>
        <AuthLoadingScreen
          message={
            errorMessage ??
            "Choose whether to bring back your previous Ironkor account or start with a fresh workspace."
          }
          title="Restore your previous account"
        />
        <AccountRestoreChoiceModal
          isSubmitting={isResolvingRestoreChoice}
          onRestore={restorePreviousAccount}
          onStartFresh={startFreshAccount}
          visible
        />
      </>
    );
  }

  if (errorMessage) {
    return (
      <AppErrorScreen
        eyebrow="Workspace sync"
        message={errorMessage}
        primaryAction={{
          label: "Try again",
          onPress: () => {
            router.replace("/");
          },
          variant: "accent",
        }}
        secondaryAction={{
          label: "Sign out",
          onPress: () => {
            void secureSignOut().catch(() => undefined);
          },
        }}
        title="We couldn't open onboarding"
      />
    );
  }

  if (onboardingGate.errorMessage) {
    return (
      <AppErrorScreen
        eyebrow="Profile sync"
        message={onboardingGate.errorMessage}
        primaryAction={{
          label: "Try again",
          onPress: () => {
            router.replace("/");
          },
          variant: "accent",
        }}
        secondaryAction={{
          label: "Sign out",
          onPress: () => {
            void secureSignOut().catch(() => undefined);
          },
        }}
        title="We couldn't load your onboarding profile"
      />
    );
  }

  if (!isReady || onboardingGate.isLoading || !onboardingGate.summary || !formState) {
    return (
      <AuthLoadingScreen
        message="Preparing your setup..."
        title="Opening onboarding"
      />
    );
  }

  if (!onboardingGate.blocked && onboardingGate.isComplete) {
    return <Redirect href="/(workout)/home" />;
  }

  const summary = onboardingGate.summary;
  const activeFormState = formState;
  const currentStep = CREATE_STEPS[currentStepIndex] ?? CREATE_STEPS[0];
  const progress =
    CREATE_STEPS.length <= 1 ? 1 : currentStepIndex / (CREATE_STEPS.length - 1);

  function updateState(patch: Partial<OnboardingFormState>) {
    setFormState((current) => (current ? { ...current, ...patch } : current));
    setFieldError(null);
  }

  function handleUnitSystemChange(nextUnitSystem: UserUnitSystem) {
    updateState({
      unitSystem: nextUnitSystem,
      heightCm: normalizeHeightCmForUnitSystem(activeFormState.heightCm, nextUnitSystem),
      weightKg: normalizeWeightKgForUnitSystem(activeFormState.weightKg, nextUnitSystem),
    });
  }

  function validateStep(stepKey: StepKey) {
    switch (stepKey) {
      case "goal":
        return activeFormState.primaryGoal
          ? null
          : "Choose the main outcome you want Ironkor to optimize for.";
      case "experience":
        return activeFormState.experienceLevel
          ? null
          : "Pick the level that best matches how you train today.";
      case "rhythm":
        return activeFormState.workoutsPerWeek && activeFormState.sessionDurationMinutes
          ? null
          : "Choose both your weekly training frequency and typical session length.";
      case "environment":
        return activeFormState.trainingEnvironment
          ? null
          : "Choose the setup that matches where you usually train.";
      default:
        return null;
    }
  }

  function buildDraftPayload() {
    return {
      experienceLevel: activeFormState.experienceLevel ?? undefined,
      height: toProfileHeightInput(activeFormState.heightCm, activeFormState.unitSystem),
      primaryGoal: activeFormState.primaryGoal ?? undefined,
      sessionDurationMinutes: activeFormState.sessionDurationMinutes ?? undefined,
      trainingEnvironment: activeFormState.trainingEnvironment ?? undefined,
      unitSystem: activeFormState.unitSystem,
      weight: toProfileWeightInput(activeFormState.weightKg, activeFormState.unitSystem),
      workoutsPerWeek: activeFormState.workoutsPerWeek ?? undefined,
    };
  }

  function buildCompletionPayload() {
    if (
      !activeFormState.primaryGoal ||
      !activeFormState.experienceLevel ||
      !activeFormState.workoutsPerWeek ||
      !activeFormState.sessionDurationMinutes ||
      !activeFormState.trainingEnvironment
    ) {
      throw new Error("The onboarding profile is incomplete.");
    }

    return {
      experienceLevel: activeFormState.experienceLevel,
      height: toProfileHeightInput(activeFormState.heightCm, activeFormState.unitSystem),
      primaryGoal: activeFormState.primaryGoal,
      sessionDurationMinutes: activeFormState.sessionDurationMinutes,
      trainingEnvironment: activeFormState.trainingEnvironment,
      unitSystem: activeFormState.unitSystem,
      weight: toProfileWeightInput(activeFormState.weightKg, activeFormState.unitSystem),
      workoutsPerWeek: activeFormState.workoutsPerWeek,
    };
  }

  async function handleAdvance() {
    if (isSubmitting) {
      return;
    }

    const validationMessage = validateStep(currentStep.key);
    if (validationMessage) {
      fireHaptic("error");
      setFieldError(validationMessage);
      return;
    }

    if (currentStep.key === "review") {
      setIsSubmitting(true);
      setFieldError(null);
      try {
        const completionPayload = buildCompletionPayload();
        await completeOnboarding(completionPayload);
        captureAnalyticsEvent("onboarding_completed", {
          primary_goal: completionPayload.primaryGoal,
          experience_level: completionPayload.experienceLevel,
          workouts_per_week: completionPayload.workoutsPerWeek,
          training_environment: completionPayload.trainingEnvironment,
          unit_system: completionPayload.unitSystem,
        });
        fireHaptic("success");
        router.replace("/(workout)/home");
      } catch (caughtError) {
        fireHaptic("error");
        showAlert({
          message:
            caughtError instanceof Error ? caughtError.message : "Please try again.",
          title: "Couldn’t finish onboarding",
          variant: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    setFieldError(null);
    try {
      const payload = buildDraftPayload();
      await saveOnboardingDraft({
        experienceLevel: payload.experienceLevel,
        height: payload.height,
        primaryGoal: payload.primaryGoal,
        resumeStep: clampIndex(currentStepIndex + 1, CREATE_STEPS.length),
        sessionDurationMinutes: payload.sessionDurationMinutes,
        trainingEnvironment: payload.trainingEnvironment,
        unitSystem: payload.unitSystem,
        weight: payload.weight,
        workoutsPerWeek: payload.workoutsPerWeek,
      });

      captureAnalyticsEvent("onboarding_step_advanced", {
        step_key: currentStep.key,
        step_index: currentStepIndex,
        total_steps: CREATE_STEPS.length,
      });
      fireHaptic("light");
      setDirection("forward");
      setCurrentStepIndex((current) => clampIndex(current + 1, CREATE_STEPS.length));
    } catch (caughtError) {
      fireHaptic("error");
      showAlert({
        message:
          caughtError instanceof Error ? caughtError.message : "Please try again.",
        title: "Couldn’t save progress",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    if (currentStepIndex === 0) {
      return;
    }

    fireHaptic("light");
    setFieldError(null);
    setDirection("backward");
    setCurrentStepIndex((current) => clampIndex(current - 1, CREATE_STEPS.length));
  }

  const stepAnimationIn =
    direction === "forward" ? SlideInRight.springify() : SlideInLeft.springify();
  const stepAnimationOut =
    direction === "forward" ? SlideOutLeft.duration(180) : SlideOutRight.duration(180);

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            gap: theme.tokens.spacing.lg,
            paddingBottom: theme.tokens.spacing["4xl"],
            paddingHorizontal: theme.tokens.spacing.lg,
          }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GradientCard
            colors={[
              theme.gradients.heroAccentStart,
              theme.gradients.heroAccentEnd,
              theme.gradients.heroSecondary,
            ]}
            style={{ marginTop: theme.tokens.spacing.lg }}
          >
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                gap: theme.tokens.spacing.sm,
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: theme.colors.overlaySoft,
                  borderRadius: theme.tokens.radius.pill,
                  height: 42,
                  justifyContent: "center",
                  width: 42,
                }}
              >
                <Ionicons color={theme.colors.heroText} name={currentStep.iconName} size={20} />
              </View>
              <View style={{ gap: theme.tokens.spacing.xxs }}>
                <Text
                  style={{
                    color: theme.colors.heroTextMuted,
                    fontSize: theme.tokens.typography.fontSize.xs,
                    fontWeight: theme.tokens.typography.fontWeight.bold,
                    letterSpacing: theme.tokens.typography.letterSpacing.caps,
                    textTransform: "uppercase",
                  }}
                >
                  {currentStep.eyebrow}
                </Text>
                <Text
                  style={{
                    color: theme.colors.heroText,
                    fontSize: theme.tokens.typography.fontSize.xl,
                    fontWeight: theme.tokens.typography.fontWeight.black,
                  }}
                >
                  Account setup
                </Text>
              </View>
            </View>

            <Text
              style={{
                color: theme.colors.heroText,
                fontSize: theme.tokens.typography.fontSize["3xl"],
                fontWeight: theme.tokens.typography.fontWeight.black,
                letterSpacing: theme.tokens.typography.letterSpacing.tight,
              }}
            >
              {currentStep.title}
            </Text>
            <Text
              style={{
                color: theme.colors.heroTextMuted,
                fontSize: theme.tokens.typography.fontSize.md,
                lineHeight:
                  theme.tokens.typography.fontSize.md *
                  theme.tokens.typography.lineHeight.relaxed,
              }}
            >
              {currentStep.subtitle}
            </Text>
          </GradientCard>

          <Animated.View
            entering={FadeInUp.duration(theme.tokens.motion.normal)}
            layout={LinearTransition.springify()}
            style={{ gap: theme.tokens.spacing.sm }}
          >
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.tokens.typography.fontSize.sm,
                  fontWeight: theme.tokens.typography.fontWeight.semibold,
                }}
              >
                Step {currentStepIndex + 1} of {CREATE_STEPS.length}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSubtle,
                  fontSize: theme.tokens.typography.fontSize.sm,
                }}
              >
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <ProgressBar progress={progress} />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(theme.tokens.motion.normal)}
            layout={LinearTransition.springify()}
            style={{ gap: theme.tokens.spacing.md }}
          >
            <Animated.View
              entering={stepAnimationIn}
              exiting={stepAnimationOut}
              key={currentStep.key}
              style={{ gap: theme.tokens.spacing.md }}
            >
              {currentStep.key === "welcome" ? (
                <>
                  <AppCard variant="highlight">
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.tokens.typography.fontSize.lg,
                        fontWeight: theme.tokens.typography.fontWeight.bold,
                      }}
                    >
                      You’ll set:
                    </Text>
                    <View style={{ gap: theme.tokens.spacing.sm }}>
                      {[
                        "Your main outcome so future planning feels relevant",
                        "Your training level so defaults don’t feel too soft or too aggressive",
                        "Your weekly rhythm, setup, and optional body stats for better context",
                      ].map((item) => (
                        <View
                          key={item}
                          style={{
                            alignItems: "flex-start",
                            flexDirection: "row",
                            gap: theme.tokens.spacing.sm,
                          }}
                        >
                          <Ionicons
                            color={theme.colors.accent}
                            name="checkmark-circle-outline"
                            size={18}
                            style={{ marginTop: 1 }}
                          />
                          <Text
                            style={{
                              color: theme.colors.textMuted,
                              flex: 1,
                              fontSize: theme.tokens.typography.fontSize.md,
                              lineHeight:
                                theme.tokens.typography.fontSize.md *
                                theme.tokens.typography.lineHeight.relaxed,
                            }}
                          >
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </AppCard>

                  <AppCard variant="muted">
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.tokens.typography.fontSize.md,
                        fontWeight: theme.tokens.typography.fontWeight.bold,
                      }}
                    >
                      Why it matters
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.tokens.typography.fontSize.sm,
                        lineHeight:
                          theme.tokens.typography.fontSize.sm *
                          theme.tokens.typography.lineHeight.relaxed,
                      }}
                    >
                      The best fitness apps keep these answers editable because your season changes.
                      Ironkor should feel just as adaptable.
                    </Text>
                  </AppCard>
                </>
              ) : null}

              {currentStep.key === "goal"
                ? GOAL_OPTIONS.map((option) => (
                    <ChoiceCard
                      key={option.value}
                      onPress={() => {
                        updateState({ primaryGoal: option.value });
                      }}
                      option={option}
                      selected={formState.primaryGoal === option.value}
                    />
                  ))
                : null}

              {currentStep.key === "experience"
                ? EXPERIENCE_OPTIONS.map((option) => (
                    <ChoiceCard
                      key={option.value}
                      onPress={() => {
                        updateState({ experienceLevel: option.value });
                      }}
                      option={option}
                      selected={formState.experienceLevel === option.value}
                    />
                  ))
                : null}

              {currentStep.key === "rhythm" ? (
                <>
                  <AppCard variant="highlight">
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.tokens.typography.fontSize.lg,
                        fontWeight: theme.tokens.typography.fontWeight.bold,
                      }}
                    >
                      Workouts per week
                    </Text>
                    <View style={{ gap: theme.tokens.spacing.sm }}>
                      {WORKOUTS_PER_WEEK_OPTIONS.map((option) => (
                        <ChoiceCard
                          key={option.value}
                          onPress={() => {
                            updateState({ workoutsPerWeek: option.value });
                          }}
                          option={option}
                          selected={formState.workoutsPerWeek === option.value}
                        />
                      ))}
                    </View>
                  </AppCard>

                  <AppCard variant="highlight">
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.tokens.typography.fontSize.lg,
                        fontWeight: theme.tokens.typography.fontWeight.bold,
                      }}
                    >
                      Typical session length
                    </Text>
                    <View style={{ gap: theme.tokens.spacing.sm }}>
                      {SESSION_DURATION_OPTIONS.map((option) => (
                        <ChoiceCard
                          key={option.value}
                          onPress={() => {
                            updateState({ sessionDurationMinutes: option.value });
                          }}
                          option={option}
                          selected={formState.sessionDurationMinutes === option.value}
                        />
                      ))}
                    </View>
                  </AppCard>
                </>
              ) : null}

              {currentStep.key === "environment" ? (
                <>
                  <AppCard variant="highlight">
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.tokens.typography.fontSize.lg,
                        fontWeight: theme.tokens.typography.fontWeight.bold,
                      }}
                    >
                      Training environment
                    </Text>
                    <View style={{ gap: theme.tokens.spacing.sm }}>
                      {TRAINING_ENVIRONMENT_OPTIONS.map((option) => (
                        <ChoiceCard
                          key={option.value}
                          onPress={() => {
                            updateState({ trainingEnvironment: option.value });
                          }}
                          option={option}
                          selected={formState.trainingEnvironment === option.value}
                        />
                      ))}
                    </View>
                  </AppCard>

                  <AppCard variant="highlight">
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.tokens.typography.fontSize.lg,
                        fontWeight: theme.tokens.typography.fontWeight.bold,
                      }}
                    >
                      Unit system
                    </Text>
                    <View style={{ gap: theme.tokens.spacing.sm }}>
                      {UNIT_SYSTEM_OPTIONS.map((option) => (
                        <ChoiceCard
                          key={option.value}
                          onPress={() => {
                            handleUnitSystemChange(option.value);
                          }}
                          option={option}
                          selected={formState.unitSystem === option.value}
                        />
                      ))}
                    </View>
                  </AppCard>
                </>
              ) : null}

              {currentStep.key === "body" ? (
                <>
                  <AppCard variant="highlight">
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.tokens.typography.fontSize.lg,
                        fontWeight: theme.tokens.typography.fontWeight.bold,
                      }}
                    >
                      Optional body data
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.tokens.typography.fontSize.sm,
                        lineHeight:
                          theme.tokens.typography.fontSize.sm *
                          theme.tokens.typography.lineHeight.relaxed,
                      }}
                    >
                      Use selectors instead of typing so your body profile feels quick, tidy, and
                      consistent across units.
                    </Text>
                    <BodyDataSelectors
                      heightCm={formState.heightCm}
                      onChangeHeightCm={(value) => {
                        updateState({ heightCm: value });
                      }}
                      onChangeWeightKg={(value) => {
                        updateState({
                          weightKg: normalizeWeightKgForUnitSystem(
                            value,
                            formState.unitSystem,
                          ),
                        });
                      }}
                      unitSystem={formState.unitSystem}
                      weightKg={formState.weightKg}
                    />
                  </AppCard>

                  <AppCard variant="muted">
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.tokens.typography.fontSize.md,
                        fontWeight: theme.tokens.typography.fontWeight.bold,
                      }}
                    >
                      Current defaults
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.tokens.typography.fontSize.sm,
                      }}
                    >
                      {summary.latestMeasurement
                        ? `Latest logged weight: ${formatWeightValue(
                            summary.latestMeasurement.weightKg,
                            formState.unitSystem,
                          )}`
                        : "No weight history yet"}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.tokens.typography.fontSize.sm,
                      }}
                    >
                      {summary.heightCm !== null
                        ? `Saved height: ${formatHeightValue(summary.heightCm, formState.unitSystem)}`
                        : "No saved height yet"}
                    </Text>
                  </AppCard>
                </>
              ) : null}

              {currentStep.key === "review" ? (
                <>
                  <AppCard variant="highlight">
                    <View style={{ gap: theme.tokens.spacing.sm }}>
                      {[
                        { label: "Goal", value: getGoalLabel(formState.primaryGoal) },
                        {
                          label: "Experience",
                          value: getExperienceLabel(formState.experienceLevel),
                        },
                        {
                          label: "Weekly rhythm",
                          value:
                            formState.workoutsPerWeek && formState.sessionDurationMinutes
                              ? `${formState.workoutsPerWeek} workouts • ${formState.sessionDurationMinutes} min`
                              : "Not set",
                        },
                        {
                          label: "Environment",
                          value: getTrainingEnvironmentLabel(formState.trainingEnvironment),
                        },
                        {
                          label: "Units",
                          value: getUnitSystemLabel(formState.unitSystem),
                        },
                        {
                          label: "Weight",
                          value:
                            formState.weightKg === null
                              ? "Add later"
                              : formatWeightValue(formState.weightKg, formState.unitSystem),
                        },
                        {
                          label: "Height",
                          value:
                            formState.heightCm === null
                              ? "Add later"
                              : formatHeightValue(formState.heightCm, formState.unitSystem),
                        },
                      ].map((entry) => (
                        <View
                          key={entry.label}
                          style={{
                            alignItems: "center",
                            flexDirection: "row",
                            gap: theme.tokens.spacing.md,
                            justifyContent: "space-between",
                          }}
                        >
                          <Text
                            style={{
                              color: theme.colors.textMuted,
                              fontSize: theme.tokens.typography.fontSize.sm,
                            }}
                          >
                            {entry.label}
                          </Text>
                          <Text
                            style={{
                              color: theme.colors.text,
                              flex: 1,
                              fontSize: theme.tokens.typography.fontSize.md,
                              fontWeight: theme.tokens.typography.fontWeight.bold,
                              textAlign: "right",
                            }}
                          >
                            {entry.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </AppCard>

                  <AppCard variant="muted">
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: theme.tokens.typography.fontSize.md,
                        fontWeight: theme.tokens.typography.fontWeight.bold,
                      }}
                    >
                      After this
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.tokens.typography.fontSize.sm,
                        lineHeight:
                          theme.tokens.typography.fontSize.sm *
                          theme.tokens.typography.lineHeight.relaxed,
                      }}
                    >
                      Your training profile stays visible in Settings, and weight changes become
                      part of your body-data history rather than replacing the past.
                    </Text>
                  </AppCard>
                </>
              ) : null}
            </Animated.View>

            {fieldError ? (
              <Text
                style={{
                  color: theme.colors.error,
                  fontSize: theme.tokens.typography.fontSize.sm,
                  fontWeight: theme.tokens.typography.fontWeight.medium,
                }}
              >
                {fieldError}
              </Text>
            ) : null}

            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                gap: theme.tokens.spacing.sm,
              }}
            >
              {currentStepIndex > 0 ? (
                <AppButton
                  icon={<Ionicons color={theme.colors.text} name="arrow-back-outline" size={16} />}
                  label="Back"
                  onPress={handleBack}
                  size="md"
                  variant="secondary"
                />
              ) : null}

              {currentStep.key === "body" ? (
                <AppButton
                  label="Add later"
                  onPress={() => {
                    updateState({ heightCm: null, weightKg: null });
                    void handleAdvance();
                  }}
                  size="md"
                  variant="ghost"
                />
              ) : null}

              <View style={{ flex: 1 }} />

              <AppButton
                fullWidth={false}
                icon={
                  <Ionicons
                    color={theme.colors.onAccent}
                    name={
                      currentStep.key === "review"
                        ? "checkmark-outline"
                        : "arrow-forward-outline"
                    }
                    size={16}
                  />
                }
                label={currentStep.key === "review" ? "Finish setup" : "Continue"}
                loading={isSubmitting}
                onPress={() => {
                  void handleAdvance();
                }}
                size="lg"
                variant="accent"
              />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      {AlertModal}
    </SafeScreen>
  );
}
