/**
 * Canonical primary-muscle slug normalization for filters (DB + generator).
 * Aligns synonyms so the same exercise is visible across candidateFilters,
 * conditioning overlays, and eligibility checks.
 */

/** Map alternate spellings / legacy values to one canonical slug. */
const MUSCLE_SLUG_ALIASES: Record<string, string> = {
  hamstring: "hamstrings",
  hamstrings: "hamstrings",
  quad: "quads",
  quads: "quads",
  quadriceps: "quads",
  calf: "calves",
  calves: "calves",
  glute: "glutes",
  glutes: "glutes",
  lat: "lats",
  lats: "lats",
  trap: "traps",
  traps: "traps",
  shoulder: "shoulders",
  shoulders: "shoulders",
  tricep: "triceps",
  triceps: "triceps",
  bicep: "biceps",
  biceps: "biceps",
  upperback: "upper_back",
  upper_back: "upper_back",
  lowerback: "lower_back",
  lower_back: "lower_back",
  oblique: "obliques",
  obliques: "obliques",
  ab: "abs",
  abs: "abs",
  leg: "legs",
  legs: "legs",
  adductor: "adductors",
  adductors: "adductors",
  forearm: "forearms",
  forearms: "forearms",
  neck: "neck",
  chest: "chest",
  back: "back",
  core: "core",
  push: "push",
  pull: "pull",
};

export function normalizePrimaryMuscleSlug(raw: string): string {
  const n = raw.toLowerCase().replace(/\s/g, "_").replace(/-/g, "_");
  return MUSCLE_SLUG_ALIASES[n] ?? n;
}

/** Normalized muscle slugs for an exercise (deduped). */
export function normalizedMuscleSlugSet(muscles: string[] | undefined): Set<string> {
  const out = new Set<string>();
  for (const m of muscles ?? []) {
    out.add(normalizePrimaryMuscleSlug(m));
  }
  return out;
}

/** True if any normalized muscle is in `wanted` (wanted entries should be canonical). */
export function normalizedMusclesIntersect(muscles: string[] | undefined, wanted: Set<string>): boolean {
  const have = normalizedMuscleSlugSet(muscles);
  for (const h of have) {
    if (wanted.has(h)) return true;
  }
  return false;
}

/**
 * Upper-pull style matching: lats / upper_back / generic back count as pull region.
 */
export function hasUpperPullMuscleSignal(muscles: string[] | undefined): boolean {
  const have = normalizedMuscleSlugSet(muscles);
  if (have.has("pull")) return true;
  if (have.has("lats") || have.has("upper_back") || have.has("back") || have.has("biceps")) return true;
  return false;
}
