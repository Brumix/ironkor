import type { AuthConfig } from "convex/server";

import { requireEnv } from "./env";

export default {
  providers: [
    {
      domain: requireEnv("CLERK_JWT_ISSUER_DOMAIN"),
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
