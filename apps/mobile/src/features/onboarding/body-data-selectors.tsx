import { useMemo, useState } from "react";
import { View } from "react-native";

import type { UserUnitSystem } from "@ironkor/shared/enums";

import AppButton from "@/components/ui/AppButton";
import SelectorModal from "@/components/ui/selector-modal";
import {
  buildFeetSelectorOptions,
  buildInchesSelectorOptions,
  buildMetricHeightSelectorOptions,
  buildWeightSelectorOptions,
  convertFeetAndInchesToCm,
  convertWeightToKg,
  formatHeightValue,
  formatWeightValue,
  toDisplayedImperialHeightParts,
  toDisplayedMetricHeightValue,
  toDisplayedWeightValue,
} from "@/features/onboarding/helpers";
import SelectorFieldCard from "@/features/onboarding/selector-field-card";
import { useTheme } from "@/theme";

type BodySelectorKind = "feet" | "heightMetric" | "inches" | "weight" | null;

interface BodyDataSelectorsProps {
  heightCm: number | null;
  onChangeHeightCm: (value: number | null) => void;
  onChangeWeightKg: (value: number | null) => void;
  showHeightClearAction?: boolean;
  unitSystem: UserUnitSystem;
  weightKg: number | null;
}

export default function BodyDataSelectors({
  heightCm,
  onChangeHeightCm,
  onChangeWeightKg,
  showHeightClearAction = false,
  unitSystem,
  weightKg,
}: BodyDataSelectorsProps) {
  const { theme } = useTheme();
  const [activeSelector, setActiveSelector] = useState<BodySelectorKind>(null);

  const weightOptions = useMemo(
    () => buildWeightSelectorOptions(unitSystem),
    [unitSystem],
  );
  const metricHeightOptions = useMemo(
    () => buildMetricHeightSelectorOptions(),
    [],
  );
  const feetOptions = useMemo(() => buildFeetSelectorOptions(), []);

  const selectedWeightValue = toDisplayedWeightValue(weightKg, unitSystem);
  const selectedMetricHeight = toDisplayedMetricHeightValue(heightCm);
  const selectedImperialHeight = toDisplayedImperialHeightParts(heightCm);
  const inchOptions = useMemo(
    () => buildInchesSelectorOptions(selectedImperialHeight.feet),
    [selectedImperialHeight.feet],
  );

  return (
    <>
      <SelectorFieldCard
        helperText={`Tap to choose in ${unitSystem === "imperial" ? "lb" : "kg"}`}
        iconName="scale-outline"
        label="Current weight"
        onPress={() => {
          setActiveSelector("weight");
        }}
        placeholder="Add current weight"
        value={weightKg === null ? null : formatWeightValue(weightKg, unitSystem)}
      />

      {unitSystem === "imperial" ? (
        <View style={{ flexDirection: "row", gap: theme.tokens.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <SelectorFieldCard
              helperText="Feet"
              iconName="resize-outline"
              label="Height"
              onPress={() => {
                setActiveSelector("feet");
              }}
              placeholder="Feet"
              value={heightCm === null ? null : `${selectedImperialHeight.feet} ft`}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectorFieldCard
              helperText="Inches"
              iconName="swap-vertical-outline"
              label="Height"
              onPress={() => {
                setActiveSelector("inches");
              }}
              placeholder="Inches"
              value={heightCm === null ? null : `${selectedImperialHeight.inches} in`}
            />
          </View>
        </View>
      ) : (
        <SelectorFieldCard
          helperText="Tap to choose in centimeters"
          iconName="resize-outline"
          label="Height"
          onPress={() => {
            setActiveSelector("heightMetric");
          }}
          placeholder="Add height"
          value={heightCm === null ? null : formatHeightValue(heightCm, unitSystem)}
        />
      )}

      {showHeightClearAction && heightCm !== null ? (
        <AppButton
          label="Remove height"
          onPress={() => {
            onChangeHeightCm(null);
          }}
          size="sm"
          variant="ghost"
        />
      ) : null}

      <SelectorModal
        message={`Select your current weight in ${unitSystem === "imperial" ? "pounds" : "kilograms"}.`}
        onRequestClose={() => {
          setActiveSelector(null);
        }}
        onSelect={(value) => {
          if (typeof value !== "number") {
            return;
          }

          onChangeWeightKg(
            convertWeightToKg(value, unitSystem),
          );
        }}
        options={weightOptions}
        selectedValue={selectedWeightValue}
        title="Current weight"
        visible={activeSelector === "weight"}
      />

      <SelectorModal
        message="Select your height in centimeters."
        onRequestClose={() => {
          setActiveSelector(null);
        }}
        onSelect={(value) => {
          if (typeof value !== "number") {
            return;
          }

          onChangeHeightCm(value);
        }}
        options={metricHeightOptions}
        selectedValue={selectedMetricHeight}
        title="Height"
        visible={activeSelector === "heightMetric"}
      />

      <SelectorModal
        message="Select the feet portion of your height."
        onRequestClose={() => {
          setActiveSelector(null);
        }}
        onSelect={(value) => {
          if (typeof value !== "number") {
            return;
          }

          onChangeHeightCm(
            convertFeetAndInchesToCm(value, selectedImperialHeight.inches),
          );
        }}
        options={feetOptions}
        selectedValue={selectedImperialHeight.feet}
        title="Height"
        visible={activeSelector === "feet"}
      />

      <SelectorModal
        message="Select the inches portion of your height."
        onRequestClose={() => {
          setActiveSelector(null);
        }}
        onSelect={(value) => {
          if (typeof value !== "number") {
            return;
          }

          onChangeHeightCm(
            convertFeetAndInchesToCm(selectedImperialHeight.feet, value),
          );
        }}
        options={inchOptions}
        selectedValue={selectedImperialHeight.inches}
        title="Height"
        visible={activeSelector === "inches"}
      />
    </>
  );
}
