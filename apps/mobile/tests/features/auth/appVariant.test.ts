import { describe, expect, test } from "vitest";

import {
  getAppBundleIdentifier,
  getAppName,
  getAppScheme,
  resolveAppVariant,
} from "@/features/auth/appVariant";

describe("appVariant", () => {
  test("defaults unknown variants to production", () => {
    expect(resolveAppVariant()).toBe("production");
    expect(resolveAppVariant("staging")).toBe("production");
  });

  test("maps bundle identifiers per variant", () => {
    expect(getAppBundleIdentifier("development")).toBe("com.ironkor.ironkor.development");
    expect(getAppBundleIdentifier("beta")).toBe("com.ironkor.ironkor.beta");
    expect(getAppBundleIdentifier("production")).toBe("com.ironkor.ironkor");
  });

  test("maps names and schemes per variant", () => {
    expect(getAppName("development")).toBe("Ironkor Dev");
    expect(getAppName("beta")).toBe("Ironkor Beta");
    expect(getAppName("production")).toBe("Ironkor");

    expect(getAppScheme("development")).toBe("ironkormobile-dev");
    expect(getAppScheme("beta")).toBe("ironkormobile-beta");
    expect(getAppScheme("production")).toBe("ironkormobile");
  });
});
