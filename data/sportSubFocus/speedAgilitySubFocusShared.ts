/**
 * Shared classification + tag-weight fragments for speed / COD / lateral reactive sub-focuses.
 * Keeps generator logic (power-style routing, dynamic-movement gate) aligned with SUB_FOCUS_TAG_MAP.
 */

import type { SubFocusTagMapEntry } from "./types";

function normSubFocusSlug(slug: string): string {
  return slug.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

/**
 * Sport sub-focus slugs that route main work toward power-style selection and require at least one
 * dynamic-movement signal tag so balance-only accessories do not satisfy COD/speed intent.
 */
export const SPEED_AGILITY_POWER_STYLE_SUB_FOCUS_SLUGS = new Set([
  "speed",
  "speed_power",
  "change_of_direction",
  "lateral_speed",
  "reactive_speed",
]);

export function isSpeedAgilityPowerStyleSubFocusSlug(slug: string): boolean {
  return SPEED_AGILITY_POWER_STYLE_SUB_FOCUS_SLUGS.has(normSubFocusSlug(slug));
}

/** Normalize like exercise/tag slugs in generator matching */
export function normTagSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

/**
 * Minimum tag signal for speed/COD-classified sub-focuses: excludes static balance / single-leg
 * accessories unless they also carry agility, plyometric, speed, etc.
 */
export const SPEED_AGILITY_DYNAMIC_MOVEMENT_TAG_SLUGS = new Set([
  "agility",
  "speed",
  "acceleration",
  "sprinting",
  "plyometric",
  "explosive",
  "explosive_power",
  "reactive_power",
]);

export function exerciseTagSetHasSpeedAgilityDynamicMovement(exTagsNormalized: Set<string>): boolean {
  for (const tag of SPEED_AGILITY_DYNAMIC_MOVEMENT_TAG_SLUGS) {
    if (exTagsNormalized.has(tag)) return true;
  }
  return false;
}

// --- Duplicated SUB_FOCUS_TAG_MAP rows (sport-agnostic weights) ---

/** soccer / lacrosse / hockey `speed` */
export const SHARED_TAG_WEIGHTS_LINEAR_SPEED: SubFocusTagMapEntry[] = [
  { tag_slug: "speed", weight: 1.2 },
  { tag_slug: "explosive_power", weight: 1 },
];

/** american_football / rugby `speed_power` */
export const SHARED_TAG_WEIGHTS_SPEED_POWER: SubFocusTagMapEntry[] = [
  { tag_slug: "explosive_power", weight: 1.2 },
  { tag_slug: "speed", weight: 1.2 },
  { tag_slug: "plyometric", weight: 0.9 },
];

/** Field / ice team sports `change_of_direction` (emphasizes decel + lateral stability via balance cue) */
export const SHARED_TAG_WEIGHTS_FIELD_CHANGE_OF_DIRECTION: SubFocusTagMapEntry[] = [
  { tag_slug: "agility", weight: 1.3 },
  { tag_slug: "reactive_power", weight: 1.15 },
  { tag_slug: "plyometric", weight: 1 },
  { tag_slug: "speed", weight: 0.9 },
  { tag_slug: "explosive_power", weight: 0.9 },
  { tag_slug: "single_leg_strength", weight: 0.7 },
  { tag_slug: "balance", weight: 0.4 },
];

/** Court / jump-heavy sports: COD with landing / knee stiffness bias vs generic balance weighting */
export const SHARED_TAG_WEIGHTS_COURT_CHANGE_OF_DIRECTION: SubFocusTagMapEntry[] = [
  { tag_slug: "agility", weight: 1.3 },
  { tag_slug: "reactive_power", weight: 1.15 },
  { tag_slug: "plyometric", weight: 1 },
  { tag_slug: "speed", weight: 0.9 },
  { tag_slug: "explosive_power", weight: 0.9 },
  { tag_slug: "knee_stability", weight: 0.55 },
  { tag_slug: "single_leg_strength", weight: 0.55 },
];
