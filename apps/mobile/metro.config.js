const path = require("path");
const { getPostHogExpoConfig } = require("posthog-react-native/metro");
const { getDefaultConfig } = require("expo/metro-config");

const repoRoot = path.resolve(__dirname, "../..");

const config = getPostHogExpoConfig(__dirname, { getDefaultConfig });

// Allow Metro to resolve packages from the monorepo root
config.watchFolders = [...new Set([...(config.watchFolders ?? []), repoRoot])];

// Ensure Metro can resolve workspace packages
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(repoRoot, "node_modules"),
];

module.exports = config;
