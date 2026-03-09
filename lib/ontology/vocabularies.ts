/**
 * Canonical exercise ontology vocabularies.
 * Single source of truth for slugs used across DB, adapters, generator, and rules.
 * All values are snake_case. See docs/EXERCISE_ONTOLOGY_DESIGN.md.
 */

// ---------------------------------------------------------------------------
// Movement family (user-facing body-part / emphasis)
// ---------------------------------------------------------------------------

export const MOVEMENT_FAMILIES = [
  "upper_push",
  "upper_pull",
  "lower_body",
  "core",
  "mobility",
  "conditioning",
] as const;

export type MovementFamily = (typeof MOVEMENT_FAMILIES)[number];

// ---------------------------------------------------------------------------
// Movement patterns (engine-facing; finer than legacy single movement_pattern)
// ---------------------------------------------------------------------------

export const MOVEMENT_PATTERNS = [
  "squat",
  "hinge",
  "lunge",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "carry",
  "rotation",
  "anti_rotation",
  "locomotion",
  "shoulder_stability",
  "thoracic_mobility",
] as const;

export type MovementPatternSlug = (typeof MOVEMENT_PATTERNS)[number];

/** Legacy single movement_pattern used by dailyGenerator (squat, hinge, push, pull, carry, rotate, locomotion). */
export const LEGACY_MOVEMENT_PATTERNS = [
  "squat",
  "hinge",
  "push",
  "pull",
  "carry",
  "rotate",
  "locomotion",
] as const;

export type LegacyMovementPattern = (typeof LEGACY_MOVEMENT_PATTERNS)[number];

// ---------------------------------------------------------------------------
// Joint stress tags (injury-based hard exclusion; must match INJURY_AVOID_TAGS)
// ---------------------------------------------------------------------------

export const JOINT_STRESS_TAGS = [
  "shoulder_overhead",
  "shoulder_extension_load",
  "shoulder_abduction_load",
  "shoulder_external_rotation_load",
  "grip_hanging",
  "knee_flexion",
  "deep_knee_flexion",
  "spinal_axial_load",
  "lumbar_shear",
  "lumbar_flexion_load",
  "wrist_extension_load",
  "elbow_stress",
  "hip_stress",
  "ankle_stress",
] as const;

export type JointStressTag = (typeof JOINT_STRESS_TAGS)[number];

// ---------------------------------------------------------------------------
// Contraindication tags (body regions to avoid when injured; user-facing)
// ---------------------------------------------------------------------------

export const CONTRAINDICATION_TAGS = [
  "shoulder",
  "knee",
  "lower_back",
  "elbow",
  "wrist",
  "hip",
  "ankle",
] as const;

export type ContraindicationTag = (typeof CONTRAINDICATION_TAGS)[number];

// ---------------------------------------------------------------------------
// Exercise role (block placement)
// ---------------------------------------------------------------------------

export const EXERCISE_ROLES = [
  "warmup",
  "prep",
  "main_compound",
  "accessory",
  "isolation",
  "finisher",
  "cooldown",
  "mobility",
  "conditioning",
] as const;

export type ExerciseRole = (typeof EXERCISE_ROLES)[number];

// ---------------------------------------------------------------------------
// Pairing category (superset logic)
// ---------------------------------------------------------------------------

export const PAIRING_CATEGORIES = [
  "chest",
  "shoulders",
  "triceps",
  "back",
  "biceps",
  "quads",
  "posterior_chain",
  "core",
  "grip",
  "mobility",
] as const;

export type PairingCategory = (typeof PAIRING_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Mobility targets (cooldown/prep selection)
// ---------------------------------------------------------------------------

export const MOBILITY_TARGETS = [
  "thoracic_spine",
  "hip_flexors",
  "hamstrings",
  "hip_internal_rotation",
  "hip_external_rotation",
  "shoulders",
  "calves",
  "quadriceps",
  "glutes",
  "lumbar",
  "wrists",
] as const;

export type MobilityTarget = (typeof MOBILITY_TARGETS)[number];

// ---------------------------------------------------------------------------
// Stretch targets (cooldown stretch selection)
// ---------------------------------------------------------------------------

export const STRETCH_TARGETS = [
  "hamstrings",
  "hip_flexors",
  "quadriceps",
  "calves",
  "glutes",
  "thoracic_spine",
  "shoulders",
  "lats",
  "low_back",
] as const;

export type StretchTarget = (typeof STRETCH_TARGETS)[number];

// ---------------------------------------------------------------------------
// Fatigue regions (superset / fatigue awareness)
// ---------------------------------------------------------------------------

export const FATIGUE_REGIONS = [
  "quads",
  "glutes",
  "hamstrings",
  "pecs",
  "triceps",
  "shoulders",
  "lats",
  "biceps",
  "forearms",
  "core",
  "calves",
] as const;

export type FatigueRegion = (typeof FATIGUE_REGIONS)[number];

// ---------------------------------------------------------------------------
// Domain (optional; broad training domain)
// ---------------------------------------------------------------------------

export const DOMAINS = ["strength", "power", "conditioning", "mobility", "recovery"] as const;

export type Domain = (typeof DOMAINS)[number];

// ---------------------------------------------------------------------------
// Canonical equipment slugs
// ---------------------------------------------------------------------------

export const EQUIPMENT_SLUGS = [
  "bodyweight",
  "barbell",
  "dumbbells",
  "kettlebells",
  "bands",
  "resistance_band",
  "cable_machine",
  "bench",
  "squat_rack",
  "pullup_bar",
  "leg_press",
  "leg_extension",
  "machine",
  "trap_bar",
  "plyo_box",
  "treadmill",
  "rower",
  "assault_bike",
  "bike",
  "trx",
  "foam_roller",
  "miniband",
] as const;

export type EquipmentSlug = (typeof EQUIPMENT_SLUGS)[number];

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const SET_MOVEMENT_FAMILY = new Set<string>(MOVEMENT_FAMILIES);
const SET_JOINT_STRESS = new Set<string>(JOINT_STRESS_TAGS);
const SET_CONTRAINDICATION = new Set<string>(CONTRAINDICATION_TAGS);
const SET_LEGACY_PATTERN = new Set<string>(LEGACY_MOVEMENT_PATTERNS);

export function isMovementFamily(s: string): s is MovementFamily {
  return SET_MOVEMENT_FAMILY.has(s);
}

export function isJointStressTag(s: string): s is JointStressTag {
  return SET_JOINT_STRESS.has(s);
}

export function isContraindicationTag(s: string): s is ContraindicationTag {
  return SET_CONTRAINDICATION.has(s);
}

export function isLegacyMovementPattern(s: string): s is LegacyMovementPattern {
  return SET_LEGACY_PATTERN.has(s);
}

/** Normalize string to snake_case for comparison. */
export function normalizeSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_").trim();
}
