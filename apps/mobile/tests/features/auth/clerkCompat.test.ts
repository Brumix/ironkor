import { describe, expect, test, vi } from "vitest";

import {
  fetchConvexAccessTokenWithFallback,
  getConvexSessionAudience,
} from "@/features/auth/clerkCompat";

describe("getConvexSessionAudience", () => {
  test("uses the native Clerk session when the Convex audience is present", () => {
    expect(getConvexSessionAudience("convex")).toBe("native");
    expect(getConvexSessionAudience(["profile", "convex"])).toBe("native");
  });

  test("falls back to the Convex JWT template when the session audience is missing", () => {
    expect(getConvexSessionAudience(null)).toBe("template");
    expect(getConvexSessionAudience(undefined)).toBe("template");
    expect(getConvexSessionAudience("other-audience")).toBe("template");
    expect(getConvexSessionAudience(["profile", "email"])).toBe("template");
  });

  test("falls back to the native token when the template token is not ready yet", async () => {
    const getToken = vi.fn((options?: { skipCache?: boolean; template?: string }) =>
      Promise.resolve(options?.template === "convex" ? null : "native-token"),
    );

    await expect(
      fetchConvexAccessTokenWithFallback({
        forceRefreshToken: false,
        getToken,
        preferredAudience: "template",
      }),
    ).resolves.toBe("native-token");

    expect(getToken).toHaveBeenNthCalledWith(1, {
      skipCache: false,
      template: "convex",
    });
    expect(getToken).toHaveBeenNthCalledWith(2, {
      skipCache: false,
    });
  });

  test("falls back to the template token when the native session token is unavailable", async () => {
    const getToken = vi.fn((options?: { skipCache?: boolean; template?: string }) =>
      Promise.resolve(options?.template ? "template-token" : null),
    );

    await expect(
      fetchConvexAccessTokenWithFallback({
        forceRefreshToken: true,
        getToken,
        preferredAudience: "native",
      }),
    ).resolves.toBe("template-token");

    expect(getToken).toHaveBeenNthCalledWith(1, {
      skipCache: true,
    });
    expect(getToken).toHaveBeenNthCalledWith(2, {
      skipCache: true,
      template: "convex",
    });
  });
});
