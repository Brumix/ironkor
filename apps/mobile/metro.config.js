const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve packages from the monorepo root
config.watchFolders = [repoRoot];

// Ensure Metro can resolve workspace packages
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(repoRoot, "node_modules"),
];

module.exports = config;
