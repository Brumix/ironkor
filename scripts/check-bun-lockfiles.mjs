import { readdir } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const allowedLockfile = path.join(repoRoot, "bun.lock");
const excludedDirs = new Set([
  ".git",
  "node_modules",
  ".expo",
  ".next",
  "dist",
  "build",
  ".cursor",
]);

async function collectNestedLockfiles(dir, matches = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirs.has(entry.name)) {
        await collectNestedLockfiles(absolutePath, matches);
      }
      continue;
    }

    if (entry.isFile() && entry.name === "bun.lock" && absolutePath !== allowedLockfile) {
      matches.push(path.relative(repoRoot, absolutePath));
    }
  }

  return matches;
}

async function main() {
  const nestedLockfiles = await collectNestedLockfiles(repoRoot);
  if (nestedLockfiles.length === 0) {
    console.log("OK: only root bun.lock found");
    return;
  }

  console.error("Error: nested bun.lock files are not allowed.");
  for (const lockfilePath of nestedLockfiles.sort()) {
    console.error(` - ${lockfilePath}`);
  }
  process.exit(1);
}

await main();
