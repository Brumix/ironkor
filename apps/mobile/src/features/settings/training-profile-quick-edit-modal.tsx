import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import AppButton from "@/components/ui/AppButton";
import ModalCardShell from "@/components/ui/ModalCardShell";
import SelectorModal from "@/components/ui/selector-modal";
import BodyDataSelectors from "@/features/onboarding/body-data-selectors";
import {
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  SESSION_DURATION_OPTIONS,
  TRAINING_ENVIRONMENT_OPTIONS,
  UNIT_SYSTEM_OPTIONS,
  WORKOUTS_PER_WEEK_OPTIONS,
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
import SelectorFieldCard from "@/features/onboarding/selector-field-card";
import {
  buildInitialOnboardingFormState,
  type OnboardingFormState,
  type OnboardingSummaryState,
} from "@/features/onboarding/state";
import { useTheme } from "@/theme";

export type TrainingProfileQuickEditSection =
  | "body"
  | "experience"
  | "goal"
  | "rhythm"
  | "setup";

type QuickSelectorKind =
  | "duration"
  | "environment"
  | "experience"
  | "goal"
  | "unit"
  | "workouts"
  | null;

interface TrainingProfileQuickEditModalProps {
  onClose: () => void;
  onShowError: (args: { message: string; title: string }) => void;
  profileSummary: OnboardingSummaryState | null | undefined;
  section: TrainingProfileQuickEditSection | null;
  visible: boolean;
}

const SECTION_TITLES: Record<TrainingProfileQuickEditSection, string> = {
  goal: "Edit goal",
  experience: "Edit experience",
  rhythm: "Edit training rhythm",
  setup: "Edit training setup",
  body: "Edit body data",
};

const SECTION_MESSAGES: Record<TrainingProfileQuickEditSection, string> = {
  goal: "Change the outcome you want Ironkor to lean toward by default.",
  experience: "Adjust how advanced your training should feel inside the app.",
  rhythm: "Update the cadence and session length that feel realistic right now.",
  setup: "Keep your training environment and unit system aligned with how you log.",
  body: "Height updates your profile. A different weight adds a new body-data entry.",
};

function isSectionSaveDisabled(
  draft: OnboardingFormState | null,
  section: TrainingProfileQuickEditSection | null,
) {
  if (!draft || !section) {
    return true;
  }

  switch (section) {
    case "goal":
      return draft.primaryGoal === null;
    case "experience":
      return draft.experienceLevel === null;
    case "rhythm":
      return draft.workoutsPerWeek === null || draft.sessionDurationMinutes === null;
    case "setup":
      return draft.trainingEnvironment === null;
    case "body":
      return false;
  }
}

export default function TrainingProfileQuickEditModal({
  onClose,
  onShowError,
  profileSummary,
  section,
  visible,
}: TrainingProfileQuickEditModalProps) {
  const { theme } = useTheme();
  const updateTrainingProfile = useMutation(api.profile.updateTrainingProfile);
  const logWeight = useMutation(api.profile.logWeight);

  const [draft, setDraft] = useState<OnboardingFormState | null>(null);
  const [initialDraft, setInitialDraft] = useState<OnboardingFormState | null>(null);
  const [activeSelector, setActiveSelector] = useState<QuickSelectorKind>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !profileSummary) {
      setActiveSelector(null);
      setDraft(null);
      setInitialDraft(null);
      setIsSubmitting(false);
      return;
    }

    const nextDraft = buildInitialOnboardingFormState(profileSummary);
    setDraft(nextDraft);
    setInitialDraft(nextDraft);
    setActiveSelector(null);
    setIsSubmitting(false);
  }, [profileSummary, visible, section]);

  const selectorOptions = useMemo(() => {
    switch (activeSelector) {
      case "goal":
        return GOAL_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        }));
      case "experience":
        return EXPERIENCE_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        }));
      case "workouts":
        return WORKOUTS_PER_WEEK_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        }));
      case "duration":
        return SESSION_DURATION_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        }));
      case "environment":
        return TRAINING_ENVIRONMENT_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        }));
      case "unit":
        return UNIT_SYSTEM_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        }));
      default:
        return [];
    }
  }, [activeSelector]);

  const selectedSelectorValue = useMemo(() => {
    if (!draft) {
      return null;
    }

    switch (activeSelector) {
      case "goal":
        return draft.primaryGoal;
      case "experience":
        return draft.experienceLevel;
      case "workouts":
        return draft.workoutsPerWeek;
      case "duration":
        return draft.sessionDurationMinutes;
      case "environment":
        return draft.trainingEnvironment;
      case "unit":
        return draft.unitSystem;
      default:
        return null;
    }
  }, [activeSelector, draft]);

  const saveDisabled = isSectionSaveDisabled(draft, section);

  function updateDraft(patch: Partial<OnboardingFormState>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function handleSave() {
    if (!section || !draft) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (section === "goal" && draft.primaryGoal) {
        await updateTrainingProfile({
          primaryGoal: draft.primaryGoal,
        });
      }

      if (section === "experience" && draft.experienceLevel) {
        await updateTrainingProfile({
          experienceLevel: draft.experienceLevel,
        });
      }

      if (
        section === "rhythm" &&
        draft.workoutsPerWeek !== null &&
        draft.sessionDurationMinutes !== null
      ) {
        await updateTrainingProfile({
          workoutsPerWeek: draft.workoutsPerWeek,
          sessionDurationMinutes: draft.sessionDurationMinutes,
        });
      }

      if (section === "setup" && draft.trainingEnvironment) {
        await updateTrainingProfile({
          trainingEnvironment: draft.trainingEnvironment,
          unitSystem: draft.unitSystem,
        });
      }

      if (section === "body") {
        const nextHeight = normalizeHeightCmForUnitSystem(draft.heightCm, draft.unitSystem);
        const previousHeight = initialDraft?.heightCm ?? null;
        if (nextHeight !== previousHeight) {
          await updateTrainingProfile({
            height: toProfileHeightInput(nextHeight, draft.unitSystem),
            unitSystem: draft.unitSystem,
          });
        }

        const nextWeight = normalizeWeightKgForUnitSystem(draft.weightKg, draft.unitSystem);
        const previousWeight = initialDraft?.weightKg ?? null;
        if (
          nextWeight !== null &&
          (previousWeight === null || Math.abs(nextWeight - previousWeight) > 0.05)
        ) {
          const weightInput = toProfileWeightInput(nextWeight, draft.unitSystem);
          if (weightInput !== null) {
            await logWeight({
              unitSystem: draft.unitSystem,
              weight: weightInput,
            });
          }
        }
      }

      onClose();
    } catch (caughtError) {
      onShowError({
        title: "Couldn’t save changes",
        message:
          caughtError instanceof Error ? caughtError.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!section || !profileSummary || !draft) {
    return null;
  }

  return (
    <>
      <ModalCardShell
        closeOnBackdropPress={!isSubmitting}
        footer={
          <>
            <AppButton
              label="Cancel"
              onPress={onClose}
              size="sm"
              variant="secondary"
            />
            <AppButton
              disabled={saveDisabled}
              label="Save"
              loading={isSubmitting}
              onPress={() => {
                void handleSave();
              }}
              size="sm"
              variant="accent"
            />
          </>
        }
        message={SECTION_MESSAGES[section]}
        onRequestClose={onClose}
        title={SECTION_TITLES[section]}
        visible={visible}
      >
        <View style={{ gap: theme.tokens.spacing.sm }}>
          {section === "goal" ? (
            <SelectorFieldCard
              helperText="One tap opens the full goal list."
              iconName="flag-outline"
              label="Goal"
              onPress={() => {
                setActiveSelector("goal");
              }}
              value={getGoalLabel(draft.primaryGoal)}
            />
          ) : null}

          {section === "experience" ? (
            <SelectorFieldCard
              helperText="Match the pace and complexity to your current level."
              iconName="school-outline"
              label="Experience"
              onPress={() => {
                setActiveSelector("experience");
              }}
              value={getExperienceLabel(draft.experienceLevel)}
            />
          ) : null}

          {section === "rhythm" ? (
            <>
              <SelectorFieldCard
                helperText="How many days you can realistically train."
                iconName="calendar-outline"
                label="Workouts per week"
                onPress={() => {
                  setActiveSelector("workouts");
                }}
                value={
                  draft.workoutsPerWeek === null
                    ? null
                    : `${draft.workoutsPerWeek} workouts`
                }
              />
              <SelectorFieldCard
                helperText="Typical session length."
                iconName="time-outline"
                label="Session duration"
                onPress={() => {
                  setActiveSelector("duration");
                }}
                value={
                  draft.sessionDurationMinutes === null
                    ? null
                    : `${draft.sessionDurationMinutes} min`
                }
              />
            </>
          ) : null}

          {section === "setup" ? (
            <>
              <SelectorFieldCard
                helperText="Choose the setup that matches where you train."
                iconName="barbell-outline"
                label="Environment"
                onPress={() => {
                  setActiveSelector("environment");
                }}
                value={getTrainingEnvironmentLabel(draft.trainingEnvironment)}
              />
              <SelectorFieldCard
                helperText="This changes how body data is shown across the app."
                iconName="swap-horizontal-outline"
                label="Unit system"
                onPress={() => {
                  setActiveSelector("unit");
                }}
                value={getUnitSystemLabel(draft.unitSystem)}
              />
            </>
          ) : null}

          {section === "body" ? (
            <>
              <BodyDataSelectors
                heightCm={draft.heightCm}
                onChangeHeightCm={(value) => {
                  updateDraft({ heightCm: value });
                }}
                onChangeWeightKg={(value) => {
                  updateDraft({ weightKg: normalizeWeightKgForUnitSystem(value, draft.unitSystem) });
                }}
                showHeightClearAction
                unitSystem={draft.unitSystem}
                weightKg={draft.weightKg}
              />
              <View style={{ gap: theme.tokens.spacing.xxs }}>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.tokens.typography.fontSize.sm,
                  }}
                >
                  {profileSummary.latestMeasurement
                    ? `Latest logged weight: ${formatWeightValue(
                        profileSummary.latestMeasurement.weightKg,
                        draft.unitSystem,
                      )}`
                    : "No weight history yet"}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: theme.tokens.typography.fontSize.sm,
                  }}
                >
                  {profileSummary.heightCm !== null
                    ? `Saved height: ${formatHeightValue(profileSummary.heightCm, draft.unitSystem)}`
                    : "No saved height yet"}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ModalCardShell>

      <SelectorModal
        onRequestClose={() => {
          setActiveSelector(null);
        }}
        onSelect={(value) => {
          if (activeSelector === "goal" && typeof value === "string") {
            updateDraft({ primaryGoal: value as OnboardingFormState["primaryGoal"] });
          }
          if (activeSelector === "experience" && typeof value === "string") {
            updateDraft({ experienceLevel: value as OnboardingFormState["experienceLevel"] });
          }
          if (activeSelector === "workouts" && typeof value === "number") {
            updateDraft({ workoutsPerWeek: value });
          }
          if (activeSelector === "duration" && typeof value === "number") {
            updateDraft({ sessionDurationMinutes: value });
          }
          if (activeSelector === "environment" && typeof value === "string") {
            updateDraft({
              trainingEnvironment: value as OnboardingFormState["trainingEnvironment"],
            });
          }
          if (
            activeSelector === "unit" &&
            typeof value === "string" &&
            (value === "metric" || value === "imperial")
          ) {
            const nextUnitSystem = value;
            updateDraft({
              unitSystem: nextUnitSystem,
              heightCm: normalizeHeightCmForUnitSystem(draft.heightCm, nextUnitSystem),
              weightKg: normalizeWeightKgForUnitSystem(draft.weightKg, nextUnitSystem),
            });
          }
        }}
        options={selectorOptions}
        selectedValue={selectedSelectorValue}
        title={
          activeSelector === "goal"
            ? "Goal"
            : activeSelector === "experience"
              ? "Experience"
              : activeSelector === "workouts"
                ? "Workouts per week"
                : activeSelector === "duration"
                  ? "Session duration"
                  : activeSelector === "environment"
                    ? "Environment"
                    : activeSelector === "unit"
                      ? "Unit system"
                      : ""
        }
        visible={activeSelector !== null}
      />
    </>
  );
}
