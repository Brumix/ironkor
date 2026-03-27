import { expect, test, vi } from "vitest";

import { activateAuthSession, type SetActiveLike } from "./activateAuthSession";

test("routes authenticated users to the workout home when no auth task is pending", async () => {
  const replace = vi.fn();
  const setActive: SetActiveLike = async ({ navigate }) => {
    await navigate({ session: {} });
  };

  await activateAuthSession(setActive, "sess_123", { replace });

  expect(replace).toHaveBeenCalledWith("/(workout)/home");
});

test("routes authenticated users to the auth task screen when Clerk reports pending work", async () => {
  const replace = vi.fn();
  const setActive: SetActiveLike = async ({ navigate }) => {
    await navigate({ session: { currentTask: { key: "reset-password" } } });
  };

  await activateAuthSession(setActive, "sess_456", { replace });

  expect(replace).toHaveBeenCalledWith("/auth-task");
});
