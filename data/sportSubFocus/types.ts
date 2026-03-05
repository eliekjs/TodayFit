/**
 * Sports Prep: sub-focus and exercise tag mapping types.
 * Used so the weekly training generator can bias exercise selection toward tags
 * that match the user's sport sub-focuses.
 */

/** A single sub-focus option under a sport (e.g. "Finger Strength" for Rock Climbing). */
export type SportSubFocus = {
  slug: string;
  name: string;
  description?: string;
  /** 1 = highest priority when multiple sub-focuses selected. */
  priority_weight?: number;
};

/** One sport with 3–6 sub-focus options. */
export type SportWithSubFocuses = {
  slug: string;
  name: string;
  category: string;
  /** Sub-focus options for this sport. */
  sub_focuses: SportSubFocus[];
};

/** Mapping: sub_focus slug → exercise tag slugs with optional weight (1 = default). */
export type SubFocusTagMapEntry = {
  tag_slug: string;
  weight?: number;
};

/** Full map: composite key "sport_slug:sub_focus_slug" → tag slugs + weights. */
export type SubFocusTagMap = Record<string, SubFocusTagMapEntry[]>;

/** Canonical exercise tag for taxonomy / display. */
export type ExerciseTagTaxonomyEntry = {
  slug: string;
  tag_type: "movement_pattern" | "strength_quality" | "athletic_attribute" | "joint_stability" | "climbing" | "modality" | "energy_system" | "general";
  display_name: string;
  description?: string | null;
};
