import { describe, expect, test } from "vitest";

import { resolveSignInMethod } from "./resolveSignInMethod";

describe("resolveSignInMethod", () => {
  test("resolves email and password users", () => {
    expect(
      resolveSignInMethod({
        lastAuthenticationStrategy: "password",
      }),
    ).toMatchObject({
      iconName: "key-outline",
      label: "Email + password",
    });
  });

  test("resolves Google and Apple OAuth providers", () => {
    expect(
      resolveSignInMethod({
        lastAuthenticationStrategy: "oauth_google",
      }),
    ).toMatchObject({
      iconName: "logo-google",
      label: "Google",
    });

    expect(
      resolveSignInMethod({
        lastAuthenticationStrategy: "oauth_apple",
      }),
    ).toMatchObject({
      iconName: "logo-apple",
      label: "Apple",
    });
  });

  test("cleans unknown oauth provider labels", () => {
    expect(
      resolveSignInMethod({
        lastAuthenticationStrategy: "oauth_custom_test_provider",
      }),
    ).toMatchObject({
      iconName: "globe-outline",
      label: "Test Provider",
    });
  });

  test("falls back to a verified external account provider when strategy is missing", () => {
    expect(
      resolveSignInMethod({
        user: {
          verifiedExternalAccounts: [{ provider: "github" }],
        },
      }),
    ).toMatchObject({
      iconName: "logo-github",
      label: "GitHub",
    });
  });

  test("falls back to email or a generic Clerk label when no strategy is available", () => {
    expect(
      resolveSignInMethod({
        user: {
          passwordEnabled: true,
        },
      }),
    ).toMatchObject({
      iconName: "key-outline",
      label: "Email + password",
    });

    expect(
      resolveSignInMethod({
        user: {
          passwordEnabled: false,
        },
      }),
    ).toMatchObject({
      iconName: "shield-checkmark-outline",
      label: "Clerk account",
    });
  });
});
