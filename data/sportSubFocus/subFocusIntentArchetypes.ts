/**
 * Sport sub-focus intent archetypes used by generator routing and coverage.
 *
 * Tag weights say what an exercise matches; archetypes say how the session should
 * train that match. For example, `vertical_jump` should require dynamic/power
 * movement evidence, while `knee_resilience` should be covered by accessory-style
 * stability/control work rather than a generic squat slot.
 */

export type SportSubFocusIntentArchetype =
  | "explosive_plyometric"
  | "stability_prehab"
  | "endurance_conditioning";

function normSubFocusSlug(slug: string): string {
  return slug.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

/**
 * Sport sub-focus slugs that call for dedicated conditioning blocks (tempo runs, intervals,
 * aerobic engine work, pace-specific conditioning). These should NOT be allocated to main
 * compound/strength slots; instead they get their own conditioning or EMOM-style block.
 */
export const ENDURANCE_CONDITIONING_SUB_FOCUS_SLUGS = new Set([
  // Running pace / engine
  "aerobic_base",
  "marathon_pace",
  "threshold",
  "speed_endurance",
  "running_economy",
  "durability",
  "uphill_endurance",
  "vo2_intervals",
  "tempo",
  "interval_training",
  // Cycling / rowing engine
  "power_endurance",
  // General endurance
  "aerobic_engine",
  "lactate_threshold",
]);

export const EXPLOSIVE_PLYOMETRIC_SUB_FOCUS_SLUGS = new Set([
  "acceleration_power",
  "explosive_power",
  "leg_power",
  "lower_body_power",
  "plyometric_power",
  "pop_up_power",
  "power",
  "power_dynamic",
  "reactive_speed",
  "speed",
  "speed_power",
  "vertical_jump",
]);

export const STABILITY_PREHAB_SUB_FOCUS_SLUGS = new Set([
  "ankle_stability",
  "hip_stability",
  "knee_stability",
  "core_stability",
  "downhill_control",
  "downhill_stability",
  "eccentric_control",
  "hamstring_resilience",
  "hamstring_tendon_resilience",
  "hip_mobility_stability",
  "hip_stability",
  "knee_resilience",
  "landing_mechanics",
  "lateral_stability",
  "leg_resilience",
  "overhead_stability",
  "reactive_landing",
  "shoulder_stability",
]);

export const DYNAMIC_POWER_SIGNAL_TAG_SLUGS = new Set([
  "acceleration",
  "agility",
  "explosive",
  "explosive_power",
  "jumping",
  "plyometric",
  "reactive_power",
  "speed",
  "sprinting",
]);

export const STABILITY_PREHAB_SIGNAL_TAG_SLUGS = new Set([
  "ankle_stability",
  "balance",
  "core_anti_extension",
  "core_anti_rotation",
  "core_bracing",
  "core_stability",
  "eccentric_quad_strength",
  "eccentric_strength",
  "hip_stability",
  "knee_stability",
  "rotator_cuff",
  "scapular_control",
  "scapular_strength",
  "shoulder_stability",
  "single_leg",
  "single_leg_strength",
]);

export function sportSubFocusIntentArchetype(
  subFocusSlug: string
): SportSubFocusIntentArchetype | undefined {
  const slug = normSubFocusSlug(subFocusSlug);
  if (STABILITY_PREHAB_SUB_FOCUS_SLUGS.has(slug)) return "stability_prehab";
  if (EXPLOSIVE_PLYOMETRIC_SUB_FOCUS_SLUGS.has(slug)) return "explosive_plyometric";
  if (ENDURANCE_CONDITIONING_SUB_FOCUS_SLUGS.has(slug)) return "endurance_conditioning";
  return undefined;
}

export function isExplosivePlyometricSportSubFocusSlug(subFocusSlug: string): boolean {
  return sportSubFocusIntentArchetype(subFocusSlug) === "explosive_plyometric";
}

export function isStabilityPrehabSportSubFocusSlug(subFocusSlug: string): boolean {
  return sportSubFocusIntentArchetype(subFocusSlug) === "stability_prehab";
}

export function isEnduranceConditioningSportSubFocusSlug(subFocusSlug: string): boolean {
  return sportSubFocusIntentArchetype(subFocusSlug) === "endurance_conditioning";
}

export function tagSetHasDynamicPowerSignal(tags: Set<string>): boolean {
  for (const tag of DYNAMIC_POWER_SIGNAL_TAG_SLUGS) {
    if (tags.has(tag)) return true;
  }
  return false;
}

export function tagSetHasStabilityPrehabSignal(tags: Set<string>): boolean {
  for (const tag of STABILITY_PREHAB_SIGNAL_TAG_SLUGS) {
    if (tags.has(tag)) return true;
  }
  return false;
}
