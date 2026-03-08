/**
 * Superset pairing heuristics: good vs bad pairs.
 * Used when building blocks with format "superset" to avoid grip+grip, hinge+hinge, etc.
 */

import type { ExerciseWithQualities } from "./types";

/** Pairs of movement patterns that work well together (antagonist, upper+lower). */
const GOOD_PATTERN_PAIRS: [string, string][] = [
  ["push", "pull"],
  ["squat", "pull"],
  ["hinge", "push"],
  ["squat", "push"],
  ["hinge", "pull"],
  ["push", "rotate"],
  ["pull", "rotate"],
  ["squat", "hinge"], // different enough when one is unilateral
];

/** Pairs to avoid (same pattern or both grip-heavy). */
const BAD_PATTERN_PAIRS: [string, string][] = [
  ["hinge", "hinge"],
  ["squat", "squat"],
  ["grip", "grip"],
];

/** Tags that indicate high grip demand (both exercises having these = bad pair). */
const GRIP_TAGS = new Set(["grip", "grip_strength", "forearm_endurance"]);

function hasGripDemand(ex: ExerciseWithQualities): boolean {
  const q = ex.training_quality_weights;
  if (!q) return false;
  return Object.keys(q).some((k) => GRIP_TAGS.has(k));
}

/**
 * Returns "good", "bad", or "neutral" for pairing A with B in a superset.
 */
export function supersetCompatibility(
  a: ExerciseWithQualities,
  b: ExerciseWithQualities
): "good" | "neutral" | "bad" {
  const ap = a.movement_pattern;
  const bp = b.movement_pattern;

  // Same exercise
  if (a.id === b.id) return "bad";

  // Bad: same pattern (double hinge, double squat)
  if (ap === bp) return "bad";

  // Bad: both grip-heavy
  if (hasGripDemand(a) && hasGripDemand(b)) return "bad";

  // Good: known good pairs
  const isGood = GOOD_PATTERN_PAIRS.some(
    ([x, y]) => (ap === x && bp === y) || (ap === y && bp === x)
  );
  if (isGood) return "good";

  // Bad: explicit bad pair (e.g. hinge+hinge already caught by ap === bp)
  const isBad = BAD_PATTERN_PAIRS.some(
    ([x, y]) => (ap === x && bp === y) || (ap === y && bp === x)
  );
  if (isBad) return "bad";

  // Neutral: different patterns, not both grip
  return "neutral";
}

/**
 * From a list of candidate exercises, pick a good or neutral partner for `anchor`.
 * Prefers "good" over "neutral"; excludes "bad" and already-used IDs.
 */
export function pickSupersetPartner(
  anchor: ExerciseWithQualities,
  candidates: ExerciseWithQualities[],
  usedIds: Set<string>
): ExerciseWithQualities | null {
  let best: ExerciseWithQualities | null = null;
  let bestCompat: "good" | "neutral" = "neutral";

  for (const c of candidates) {
    if (usedIds.has(c.id)) continue;
    const compat = supersetCompatibility(anchor, c);
    if (compat === "bad") continue;
    if (compat === "good" && bestCompat !== "good") {
      best = c;
      bestCompat = "good";
    } else if (compat === "neutral" && !best) {
      best = c;
    }
  }

  return best;
}
