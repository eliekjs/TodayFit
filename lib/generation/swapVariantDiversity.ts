/**
 * Swap-modal diversity: keep regressions / distinct stimuli on the first page,
 * and push same-machine pacing variants (Zone 2 vs intervals vs tempo of the
 * same cardio piece) later so "Show different" can still cycle them.
 */

const PACING_TOKENS = new Set([
  "zone2",
  "z2",
  "steady",
  "easy",
  "recovery",
  "intervals",
  "interval",
  "hiit",
  "tempo",
  "threshold",
  "cruise",
  "sprint",
  "sprints",
  "long",
  "slow",
  "lsd",
  "repeats",
  "repeat",
]);

const STIMULUS_NORMALIZE: Record<string, string> = {
  incline: "incline",
  hill: "hill",
  hills: "hill",
  uphill: "hill",
  walk: "walk",
  walking: "walk",
};

function normalizeExerciseId(id: string): string {
  return id.toLowerCase().replace(/[\s-]+/g, "_");
}

function tokens(id: string): string[] {
  return normalizeExerciseId(id).split("_").filter(Boolean);
}

function inferCardioMachine(id: string): string | undefined {
  const norm = normalizeExerciseId(id);
  const t = new Set(tokens(norm));
  if (t.has("treadmill")) return "treadmill";
  if (t.has("elliptical")) return "elliptical";
  if (t.has("rower") || t.has("rowing") || norm.includes("row_calorie")) return "rower";
  if ((t.has("ski") && t.has("erg")) || t.has("skierg")) return "ski_erg";
  if (t.has("stair") || t.has("climber")) return "stair";
  if (t.has("bike") || t.has("cycling") || t.has("cycle")) return "bike";
  if ((t.has("jump") && t.has("rope")) || t.has("jumprope")) return "jump_rope";
  return undefined;
}

function stimulusKey(id: string): string {
  const keys = new Set<string>();
  for (const token of tokens(id)) {
    if (PACING_TOKENS.has(token)) continue;
    const stimulus = STIMULUS_NORMALIZE[token];
    if (stimulus) keys.add(stimulus);
  }
  return [...keys].sort().join("_");
}

/**
 * Cardio swap-family id: same machine + same gait/stimulus, ignoring pacing
 * labels (zone 2, intervals, tempo, sprint). Strength lifts return undefined.
 *
 * Examples: treadmill_run, zone2_treadmill, and treadmill_intervals share
 * `treadmill:`; incline walk is `treadmill:incline_walk`.
 */
export function cardioSwapFamilyId(exerciseId: string): string | undefined {
  const machine = inferCardioMachine(exerciseId);
  if (!machine) return undefined;
  const stimulus = stimulusKey(exerciseId);
  return stimulus ? `${machine}:${stimulus}` : `${machine}:`;
}

export function isSameCardioSwapFamily(aId: string, bId: string): boolean {
  const a = cardioSwapFamilyId(aId);
  const b = cardioSwapFamilyId(bId);
  return Boolean(a && b && a === b);
}

/**
 * Stable reorder: keep the first representative of each cardio family, and
 * send later same-family (and same-family-as-target) items to the end.
 */
export function diversifySwapSuggestionOrder<T extends { id: string }>(
  targetId: string,
  items: T[]
): T[] {
  const targetFamily = cardioSwapFamilyId(targetId);
  const seenFamilies = new Set<string>();
  const primary: T[] = [];
  const deferred: T[] = [];

  for (const item of items) {
    const family = cardioSwapFamilyId(item.id);
    const sameAsTarget = Boolean(targetFamily && family && family === targetFamily);
    if (sameAsTarget) {
      deferred.push(item);
      continue;
    }
    if (family && seenFamilies.has(family)) {
      deferred.push(item);
      continue;
    }
    primary.push(item);
    if (family) seenFamilies.add(family);
  }

  return [...primary, ...deferred];
}
