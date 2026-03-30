import { describe, expect, test } from "vitest";

import {
  getClerkGlobalError,
  resolveAuthErrorMessage,
  resolveAuthFormErrorMessage,
} from "@/features/auth/clerkErrors";

describe("getClerkGlobalError", () => {
  test("skips excluded field errors when resolving a global message", () => {
    const error = {
      errors: [
        {
          longMessage: "Passwords must be 8 characters or more.",
          meta: { paramName: "password" },
        },
        {
          longMessage: "Something else went wrong.",
        },
      ],
    };

    expect(
      getClerkGlobalError(error, {
        excludeFields: ["password"],
      }),
    ).toBe("Something else went wrong.");
  });

  test("returns undefined when all errors are excluded field errors", () => {
    const error = {
      errors: [
        {
          longMessage: "Passwords must be 8 characters or more.",
          meta: { paramName: "password" },
        },
      ],
    };

    expect(
      getClerkGlobalError(error, {
        excludeFields: ["password"],
      }),
    ).toBeUndefined();
  });

  test("uses the fallback when only excluded field errors exist", () => {
    const error = {
      errors: [
        {
          longMessage: "Passwords must be 8 characters or more.",
          meta: { paramName: "password" },
        },
      ],
    };

    expect(
      resolveAuthErrorMessage(error, "We couldn't create your account.", {
        excludeFields: ["password"],
      }),
    ).toBe("We couldn't create your account.");
  });

  test("suppresses form-level output when only excluded field errors exist", () => {
    const error = {
      errors: [
        {
          longMessage: "Passwords must be 8 characters or more.",
          meta: { paramName: "password" },
        },
      ],
    };

    expect(
      resolveAuthFormErrorMessage(error, "We couldn't create your account.", {
        excludeFields: ["password"],
      }),
    ).toBeNull();
  });
});
