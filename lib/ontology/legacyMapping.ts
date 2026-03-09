/**
 * Legacy mapping: ontology fields <-> legacy generator fields.
 * When ontology fields are present they are source of truth; these helpers
 * populate legacy fields (tags.joint_stress, tags.contraindications, movement_pattern)
 * so existing generator code keeps working.
 */

import type { LegacyMovementPattern } from "./vocabularies";
import { isLegacyMovementPattern, normalizeSlug } from "./vocabularies";

/** Maps fine movement_patterns to legacy single movement_pattern. */
const PATTERN_TO_LEGACY: Record<string, LegacyMovementPattern> = {
  squat: "squat",
  hinge: "hinge",
  lunge: "squat", // lunge is lower-body; balance logic often groups with squat
  horizontal_push: "push",
  vertical_push: "push",
  horizontal_pull: "pull",
  vertical_pull: "pull",
  carry: "carry",
  rotation: "rotate",
  anti_rotation: "rotate",
  locomotion: "locomotion",
  shoulder_stability: "pull", // prep/mobility; treat as pull for balance
  thoracic_mobility: "rotate",
};

/**
 * Derive legacy movement_pattern from movement_patterns[] or existing movement_pattern.
 * Use when generator expects a single MovementPattern (squat | hinge | push | pull | carry | rotate | locomotion).
 */
export function getLegacyMovementPattern(options: {
  movement_patterns?: string[] | null;
  movement_pattern?: string | null;
}): LegacyMovementPattern {
  const patterns = options.movement_patterns;
  if (patterns?.length) {
    const first = normalizeSlug(patterns[0]);
    const legacy = PATTERN_TO_LEGACY[first];
    if (legacy) return legacy;
    if (isLegacyMovementPattern(first)) return first as LegacyMovementPattern;
  }
  const existing = options.movement_pattern;
  if (existing && isLegacyMovementPattern(normalizeSlug(existing))) {
    return normalizeSlug(existing) as LegacyMovementPattern;
  }
  return "push"; // safe default for unknown
}

/**
 * Prefer ontology joint_stress_tags for tags.joint_stress when present.
 * Returns array suitable for Exercise.tags.joint_stress (canonical slugs).
 */
export function mergeJointStressForTags(options: {
  joint_stress_tags?: string[] | null;
  joint_stress?: string[] | null;
}): string[] | undefined {
  const fromOntology = options.joint_stress_tags;
  if (fromOntology?.length) return [...fromOntology];
  return options.joint_stress?.length ? options.joint_stress : undefined;
}

/**
 * Prefer ontology contraindication_tags for tags.contraindications when present.
 * Returns array suitable for Exercise.tags.contraindications (canonical slugs).
 */
export function mergeContraindicationsForTags(options: {
  contraindication_tags?: string[] | null;
  contraindications?: string[] | null;
}): string[] | undefined {
  const fromOntology = options.contraindication_tags;
  if (fromOntology?.length) return [...fromOntology];
  return options.contraindications?.length ? options.contraindications : undefined;
}

/**
 * Normalize equipment string to canonical slug (lowercase, snake_case).
 * Does not validate against EQUIPMENT_SLUGS; use for consistent comparison.
 */
export function normalizeEquipmentSlug(eq: string): string {
  return normalizeSlug(eq);
}
