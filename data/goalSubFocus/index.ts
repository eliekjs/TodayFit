/**
 * Goal sub-focus: options and tag mapping for Manual mode sub-goals.
 * Use getExerciseTagsForGoalSubFocuses to get tag weights for exercise ranking.
 * Sub-focus architecture: intent vs overlay, conflict handling, resolveSubFocusProfile.
 */

export type {
  GoalSubFocusOption,
  GoalSubFocusOptionsEntry,
  GoalSubFocusTagMap,
  GoalSubFocusTagMapEntry,
  SubFocusClass,
  SubFocusProfile,
  SubFocusResolverInput,
  SubFocusClassMap,
  SubFocusConflictConfig,
  SubFocusConflictGroup,
} from "./types";
export {
  ATHLETIC_PERFORMANCE_PRIMARY_LABEL,
  ATHLETIC_SUB_FOCUS_ARCHETYPE,
  LEGACY_ATHLETIC_PRIMARY_FOCUS_LABELS,
  archetypeForAthleticSubFocusSlug,
  canonicalAthleticPrimaryFocusLabel,
  goalSlugForAthleticSubFocus,
  isAthleticUmbrellaPrimaryLabel,
  migrateLegacyAthleticPreferences,
  sessionAssemblesPowerBlock,
  sessionHasPowerBlockSubFocus,
  sessionHasRoutedConditioningSubFocus,
} from "./athleticSubFocusArchetypes";
export { GOAL_SUB_FOCUS_OPTIONS } from "./goalSubFocusOptions";
export { GOAL_SUB_FOCUS_TAG_MAP } from "./goalSubFocusTagMap";
export { resolveSubFocusProfile, getTagWeightsFromProfile } from "./subFocusResolver";
export { getSubFocusClass, getSubFocusConflictConfig, getSubFocusClassMap } from "./subFocusClassifications";
export {
  exerciseHasSubFocusSlug,
  getConditioningIntentSlugs,
  getPrimaryConditioningIntent,
  filterPoolByDirectSubFocus,
  filterPoolByOverlay,
  CONDITIONING_INTENT_SLUGS,
  CONDITIONING_OVERLAY_SLUGS,
} from "./conditioningSubFocus";
export type { ExerciseForSubFocus } from "./conditioningSubFocus";
export {
  STRENGTH_INTENT_SLUGS,
  STRENGTH_OVERLAY_SLUGS,
  exerciseHasStrengthSubFocusSlug,
  getStrengthIntentSlugs,
  getStrengthOverlayFilter,
  filterPoolByDirectStrengthSubFocus,
  exerciseMatchesAnyStrengthIntent,
  exerciseMatchesAnyStrengthOverlay,
} from "./strengthSubFocus";
export type { ExerciseForStrengthSubFocus } from "./strengthSubFocus";
export {
  JOINT_HEALTH_SUB_FOCUS_SLUGS,
  exerciseMatchesJointHealthSubFocus,
  isJointHealthAppropriateExercise,
  isJointHealthExcludedExercise,
  classifyJointHealthSlotRole,
} from "./jointHealthSubFocus";
export type { JointHealthSubFocusSlug, JointHealthSlotRole } from "./jointHealthSubFocus";

import { GOAL_SUB_FOCUS_OPTIONS } from "./goalSubFocusOptions";
import { GOAL_SUB_FOCUS_TAG_MAP } from "./goalSubFocusTagMap";
import {
  GOAL_SLUG_TO_LABEL,
  GOAL_SLUG_TO_PRIMARY_FOCUS,
  PRIMARY_FOCUS_TO_GOAL_SLUG,
} from "../../lib/goalSlugMapping";

/**
 * Map UI / adaptive display labels to canonical keys in GOAL_SUB_FOCUS_OPTIONS.
 * Prevents sub-focus from being silently dropped when label strings differ (e.g. adaptive "Build muscle"
 * vs manual "Build Muscle (Hypertrophy)").
 */
const LEGACY_GOAL_LABEL_ALIASES: Record<string, string> = {
  "mobility & joint health": "Recovery & Mobility",
  recovery: "Recovery & Mobility",
  "power & explosiveness": "Athletic Performance",
  "sport conditioning": "Athletic Performance",
};

export function canonicalGoalSubFocusLabel(label: string): string {
  const trimmed = label.trim();
  const legacy = LEGACY_GOAL_LABEL_ALIASES[trimmed.toLowerCase()];
  if (legacy) return legacy;
  if (GOAL_SUB_FOCUS_OPTIONS[trimmed]) return trimmed;
  for (const [canonical, slug] of Object.entries(PRIMARY_FOCUS_TO_GOAL_SLUG)) {
    if (canonical.toLowerCase() === trimmed.toLowerCase()) return canonical;
    if (slug.toLowerCase() === trimmed.toLowerCase()) {
      return GOAL_SLUG_TO_PRIMARY_FOCUS[slug] ?? canonical;
    }
  }
  for (const [slug, display] of Object.entries(GOAL_SLUG_TO_LABEL)) {
    if (display.toLowerCase() === trimmed.toLowerCase()) {
      return GOAL_SLUG_TO_PRIMARY_FOCUS[slug] ?? trimmed;
    }
  }
  return trimmed;
}

/**
 * Resolve primary focus label + sub-focus labels to goal slug and sub-focus slugs.
 * Used when converting Manual preferences (subFocusByGoal keyed by goal label) to tag lookup.
 */
/** Partial UI labels → canonical sub-focus slug when full option name was not picked. */
const GOAL_SUB_FOCUS_PARTIAL_LABEL_ALIASES: Record<string, string> = {
  hinge: "deadlift_hinge",
  deadlift: "deadlift_hinge",
  "deadlift / hinge": "deadlift_hinge",
  squat: "squat",
  sprint: "speed_sprint",
};

function resolveSubFocusLabelToSlug(
  entry: (typeof GOAL_SUB_FOCUS_OPTIONS)[string],
  label: string
): string | undefined {
  const trimmed = label.trim();
  const nameToSlug = new Map(entry.subFocuses.map((f) => [f.name, f.slug]));
  const direct = nameToSlug.get(trimmed);
  if (direct) return direct;
  const byLower = new Map(entry.subFocuses.map((f) => [f.name.toLowerCase(), f.slug]));
  const lowerMatch = byLower.get(trimmed.toLowerCase());
  if (lowerMatch) return lowerMatch;
  const aliasSlug = GOAL_SUB_FOCUS_PARTIAL_LABEL_ALIASES[trimmed.toLowerCase()];
  if (aliasSlug && entry.subFocuses.some((f) => f.slug === aliasSlug)) return aliasSlug;
  return undefined;
}

export function resolveGoalSubFocusSlugs(
  primaryFocusLabel: string,
  subFocusLabels: string[]
): { goalSlug: string; subFocusSlugs: string[] } {
  const entry = GOAL_SUB_FOCUS_OPTIONS[canonicalGoalSubFocusLabel(primaryFocusLabel)];
  if (!entry) return { goalSlug: "", subFocusSlugs: [] };
  const subFocusSlugs = subFocusLabels
    .map((name) => resolveSubFocusLabelToSlug(entry, name))
    .filter((s): s is string => s != null);
  return { goalSlug: entry.goalSlug, subFocusSlugs };
}

/**
 * Returns exercise tag slugs (with weights) for the given goal and selected sub-focus slugs.
 * Use the result to boost exercise selection toward matching tags in the workout generator.
 * @param subFocusWeights - Optional weights by rank (e.g. [0.5, 0.3, 0.2]). If not provided, sub-focuses are weighted equally.
 */
export function getExerciseTagsForGoalSubFocuses(
  goalSlug: string,
  subFocusSlugs: string[],
  subFocusWeights?: number[]
): { tag_slug: string; weight: number }[] {
  const byTag = new Map<string, number>();
  const weights = subFocusWeights?.length
    ? subFocusWeights
    : subFocusSlugs.map(() => 1);
  for (let i = 0; i < subFocusSlugs.length; i++) {
    const sub = subFocusSlugs[i];
    const rankWeight = weights[i] ?? 1;
    const key = `${goalSlug}:${sub}`;
    const entries = GOAL_SUB_FOCUS_TAG_MAP[key];
    if (!entries) continue;
    for (const { tag_slug, weight = 1 } of entries) {
      const w = (weight ?? 1) * rankWeight;
      const existing = byTag.get(tag_slug);
      byTag.set(tag_slug, existing != null ? existing + w : w);
    }
  }
  return Array.from(byTag.entries()).map(([tag_slug, weight]) => ({ tag_slug, weight }));
}
