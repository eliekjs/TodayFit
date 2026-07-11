/**
 * Shared tag-weight arrays for athletic sub-focuses (deduped across power / conditioning / athletic_performance keys).
 */

import type { GoalSubFocusTagMapEntry } from "./types";
import { SHARED_TAG_WEIGHTS_VERTICAL_JUMP } from "../sportSubFocus/verticalJumpSubFocusShared";
import { SHARED_TAG_WEIGHTS_OLYMPIC_TRIPLE_EXTENSION } from "./olympicTripleExtensionShared";

export const TAGS_SPEED_SPRINT: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "plyometric", weight: 1.2 },
  { tag_slug: "power", weight: 1.2 },
  { tag_slug: "legs", weight: 1 },
];

export const TAGS_POWER_EXPLOSIVE: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "power", weight: 1.3 },
  { tag_slug: "plyometric", weight: 1.1 },
  { tag_slug: "compound", weight: 1 },
];

export const TAGS_AGILITY_COD: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "agility", weight: 1.3 },
  { tag_slug: "plyometric", weight: 1.2 },
  { tag_slug: "lateral_power", weight: 1.2 },
  { tag_slug: "single_leg_strength", weight: 1.1 },
  { tag_slug: "balance", weight: 1 },
  { tag_slug: "single_leg", weight: 1 },
  { tag_slug: "legs", weight: 1 },
];

export const TAGS_LOWER_BODY_POWER_PLYOS: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "power", weight: 1.3 },
  { tag_slug: "plyometric", weight: 1.2 },
  { tag_slug: "squat", weight: 1 },
  { tag_slug: "legs", weight: 1 },
];

export const TAGS_OLYMPIC_TRIPLE_EXTENSION: GoalSubFocusTagMapEntry[] = [
  ...SHARED_TAG_WEIGHTS_OLYMPIC_TRIPLE_EXTENSION,
];

export const TAGS_UPPER_BODY_POWER: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "power", weight: 1.2 },
  { tag_slug: "push", weight: 1.1 },
  { tag_slug: "plyometric", weight: 1 },
];

export const TAGS_VERTICAL_JUMP: GoalSubFocusTagMapEntry[] = [...SHARED_TAG_WEIGHTS_VERTICAL_JUMP];

export const TAGS_SPRINT: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "power", weight: 1.2 },
  { tag_slug: "conditioning", weight: 1.1 },
  { tag_slug: "legs", weight: 1 },
];

export const TAGS_ZONE2_AEROBIC_BASE: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "conditioning", weight: 1.2 },
  { tag_slug: "endurance", weight: 1.2 },
  { tag_slug: "low_impact", weight: 1 },
];

export const TAGS_INTERVALS_HIIT: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "conditioning", weight: 1.3 },
  { tag_slug: "energy_high", weight: 1.1 },
  { tag_slug: "compound", weight: 1 },
];

export const TAGS_THRESHOLD_TEMPO: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "conditioning", weight: 1.2 },
  { tag_slug: "endurance", weight: 1.1 },
];

export const TAGS_HILLS: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "uphill_conditioning", weight: 1.35 },
  { tag_slug: "legs", weight: 1.2 },
  { tag_slug: "glutes", weight: 1.1 },
  { tag_slug: "conditioning", weight: 1 },
];

export const TAGS_ATHLETIC_OVERLAY_UPPER: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "push", weight: 1.1 },
  { tag_slug: "pull", weight: 1.1 },
  { tag_slug: "chest", weight: 1 },
  { tag_slug: "back", weight: 1 },
  { tag_slug: "shoulders", weight: 1 },
];

export const TAGS_ATHLETIC_OVERLAY_LOWER: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "squat", weight: 1.1 },
  { tag_slug: "hinge", weight: 1.1 },
  { tag_slug: "legs", weight: 1.1 },
  { tag_slug: "glutes", weight: 1 },
  { tag_slug: "quads", weight: 1 },
];

export const TAGS_ATHLETIC_OVERLAY_CORE: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "core_stability", weight: 1.3 },
  { tag_slug: "core", weight: 1.1 },
];

export const TAGS_ATHLETIC_OVERLAY_FULL_BODY: GoalSubFocusTagMapEntry[] = [
  { tag_slug: "compound", weight: 1.3 },
  { tag_slug: "squat", weight: 1 },
  { tag_slug: "hinge", weight: 1 },
  { tag_slug: "push", weight: 1 },
  { tag_slug: "pull", weight: 1 },
  { tag_slug: "power", weight: 0.9 },
];
