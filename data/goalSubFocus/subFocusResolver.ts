/**
 * Shared sub-focus resolver: goal + ranked sub-focuses + preferences → normalized SubFocusProfile.
 * - Different classes (intent vs overlay): combined additively.
 * - Same class, conflicting: resolved by user rank (ranked order → weights).
 * Generic so any goal can use it via classifications + tag map.
 */

import type { SubFocusProfile, SubFocusResolverInput } from "./types";
import { getSubFocusClass } from "./subFocusClassifications";
import { GOAL_SUB_FOCUS_TAG_MAP } from "./goalSubFocusTagMap";

function tagMapKey(goalSlug: string, subFocusSlug: string): string {
  return `${goalSlug}:${subFocusSlug}`;
}

/** Derive rank weights from order (first = highest). Default: geometric decay so sum ≈ 1. */
function defaultRankWeights(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];
  const decay = 0.55;
  const weights: number[] = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const w = Math.pow(decay, i);
    weights.push(w);
    sum += w;
  }
  return sum > 0 ? weights.map((w) => w / sum) : weights;
}

/**
 * Assign resolved weights for a set of slugs in the same class.
 * User's ranked order (classSlugs order) determines weights: first = highest.
 * Conflict groups are only used for documentation; weighting is always by rank.
 */
function resolveWeightsWithinClass(
  classSlugs: string[],
  rankWeights: number[]
): Record<string, number> {
  const out: Record<string, number> = {};
  if (classSlugs.length === 0) return out;

  const weights =
    rankWeights.length >= classSlugs.length
      ? rankWeights.slice(0, classSlugs.length)
      : defaultRankWeights(classSlugs.length);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const normalized = weights.map((w) => w / sum);
  classSlugs.forEach((s, i) => (out[s] = normalized[i] ?? 1 / classSlugs.length));
  return out;
}

/** Map intent sub-focus slugs to template hint strings (e.g. for block selection). */
function templateHintsFromIntentSlugs(goalSlug: string, intentSlugs: string[]): string[] {
  const hints: string[] = [];
  const conditioningIntent: Record<string, string> = {
    zone2_aerobic_base: "zone2_block",
    intervals_hiit: "hiit_intervals",
    threshold_tempo: "threshold_tempo",
    hills: "hills",
  };
  const enduranceIntent: Record<string, string> = {
    zone2_long_steady: "zone2_block",
    threshold_tempo: "threshold_tempo",
    intervals: "intervals",
    hills: "hills",
    durability: "steady_state",
  };
  const strengthIntent: Record<string, string> = {
    squat: "strength_emphasis_lower",
    deadlift_hinge: "strength_emphasis_posterior",
    bench_press: "strength_emphasis_push",
    overhead_press: "strength_emphasis_overhead_push",
    pull: "strength_emphasis_pull",
  };
  const map =
    goalSlug === "conditioning"
      ? conditioningIntent
      : goalSlug === "endurance"
        ? enduranceIntent
        : goalSlug === "strength"
          ? strengthIntent
          : {};
  for (const slug of intentSlugs) {
    const h = map[slug];
    if (h && !hints.includes(h)) hints.push(h);
  }
  return hints;
}

/**
 * Resolve goal + ranked sub-focuses + preferences into a normalized SubFocusProfile.
 * - Intent and overlay are combined additively.
 * - Within same class, conflicts resolved by user priority (rank → weights).
 */
export function resolveSubFocusProfile(input: SubFocusResolverInput): SubFocusProfile {
  const { goalSlug, rankedSubFocusSlugs, rankWeights: inputRankWeights, preferences } = input;

  const intentSlugs: string[] = [];
  const overlaySlugs: string[] = [];
  for (const slug of rankedSubFocusSlugs) {
    const c = getSubFocusClass(goalSlug, slug);
    if (c === "intent") intentSlugs.push(slug);
    else overlaySlugs.push(slug);
  }

  const rankWeights = (inputRankWeights?.length ? inputRankWeights : defaultRankWeights(rankedSubFocusSlugs.length)).slice(
    0,
    rankedSubFocusSlugs.length
  );

  const intentWeights = resolveWeightsWithinClass(
    intentSlugs,
    rankWeights.slice(0, intentSlugs.length)
  );
  const overlayWeights = resolveWeightsWithinClass(
    overlaySlugs,
    rankWeights.slice(intentSlugs.length, intentSlugs.length + overlaySlugs.length)
  );

  const resolvedWeights: Record<string, number> = {};
  let intentSum = 0;
  let overlaySum = 0;
  Object.values(intentWeights).forEach((v) => (intentSum += v));
  Object.values(overlayWeights).forEach((v) => (overlaySum += v));
  const totalSum = intentSum + overlaySum || 1;
  Object.entries(intentWeights).forEach(([s, w]) => (resolvedWeights[s] = w / totalSum));
  Object.entries(overlayWeights).forEach(([s, w]) => (resolvedWeights[s] = (resolvedWeights[s] ?? 0) + w / totalSum));

  const preferredAttributes: Record<string, number> = {};
  for (const slug of [...intentSlugs, ...overlaySlugs]) {
    const w = resolvedWeights[slug] ?? 0;
    if (w <= 0) continue;
    const key = tagMapKey(goalSlug, slug);
    const entries = GOAL_SUB_FOCUS_TAG_MAP[key];
    if (!entries) continue;
    for (const { tag_slug, weight = 1 } of entries) {
      const tw = (weight ?? 1) * w;
      preferredAttributes[tag_slug] = (preferredAttributes[tag_slug] ?? 0) + tw;
    }
  }

  let overlayFilter: string | undefined;
  if (overlaySlugs.length === 1) {
    overlayFilter = overlaySlugs[0]!;
  } else if (overlaySlugs.length > 1 && preferences?.preferFullBodyWhenMultipleOverlays) {
    overlayFilter = "full_body";
  } else if (overlaySlugs.length > 1) {
    overlayFilter = overlaySlugs[0]; // first by user rank
  }

  const effectiveSubFocusSlugs = [...intentSlugs, ...overlaySlugs];
  const templateHints = templateHintsFromIntentSlugs(goalSlug, intentSlugs);

  return {
    goalSlug,
    requiredAttributes: [],
    preferredAttributes,
    excludedAttributes: [],
    overlayFilter,
    templateHints,
    resolvedWeights,
    effectiveSubFocusSlugs,
  };
}

/**
 * Build tag weights array suitable for getExerciseTagsForGoalSubFocuses(goalSlug, slugs, weights).
 * Uses resolvedWeights from a SubFocusProfile so rank is respected.
 */
export function getTagWeightsFromProfile(profile: SubFocusProfile): number[] {
  return profile.effectiveSubFocusSlugs.map((s) => profile.resolvedWeights[s] ?? 1);
}
