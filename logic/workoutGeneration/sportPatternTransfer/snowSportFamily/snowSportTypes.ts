/**
 * Mountain snow & descent load — shared pattern categories for alpine, snowboard,
 * backcountry, and XC. Extends the original alpine set with family-only tags.
 */

/** Canonical snow sports using this family module. */
export type SnowSportKind = "alpine_skiing" | "snowboarding" | "backcountry_skiing" | "xc_skiing";

export const SNOW_SPORT_KINDS: readonly SnowSportKind[] = [
  "alpine_skiing",
  "snowboarding",
  "backcountry_skiing",
  "xc_skiing",
] as const;

export function isSnowSportKind(s: string): s is SnowSportKind {
  return (SNOW_SPORT_KINDS as readonly string[]).includes(s);
}

/** Pattern category ids: shared across snow sports; tagging lives in snowSportExerciseCategories. */
export type SnowSportPatternCategory =
  | "eccentric_braking_control"
  | "lateral_frontal_plane_stability"
  | "quad_dominant_endurance"
  | "sustained_tension_lower_body"
  | "hip_knee_control"
  | "trunk_bracing_dynamic"
  | "landing_deceleration_support"
  | "ski_conditioning"
  | "nordic_poling_pull_endurance"
  | "uphill_skin_travel_endurance"
  | "snowboard_asymmetric_stance"
  | "locomotion_hiking_trail_identity"
  | "running_gait_identity"
  | "low_transfer_sagittal_only"
  | "unrelated_upper_body_dominant"
  | "overly_complex_skill_lift";
