const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const projectRoot = __dirname.replace(/\\/g, "/");
const projectOnly = (segment) =>
  new RegExp(`${projectRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/${segment}`);

const blockList = [
  projectOnly("scripts/.*"),
  projectOnly("archive/.*"),
  projectOnly("artifacts/.*"),
  projectOnly("dist/.*"),
  projectOnly("tools/.*"),
  projectOnly("supabase/.*"),
  projectOnly("docs/.*"),
  projectOnly(".*\\.test\\.(ts|tsx)$"),
];

config.resolver.blockList = [...(config.resolver.blockList ?? []), ...blockList];

module.exports = config;
