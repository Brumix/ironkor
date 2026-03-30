import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

function fromRoot(...segments: string[]) {
  return path.resolve(rootDir, ...segments);
}

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${fromRoot("apps/mobile/src")}/`,
      },
      {
        find: /^@convex\//,
        replacement: `${fromRoot("convex")}/`,
      },
      {
        find: /^@ironkor\/shared$/,
        replacement: fromRoot("packages/shared/constants.ts"),
      },
      {
        find: /^@ironkor\/shared\/(.*)$/,
        replacement: `${fromRoot("packages/shared")}/$1.ts`,
      },
    ],
  },
  test: {
    environment: "edge-runtime",
    include: [
      "convex/tests/**/*.test.ts",
      "apps/mobile/tests/**/*.test.ts",
    ],
  },
});
