import { describe, expect, test } from "vitest";

import {
  buildInchesSelectorOptions,
  buildWeightSelectorOptions,
  formatHeightValue,
  normalizeHeightCmForUnitSystem,
  normalizeWeightKgForUnitSystem,
  toDisplayedImperialHeightParts,
  toProfileHeightInput,
} from "@/features/onboarding/helpers";

describe("onboarding helpers", () => {
  test("formats imperial height as feet and inches", () => {
    expect(formatHeightValue(180.34, "imperial")).toBe("5 ft 11 in");
  });

  test("snaps weight to the selected unit system steps", () => {
    expect(normalizeWeightKgForUnitSystem(80, "metric")).toBe(80);
    expect(normalizeWeightKgForUnitSystem(80, "imperial")).toBeCloseTo(79.832257, 5);
  });

  test("round-trips imperial height through feet and inches selectors", () => {
    const normalizedHeight = normalizeHeightCmForUnitSystem(180, "imperial");
    const parts = toDisplayedImperialHeightParts(normalizedHeight);

    expect(parts).toEqual({
      feet: 5,
      inches: 11,
    });
    expect(toProfileHeightInput(normalizedHeight, "imperial")).toBe(71);
  });

  test("limits inches options to heights inside the supported range", () => {
    expect(buildInchesSelectorOptions(7).map((option) => option.value)).not.toContain(11);
  });

  test("builds metric and imperial weight selector ranges", () => {
    expect(buildWeightSelectorOptions("metric")[0]).toEqual({
      label: "30 kg",
      value: 30,
    });
    expect(buildWeightSelectorOptions("imperial")[0]).toEqual({
      label: "66 lb",
      value: 66,
    });
  });
});
