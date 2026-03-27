import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { memo, useCallback, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import AppTextField from "@/components/ui/AppTextField";
import InfoPopoverButton from "@/components/ui/InfoPopoverButton";
import type { ProgrammingDraft } from "@/features/workout/programmingDraft";
import { useTheme } from "@/theme";

const REPS_PRESETS = ["5", "6-8", "8", "10", "8-12", "12-15", "15-20"] as const;
const REST_PRESETS = ["30", "45", "60", "90", "120", "180"] as const;
const TEMPO_PRESETS = ["2-0-2", "3-0-1", "4-0-1", "3-1-2"] as const;
const RIR_PRESETS = ["0", "1", "2", "3", "4"] as const;

function lightHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

interface FieldLabelWithHelpProps {
  label: string;
  helpTitle: string;
  helpMessage: string;
  helpAccessibilityLabel: string;
  labelStyle: TextStyle;
  labelRowStyle: ViewStyle;
}

function FieldLabelWithHelp({
  label,
  helpTitle,
  helpMessage,
  helpAccessibilityLabel,
  labelStyle,
  labelRowStyle,
}: FieldLabelWithHelpProps) {
  return (
    <View style={labelRowStyle}>
      <Text style={labelStyle}>{label}</Text>
      <InfoPopoverButton
        accessibilityLabel={helpAccessibilityLabel}
        compact
        message={helpMessage}
        title={helpTitle}
      />
    </View>
  );
}

interface ExerciseProgrammingFormProps {
  draft: ProgrammingDraft;
  onChange: (next: ProgrammingDraft) => void;
  /** Called when the notes field is focused (e.g. parent ScrollView can scroll into view). */
  onNotesFocus?: () => void;
}

function ExerciseProgrammingForm({ draft, onChange, onNotesFocus }: ExerciseProgrammingFormProps) {
  const { theme } = useTheme();
  const isCustomTempo =
    draft.tempo !== "" && !TEMPO_PRESETS.includes(draft.tempo as (typeof TEMPO_PRESETS)[number]);
  const [showCustomReps, setShowCustomReps] = useState(
    () => !REPS_PRESETS.includes(draft.repsText as (typeof REPS_PRESETS)[number]),
  );
  const [showCustomTempo, setShowCustomTempo] = useState(() => isCustomTempo);

  const update = useCallback(
    (patch: Partial<ProgrammingDraft>) => {
      onChange({ ...draft, ...patch });
    },
    [draft, onChange],
  );

  const stepSets = useCallback(
    (delta: number) => {
      const current = Math.max(1, Math.floor(Number(draft.sets) || 3));
      const next = Math.max(1, Math.min(20, current + delta));
      lightHaptic();
      update({ sets: `${next}` });
    },
    [draft.sets, update],
  );

  const stepWeight = useCallback(
    (delta: number) => {
      const current = Number(draft.targetWeightKg) || 0;
      const next = Math.max(0, Math.round((current + delta) * 10) / 10);
      lightHaptic();
      update({ targetWeightKg: next === 0 ? "" : `${next}` });
    },
    [draft.targetWeightKg, update],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: {
          gap: theme.tokens.spacing.xs,
        },
        labelRow: {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: theme.tokens.spacing.xxs,
        },
        label: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.xs,
          fontWeight: theme.tokens.typography.fontWeight.bold,
          textTransform: "uppercase",
          letterSpacing: theme.tokens.typography.letterSpacing.caps,
        },
        stepperRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: theme.tokens.spacing.sm,
        },
        stepperBtn: {
          width: theme.tokens.layout.minTouchTarget,
          height: theme.tokens.layout.minTouchTarget,
          borderRadius: theme.tokens.radius.md,
          backgroundColor: theme.colors.secondarySoft,
          borderWidth: theme.tokens.spacing.hairline,
          borderColor: theme.colors.border,
          alignItems: "center",
          justifyContent: "center",
        },
        stepperValue: {
          minWidth: theme.tokens.spacing["4xl"],
          textAlign: "center",
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize["2xl"],
          fontWeight: theme.tokens.typography.fontWeight.black,
        },
        stepperUnit: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.medium,
        },
        chipRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.tokens.spacing.xs,
        },
        chip: {
          minWidth: theme.tokens.layout.chipMinWidth,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xs + theme.tokens.spacing.xxs / 2,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: theme.tokens.spacing.hairline,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.secondarySoft,
        },
        chipActive: {
          backgroundColor: theme.colors.accentSoft,
          borderColor: theme.colors.borderAccent,
        },
        chipText: {
          color: theme.colors.text,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.bold,
        },
        chipTextActive: {
          color: theme.colors.accent,
        },
        inlineInput: {
          flex: 1,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.tokens.radius.sm,
          borderWidth: theme.tokens.spacing.hairline,
          borderColor: theme.colors.border,
          color: theme.colors.text,
          paddingHorizontal: theme.tokens.spacing.sm,
          paddingVertical: theme.tokens.spacing.xs + theme.tokens.spacing.xxs / 2,
          fontSize: theme.tokens.typography.fontSize.sm,
          fontWeight: theme.tokens.typography.fontWeight.medium,
          minHeight: theme.tokens.layout.inlineInputMinHeight,
        },
        restLabel: {
          color: theme.colors.textMuted,
          fontSize: theme.tokens.typography.fontSize.xs,
        },
      }),
    [theme],
  );

  return (
    <View style={{ gap: theme.tokens.spacing.md }}>
      {/* Sets - Stepper */}
      <View style={styles.section}>
        <FieldLabelWithHelp
          helpAccessibilityLabel="Show sets help"
          helpMessage="How many rounds of this exercise you plan before moving on. One set is one continuous block of reps, then you rest (if you use rest)."
          helpTitle="Sets"
          label="Sets"
          labelRowStyle={styles.labelRow}
          labelStyle={styles.label}
        />
        <View style={styles.stepperRow}>
          <Pressable style={styles.stepperBtn} onPress={() => { stepSets(-1); }}>
            <Ionicons name="remove" size={theme.tokens.icon.lg} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.stepperValue}>{draft.sets || "3"}</Text>
          <Pressable style={styles.stepperBtn} onPress={() => { stepSets(1); }}>
            <Ionicons name="add" size={theme.tokens.icon.lg} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Reps - Chips + optional custom */}
      <View style={styles.section}>
        <FieldLabelWithHelp
          helpAccessibilityLabel="Show reps help"
          helpMessage="Rep range or count for each set (for example 8-12 or 10). Tap Other to type something custom like AMRAP or a note."
          helpTitle="Reps"
          label="Reps"
          labelRowStyle={styles.labelRow}
          labelStyle={styles.label}
        />
        <View style={styles.chipRow}>
          {REPS_PRESETS.map((preset) => {
            const active = !showCustomReps && draft.repsText === preset;
            return (
              <Pressable
                key={preset}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  lightHaptic();
                  setShowCustomReps(false);
                  update({ repsText: preset });
                }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {preset}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.chip, showCustomReps && styles.chipActive]}
            onPress={() => {
              setShowCustomReps(true);
            }}
          >
            <Text style={[styles.chipText, showCustomReps && styles.chipTextActive]}>
              Other
            </Text>
          </Pressable>
        </View>
        {showCustomReps ? (
          <TextInput
            style={styles.inlineInput}
            value={draft.repsText}
            onChangeText={(value) => { update({ repsText: value }); }}
            placeholder="e.g. 6-8 or AMRAP"
            placeholderTextColor={theme.colors.textSubtle}
          />
        ) : null}
      </View>

      {/* Target weight - Stepper */}
      <View style={styles.section}>
        <FieldLabelWithHelp
          helpAccessibilityLabel="Show target weight help"
          helpMessage="Optional planned load in kilograms. Lower it back to 0 if you do not want a target written down for this exercise."
          helpTitle="Target weight (kg)"
          label="Target weight (kg)"
          labelRowStyle={styles.labelRow}
          labelStyle={styles.label}
        />
        <View style={styles.stepperRow}>
          <Pressable style={styles.stepperBtn} onPress={() => { stepWeight(-2.5); }}>
            <Ionicons name="remove" size={theme.tokens.icon.lg} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.stepperValue}>
            {draft.targetWeightKg || "—"}
          </Text>
          <Text style={styles.stepperUnit}>kg</Text>
          <Pressable style={styles.stepperBtn} onPress={() => { stepWeight(2.5); }}>
            <Ionicons name="add" size={theme.tokens.icon.lg} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Rest - Chips */}
      <View style={styles.section}>
        <FieldLabelWithHelp
          helpAccessibilityLabel="Show rest help"
          helpMessage="How long to recover between sets, in seconds. This is not the same as tempo (how you move each rep). Tap a time to select it; tap again to clear."
          helpTitle="Rest (seconds)"
          label="Rest (seconds)"
          labelRowStyle={styles.labelRow}
          labelStyle={styles.label}
        />
        <View style={styles.chipRow}>
          {REST_PRESETS.map((preset) => {
            const active = draft.restSeconds === preset;
            const displayLabel = Number(preset) >= 60 ? `${Number(preset) / 60}m` : `${preset}s`;
            return (
              <Pressable
                key={preset}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  lightHaptic();
                  update({ restSeconds: active ? "" : preset });
                }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {displayLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {draft.restSeconds !== "" &&
        !REST_PRESETS.includes(draft.restSeconds as (typeof REST_PRESETS)[number]) ? (
          <Text style={styles.restLabel}>Custom: {draft.restSeconds}s</Text>
        ) : null}
      </View>

      {/* Tempo - Chips + optional custom */}
      <View style={styles.section}>
        <FieldLabelWithHelp
          helpAccessibilityLabel="Show tempo help"
          helpMessage="Timing for each part of one rep. For example 2-0-2 often means: seconds on the lowering phase, pause at the bottom, seconds on the lifting phase. It is separate from rest between sets. Tap a selection again to clear."
          helpTitle="Tempo (optional)"
          label="Tempo (optional)"
          labelRowStyle={styles.labelRow}
          labelStyle={styles.label}
        />
        <View style={styles.chipRow}>
          {TEMPO_PRESETS.map((preset) => {
            const active = !showCustomTempo && draft.tempo === preset;
            return (
              <Pressable
                key={preset}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  lightHaptic();
                  setShowCustomTempo(false);
                  update({ tempo: active ? "" : preset });
                }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {preset}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.chip, showCustomTempo && styles.chipActive]}
            onPress={() => {
              lightHaptic();
              if (showCustomTempo) {
                setShowCustomTempo(false);
                update({ tempo: "" });
                return;
              }

              setShowCustomTempo(true);
              if (!isCustomTempo) {
                update({ tempo: "" });
              }
            }}
          >
            <Text
              style={[
                styles.chipText,
                showCustomTempo && styles.chipTextActive,
              ]}
            >
              Other
            </Text>
          </Pressable>
        </View>
        {showCustomTempo ? (
          <TextInput
            style={styles.inlineInput}
            value={draft.tempo}
            onChangeText={(value) => { update({ tempo: value }); }}
            placeholder="e.g. 3-1-1-0"
            placeholderTextColor={theme.colors.textSubtle}
          />
        ) : null}
      </View>

      {/* RIR - Chips */}
      <View style={styles.section}>
        <FieldLabelWithHelp
          helpAccessibilityLabel="Show RIR help"
          helpMessage="Reps in reserve: how many good reps you feel you could still do before failure after the set. 0 means at or very near failure; higher numbers mean you stop with more left in the tank. Tap a selection again to clear."
          helpTitle="RIR (optional)"
          label="RIR (optional)"
          labelRowStyle={styles.labelRow}
          labelStyle={styles.label}
        />
        <View style={styles.chipRow}>
          {RIR_PRESETS.map((preset) => {
            const active = draft.rir === preset;
            return (
              <Pressable
                key={preset}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  lightHaptic();
                  update({ rir: active ? "" : preset });
                }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {preset}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <FieldLabelWithHelp
          helpAccessibilityLabel="Show notes help"
          helpMessage="Anything you want to remember for this exercise: form cues, which machine, pain flags, or reminders for next time."
          helpTitle="Notes (optional)"
          label="Notes (optional)"
          labelRowStyle={styles.labelRow}
          labelStyle={styles.label}
        />
        <AppTextField
          value={draft.notes}
          onChangeText={(value) => { update({ notes: value }); }}
          onFocus={() => { onNotesFocus?.(); }}
          placeholder="Add notes..."
          multiline
        />
      </View>
    </View>
  );
}

export default memo(ExerciseProgrammingForm);
