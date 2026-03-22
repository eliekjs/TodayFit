/**
 * Canonical exercise ontology: vocabularies and legacy mapping.
 * Single source of truth for DB, adapters, generator, and rules.
 */

export {
  MOVEMENT_FAMILIES,
  MOVEMENT_PATTERNS,
  LEGACY_MOVEMENT_PATTERNS,
  JOINT_STRESS_TAGS,
  CONTRAINDICATION_TAGS,
  EXERCISE_ROLES,
  PAIRING_CATEGORIES,
  MOBILITY_TARGETS,
  STRETCH_TARGETS,
  FATIGUE_REGIONS,
  DOMAINS,
  EQUIPMENT_SLUGS,
  isMovementFamily,
  isJointStressTag,
  isContraindicationTag,
  isLegacyMovementPattern,
  isExerciseRole,
  isPairingCategory,
  isFatigueRegion,
  normalizeSlug,
} from "./vocabularies";

export type {
  MovementFamily,
  MovementPatternSlug,
  LegacyMovementPattern,
  JointStressTag,
  ContraindicationTag,
  ExerciseRole,
  PairingCategory,
  MobilityTarget,
  StretchTarget,
  FatigueRegion,
  Domain,
  EquipmentSlug,
  DemandLevel,
  WarmupRelevance,
  CooldownRelevance,
  StabilityDemand,
  GripDemand,
  ImpactLevel,
} from "./vocabularies";

export { DEMAND_LEVELS } from "./vocabularies";

export {
  getLegacyMovementPattern,
  mergeJointStressForTags,
  mergeContraindicationsForTags,
  normalizeEquipmentSlug,
  normalizeMatchableTagSlugs,
} from "./legacyMapping";
