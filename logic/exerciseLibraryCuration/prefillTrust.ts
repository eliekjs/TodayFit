/**
 * Trust-tier policy for deterministic prefill (phase 2 refinement).
 */

import type {
  PrefillFieldAssignment,
  PrefillTrustTier,
  ExercisePrefillBlock,
  ExercisePrefillRecord,
} from "./types";
import type {
  CurationComplexity,
  CurationEquipmentClass,
  CurationMovementPattern,
  CurationPrimaryRole,
  CurationSportTransferTag,
} from "./enums";

/** Ontology-only single-pattern assignments that are too coarse to "lock" without name/legacy confirmation. */
const GENERIC_SINGLE_ONTOLOGY_LOCK = new Set<CurationMovementPattern>(["squat", "hinge", "locomotion"]);

const LOCKED_PRIMARY_ROLE_REASONS = new Set([
  "modalities_conditioning_plus_cardio_signal",
  "ontology_exercise_role_mobility_family",
]);

const WEAK_PRIMARY_ROLE_REASONS = new Set([
  "ontology_unilateral_or_text_unilateral",
  "name_compound_pattern_with_barbell_or_bw",
  "name_isolation_accessory_heuristic",
  "name_stability_core_pattern",
  "name_or_tags_rehab_prehab",
]);

const EQUIPMENT_WEAK_REASONS = new Set([
  "equipment_support_only_slugs_fallback_specialty",
  "name_contains_barbell",
  "name_contains_dumbbell",
  "name_contains_kettlebell",
  "name_contains_cable",
  "name_contains_trx",
]);

function isEquipmentLockedReason(code: string): boolean {
  if (EQUIPMENT_WEAK_REASONS.has(code)) return false;
  if (code.startsWith("equipment_true_mixed")) return false;
  if (code.startsWith("equipment_dominant_name")) return false;
  if (code.startsWith("equipment_slug_")) return true;
  if (code === "equipment_dominant_single_main_with_support_slugs") return true;
  if (code === "equipment_dominant_weighted_majority") return true;
  return false;
}

function hasReasonPrefix(codes: string[], prefix: string): boolean {
  return codes.some((c) => c.startsWith(prefix));
}

function trustTierMovement(
  a: PrefillFieldAssignment<CurationMovementPattern[]>
): PrefillTrustTier {
  const rc = a.reason_codes;
  const hasOntology = rc.includes("ontology_movement_patterns_mapped");
  const hasName = hasReasonPrefix(rc, "name_keyword_");
  const hasLegacy = hasReasonPrefix(rc, "legacy_");

  if (hasOntology && !hasName && !hasLegacy && a.confidence >= 0.9) {
    const vals = a.value;
    const singleGeneric =
      vals.length === 1 && GENERIC_SINGLE_ONTOLOGY_LOCK.has(vals[0]!);
    if (!singleGeneric) return "locked";
    return "strong_prior";
  }

  if (hasOntology && (hasName || hasLegacy)) return "strong_prior";
  if (hasName || hasLegacy) return hasOntology ? "strong_prior" : "weak_prior";
  return "strong_prior";
}

function trustTierEquipment(a: PrefillFieldAssignment<CurationEquipmentClass>): PrefillTrustTier {
  const code = a.reason_codes[0] ?? "";
  if (a.value === "mixed") return "strong_prior";
  if (EQUIPMENT_WEAK_REASONS.has(code) || code.startsWith("name_contains")) return "weak_prior";
  if (isEquipmentLockedReason(code) && a.confidence >= 0.9) return "locked";
  if (isEquipmentLockedReason(code) && a.confidence >= 0.87) return "strong_prior";
  return "weak_prior";
}

function trustTierPrimaryRole(a: PrefillFieldAssignment<CurationPrimaryRole>): PrefillTrustTier {
  const code = a.reason_codes[0] ?? "";
  if (LOCKED_PRIMARY_ROLE_REASONS.has(code) && a.confidence >= 0.88) return "locked";
  if (WEAK_PRIMARY_ROLE_REASONS.has(code) || a.confidence < 0.83) return "weak_prior";
  return "strong_prior";
}

function trustTierComplexity(a: PrefillFieldAssignment<CurationComplexity>): PrefillTrustTier {
  return a.confidence >= 0.86 ? "strong_prior" : "weak_prior";
}

function trustTierSport(a: PrefillFieldAssignment<CurationSportTransferTag[]>): PrefillTrustTier {
  return a.confidence >= 0.86 ? "strong_prior" : "weak_prior";
}

/**
 * Attach trust_tier to each emitted field on a prefill block.
 */
export function applyTrustTiersToPrefillBlock(prefill: ExercisePrefillBlock): ExercisePrefillBlock {
  const out: ExercisePrefillBlock = { ...prefill };
  if (out.movement_patterns) {
    out.movement_patterns = { ...out.movement_patterns, trust_tier: trustTierMovement(out.movement_patterns) };
  }
  if (out.equipment_class) {
    out.equipment_class = { ...out.equipment_class, trust_tier: trustTierEquipment(out.equipment_class) };
  }
  if (out.primary_role) {
    out.primary_role = { ...out.primary_role, trust_tier: trustTierPrimaryRole(out.primary_role) };
  }
  if (out.complexity) {
    out.complexity = { ...out.complexity, trust_tier: trustTierComplexity(out.complexity) };
  }
  if (out.sport_transfer_tags) {
    out.sport_transfer_tags = {
      ...out.sport_transfer_tags,
      trust_tier: trustTierSport(out.sport_transfer_tags),
    };
  }
  return out;
}

export function applyTrustTiersToRecords(records: ExercisePrefillRecord[]): ExercisePrefillRecord[] {
  return records.map((r) => ({
    exercise_id: r.exercise_id,
    prefill: applyTrustTiersToPrefillBlock(r.prefill),
  }));
}
