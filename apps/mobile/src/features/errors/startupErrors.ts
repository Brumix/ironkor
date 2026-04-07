import { resolveAuthErrorMessage } from "@/features/auth/clerkErrors";

const DUPLICATE_ACTIVE_USER_PREFIX = "Duplicate active users found for identity ";

export function resolveStartupErrorMessage(error: unknown, fallback: string) {
  const resolvedMessage = resolveAuthErrorMessage(error, fallback);

  if (resolvedMessage.startsWith(DUPLICATE_ACTIVE_USER_PREFIX)) {
    return "We found duplicate workspace records for this account in the current environment. Run the duplicate-user repair migration for this deployment, then try again.";
  }

  if (resolvedMessage === "Viewer profile not found.") {
    return "We couldn't find your workspace profile in the current environment. Sign out and back in, then inspect the deployment user records if it still happens.";
  }

  return resolvedMessage;
}
