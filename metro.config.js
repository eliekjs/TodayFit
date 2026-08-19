const { getDefaultConfig } = require("expo/metro-config");

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
  projectOnly("logic/.*/_audit.*\\.(ts|tsx)$"),
  projectOnly("\\.cursor/.*"),
  // Script/export catalogs — hashing these as JS stalls Metro and inflates the download.
  projectOnly("data/workout-exercise-catalog\\.json$"),
  projectOnly("data/generator-eligibility-by-id\\.json$"),
  projectOnly("data/exerciseDescriptions\\.curated\\.json$"),
  // Static TS catalogs are Node-only; native/web use `staticExerciseCatalog.native.ts` / `.web.ts`.
  projectOnly("data/exercisesFunctionalFitness\\.ts$"),
  projectOnly("data/otaMovements\\.ts$"),
  projectOnly("data/exercisesMerged\\.ts$"),
  projectOnly("data/exercises\\.ts$"),
];

config.resolver.blockList = [...(config.resolver.blockList ?? []), ...blockList];

if (config.transformer) {
  const previousTransformOptions = config.transformer.getTransformOptions;
  config.transformer.getTransformOptions = async function getTransformOptions(...args) {
    const opts = previousTransformOptions
      ? await previousTransformOptions.apply(this, args)
      : {};
    return {
      ...opts,
      transform: {
        experimentalImportSupport: false,
        ...opts.transform,
        inlineRequires: true,
      },
    };
  };
}

module.exports = config;
