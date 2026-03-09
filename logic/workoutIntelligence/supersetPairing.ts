/**
 * Superset pairing heuristics: good vs bad pairs.
 * Phase 7: ontology-aware using pairing_category, fatigue_regions, effective movement families.
 * Accepts minimal input so both Exercise (workoutGeneration) and ExerciseWithQualities work.
 */

import type { ExerciseWithQualities } from "./types";

/** Minimal shape for pairing logic (satisfied by Exercise and ExerciseWithQualities). */
export interface PairingInput {
  id: string;
  movement_pattern: string;
  muscle_groups?: string[];
  primary_movement_family?: string;
  secondary_movement_families?: string[];
  movement_patterns?: string[];
  pairing_category?: string;
  fatigue_regions?: string[];
  training_quality_weights?: Record<string, number>;
  tags?: { stimulus?: string[] };
}

/** Canonical pairing categories (ontology). Complementary within upper_push: chest, shoulders, triceps. */
const PAIRING_CATEGORIES = new Set([
  "chest", "shoulders", "triceps", "back", "biceps", "quads", "posterior_chain", "core", "grip", "mobility",
]);

/** Upper-push categories that pair well (complementary, not redundant). */
const UPPER_PUSH_COMPLEMENTARY: [string, string][] = [
  ["chest", "triceps"], ["chest", "shoulders"], ["shoulders", "triceps"],
  ["triceps", "chest"], ["triceps", "shoulders"], ["shoulders", "chest"],
];

/** Upper-pull complementary. */
const UPPER_PULL_COMPLEMENTARY: [string, string][] = [
  ["back", "biceps"], ["biceps", "back"],
];

/** Lower-body: quads + posterior_chain is complementary; same-category stacking is less preferred. */
const LOWER_COMPLEMENTARY: [string, string][] = [
  ["quads", "posterior_chain"], ["posterior_chain", "quads"],
];

/** Pairs of movement patterns that work well together (legacy fallback). */
const GOOD_PATTERN_PAIRS: [string, string][] = [
  ["push", "pull"],
  ["squat", "pull"],
  ["hinge", "push"],
  ["squat", "push"],
  ["hinge", "pull"],
  ["push", "rotate"],
  ["pull", "rotate"],
  ["squat", "hinge"],
];

/** Tags that indicate high grip demand. */
const GRIP_INDICATORS = new Set(["grip", "grip_strength", "forearm_endurance", "forearms"]);

/** Exported for use in eligibilityHelpers (grip + grip = forbid). */
export function hasGripDemand(ex: PairingInput): boolean {
  const q = ex.training_quality_weights;
  if (q && Object.keys(q).some((k) => GRIP_INDICATORS.has(k))) return true;
  const stimulus = ex.tags?.stimulus ?? [];
  if (stimulus.some((s) => s.toLowerCase().includes("grip"))) return true;
  const cat = normalizeSlug(ex.pairing_category);
  if (cat === "grip") return true;
  const regions = getEffectiveFatigueRegions(ex);
  if (regions.some((r) => r === "forearms" || r === "grip")) return true;
  return false;
}

function normalizeSlug(s: string | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\s/g, "_");
}

/**
 * Effective pairing category: ontology pairing_category when present, else derived from movement_pattern + muscles.
 */
export function getEffectivePairingCategory(ex: PairingInput): string {
  const fromOntology = ex.pairing_category;
  if (fromOntology && PAIRING_CATEGORIES.has(normalizeSlug(fromOntology))) return normalizeSlug(fromOntology);

  const pattern = (ex.movement_pattern ?? "").toLowerCase();
  const muscles = new Set((ex.muscle_groups ?? []).map((m) => m.toLowerCase()));

  if (pattern === "push") {
    if (muscles.has("chest") || muscles.has("pecs")) return "chest";
    if (muscles.has("shoulders") || muscles.has("delts")) return "shoulders";
    if (muscles.has("triceps")) return "triceps";
    return "chest";
  }
  if (pattern === "pull") {
    if (muscles.has("back") || muscles.has("lats")) return "back";
    if (muscles.has("biceps")) return "biceps";
    return "back";
  }
  if (pattern === "squat" || pattern === "hinge" || pattern === "lunge") {
    if (muscles.has("quads") || muscles.has("quad")) return "quads";
    if (muscles.has("hamstrings") || muscles.has("glutes")) return "posterior_chain";
    return "quads";
  }
  if (pattern === "carry") return "grip";
  if (pattern === "rotate" || muscles.has("core") || muscles.has("abs")) return "core";
  return "";
}

/**
 * Effective fatigue regions: ontology fatigue_regions when present, else derived from muscles/pattern.
 */
export function getEffectiveFatigueRegions(ex: PairingInput): string[] {
  const fromOntology = ex.fatigue_regions;
  if (fromOntology?.length) return fromOntology.map(normalizeSlug).filter(Boolean);

  const pattern = (ex.movement_pattern ?? "").toLowerCase();
  const muscles = new Set((ex.muscle_groups ?? []).map((m) => m.toLowerCase()));
  const out: string[] = [];

  if (muscles.has("chest") || muscles.has("pecs")) out.push("pecs");
  if (muscles.has("triceps")) out.push("triceps");
  if (muscles.has("shoulders") || muscles.has("delts")) out.push("shoulders");
  if (muscles.has("back") || muscles.has("lats")) out.push("lats");
  if (muscles.has("biceps")) out.push("biceps");
  if (muscles.has("quads") || muscles.has("quad") || muscles.has("legs")) out.push("quads");
  if (muscles.has("hamstrings") || muscles.has("glutes")) out.push("hamstrings");
  if (muscles.has("glutes")) out.push("glutes");
  if (pattern === "carry" || muscles.has("forearms")) out.push("forearms");
  if (muscles.has("core") || muscles.has("abs")) out.push("core");

  return [...new Set(out)];
}

/**
 * Effective movement families for pairing (primary + secondary when available).
 */
export function getEffectivePairingFamilies(ex: PairingInput): string[] {
  const primary = ex.primary_movement_family && normalizeSlug(ex.primary_movement_family);
  const secondaries = (ex.secondary_movement_families ?? []).map(normalizeSlug).filter(Boolean);
  if (primary) return [primary, ...secondaries].filter((f, i, a) => a.indexOf(f) === i);

  const pattern = (ex.movement_pattern ?? "").toLowerCase();
  const muscles = new Set((ex.muscle_groups ?? []).map((m) => m.toLowerCase()));
  if (pattern === "push" || muscles.has("chest") || muscles.has("triceps") || muscles.has("shoulders")) return ["upper_push"];
  if (pattern === "pull" || muscles.has("back") || muscles.has("biceps") || muscles.has("lats")) return ["upper_pull"];
  if (["squat", "hinge", "locomotion"].includes(pattern) || muscles.has("legs") || muscles.has("quads") || muscles.has("glutes") || muscles.has("hamstrings")) return ["lower_body"];
  if (pattern === "rotate" || muscles.has("core")) return ["core"];
  return ["lower_body"];
}

/** Numeric pairing score: higher = better pair. Tunable; deterministic. */
export const PAIRING_SCORE_GOOD = 2;
export const PAIRING_SCORE_NEUTRAL = 0;
export const PAIRING_SCORE_SAME_CATEGORY_PENALTY = -1.5;
export const PAIRING_SCORE_FATIGUE_OVERLAP_PENALTY = -1;
export const PAIRING_SCORE_DOUBLE_GRIP_PENALTY = -3;
export const PAIRING_SCORE_SAME_PATTERN_PENALTY = -2;

/**
 * Returns a numeric score for pairing A with B. Higher = better.
 * Uses pairing_category (complementary good, same-category penalty), fatigue_regions (overlap penalty), grip, pattern.
 */
export function getSupersetPairingScore(a: PairingInput, b: PairingInput): number {
  if (a.id === b.id) return -10;

  let score = PAIRING_SCORE_NEUTRAL;

  const catA = getEffectivePairingCategory(a);
  const catB = getEffectivePairingCategory(b);
  const famA = getEffectivePairingFamilies(a);
  const famB = getEffectivePairingFamilies(b);
  const sameFamily = famA.some((f) => famB.includes(f));

  const upperPush = famA.includes("upper_push") || famB.includes("upper_push");
  const upperPull = famA.includes("upper_pull") || famB.includes("upper_pull");
  const lower = famA.includes("lower_body") || famB.includes("lower_body");
  const isComplementary =
    catA &&
    catB &&
    catA !== catB &&
    sameFamily &&
    ((upperPush && UPPER_PUSH_COMPLEMENTARY.some(([x, y]) => (catA === x && catB === y) || (catA === y && catB === x))) ||
      (upperPull && UPPER_PULL_COMPLEMENTARY.some(([x, y]) => (catA === x && catB === y) || (catA === y && catB === x))) ||
      (lower && LOWER_COMPLEMENTARY.some(([x, y]) => (catA === x && catB === y) || (catA === y && catB === x))));

  // Same movement pattern: penalize only when NOT complementary (e.g. chest+triceps both "push" is OK)
  if (a.movement_pattern === b.movement_pattern && !isComplementary) score += PAIRING_SCORE_SAME_PATTERN_PENALTY;

  // Hard no: both grip-heavy
  if (hasGripDemand(a) && hasGripDemand(b)) score += PAIRING_SCORE_DOUBLE_GRIP_PENALTY;

  // Ontology / category: complementary within same family is good; same category is bad when avoidable
  if (isComplementary) score += PAIRING_SCORE_GOOD;
  else if (catA && catB && catA === catB && sameFamily) score += PAIRING_SCORE_SAME_CATEGORY_PENALTY;

  // Legacy: good pattern pairs (always apply so unannotated push+pull etc. still score well)
  const isGoodPattern = GOOD_PATTERN_PAIRS.some(
    ([x, y]) => (a.movement_pattern === x && b.movement_pattern === y) || (a.movement_pattern === y && b.movement_pattern === x)
  );
  if (isGoodPattern) score += PAIRING_SCORE_GOOD;

  // Fatigue overlap: reduce preference when both hit same regions heavily
  const regionsA = new Set(getEffectiveFatigueRegions(a));
  const regionsB = new Set(getEffectiveFatigueRegions(b));
  const overlap = [...regionsA].filter((r) => regionsB.has(r)).length;
  if (overlap >= 2) score += PAIRING_SCORE_FATIGUE_OVERLAP_PENALTY;
  else if (overlap === 1) score += PAIRING_SCORE_FATIGUE_OVERLAP_PENALTY * 0.5;

  return score;
}

/**
 * Returns "good", "bad", or "neutral" for pairing A with B (backward compatible).
 */
export function supersetCompatibility(
  a: PairingInput,
  b: PairingInput
): "good" | "neutral" | "bad" {
  const score = getSupersetPairingScore(a, b);
  if (score >= PAIRING_SCORE_GOOD) return "good";
  if (score <= PAIRING_SCORE_SAME_PATTERN_PENALTY || score <= PAIRING_SCORE_DOUBLE_GRIP_PENALTY) return "bad";
  if (score < 0) return "bad";
  return "neutral";
}

/**
 * Pick best partner for anchor from candidates by pairing score. Excludes used IDs.
 */
export function pickSupersetPartner(
  anchor: PairingInput,
  candidates: PairingInput[],
  usedIds: Set<string>
): PairingInput | null {
  let best: PairingInput | null = null;
  let bestScore = -Infinity;

  for (const c of candidates) {
    if (usedIds.has(c.id) || c.id === anchor.id) continue;
    const compat = supersetCompatibility(anchor, c);
    if (compat === "bad") continue;
    const score = getSupersetPairingScore(anchor, c);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/**
 * From a pool of exercises, form up to pairCount pairs by repeatedly picking the best-scoring pair.
 * Removes chosen exercises from pool. Deterministic when rng is fixed; use rng only for tie-breaking if needed.
 */
export function pickBestSupersetPairs(
  pool: PairingInput[],
  pairCount: number,
  usedIds: Set<string>
): [PairingInput, PairingInput][] {
  const available = pool.filter((e) => !usedIds.has(e.id));
  const pairs: [PairingInput, PairingInput][] = [];
  const used = new Set(usedIds);

  for (let i = 0; i < pairCount && available.length >= 2; i++) {
    const remaining = available.filter((e) => !used.has(e.id));
    if (remaining.length < 2) break;

    let bestA: PairingInput | null = null;
    let bestB: PairingInput | null = null;
    let bestScore = -Infinity;

    for (let i1 = 0; i1 < remaining.length; i1++) {
      for (let i2 = i1 + 1; i2 < remaining.length; i2++) {
        const a = remaining[i1];
        const b = remaining[i2];
        if (!a || !b) continue;
        const s = getSupersetPairingScore(a, b);
        if (s > bestScore) {
          bestScore = s;
          bestA = a;
          bestB = b;
        }
      }
    }

    if (!bestA || !bestB || bestScore < -5) break;
    pairs.push([bestA, bestB]);
    used.add(bestA.id);
    used.add(bestB.id);
  }

  return pairs;
}

// Re-export for callers that pass ExerciseWithQualities
export type { ExerciseWithQualities };
