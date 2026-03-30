import { describe, expect, test } from "vitest";

import {
  getAppBundleIdentifier,
  getAppName,
  getAppScheme,
  getAppSchemes,
  resolveAppVariant,
} from "@/features/auth/appVariant";

describe("appVariant", () => {
  test("defaults unknown variants to production", () => {
    expect(resolveAppVariant()).toBe("production");
    expect(resolveAppVariant("staging")).toBe("production");
  });

  test("maps bundle identifiers per variant", () => {
    expect(getAppBundleIdentifier("development")).toBe("com.ironkor.development");
    expect(getAppBundleIdentifier("beta")).toBe("com.ironkor.beta");
    expect(getAppBundleIdentifier("production")).toBe("com.ironkor");
  });

  test("maps names and schemes per variant", () => {
    expect(getAppName("development")).toBe("Ironkor Dev");
    expect(getAppName("beta")).toBe("Ironkor Beta");
    expect(getAppName("production")).toBe("Ironkor");

    expect(getAppScheme("development")).toBe("ironkor");
    expect(getAppScheme("beta")).toBe("ironkor");
    expect(getAppScheme("production")).toBe("ironkor");

    expect(getAppSchemes("development")).toEqual(["ironkor"]);
    expect(getAppSchemes("beta")).toEqual(["ironkor"]);
    expect(getAppSchemes("production")).toEqual(["ironkor"]);
  });
});
