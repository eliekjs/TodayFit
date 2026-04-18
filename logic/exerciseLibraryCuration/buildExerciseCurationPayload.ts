/**
 * Build LLM-facing payloads: catalog facts + deterministic prefill with trust-aware prior_policy.
 */

import type { CatalogExerciseRow, ExercisePrefillRecord, PrefillFieldAssignment } from "./types";
import type {
  DeterministicFieldPayload,
  LlmExerciseClassificationPayload,
  LlmPriorPolicy,
} from "./llmClassificationTypes";

function priorForMovementEquipmentRole(
  tier: "locked" | "strong_prior" | "weak_prior" | undefined
): LlmPriorPolicy {
  if (!tier) return "recommendation";
  if (tier === "locked") return "locked_do_not_override";
  if (tier === "strong_prior") return "recommendation";
  return "low_confidence_hint";
}

function priorForSoftField(
  tier: "locked" | "strong_prior" | "weak_prior" | undefined
): LlmPriorPolicy {
  if (!tier) return "soft_weak";
  if (tier === "strong_prior") return "soft_strong";
  return "soft_weak";
}

function packField<T>(
  a: PrefillFieldAssignment<T> | undefined,
  priorFn: (tier: "locked" | "strong_prior" | "weak_prior" | undefined) => LlmPriorPolicy
): DeterministicFieldPayload<T> | undefined {
  if (!a) return undefined;
  const tier = a.trust_tier ?? "strong_prior";
  return {
    value: a.value,
    confidence: a.confidence,
    reason_codes: [...a.reason_codes],
    sources: [...a.sources],
    trust_tier: tier,
    prior_policy: priorFn(a.trust_tier),
  };
}

/**
 * Build one classification payload for the LLM (no network I/O).
 */
export function buildLlmExerciseClassificationPayload(
  row: CatalogExerciseRow,
  prefillRecord: ExercisePrefillRecord
): LlmExerciseClassificationPayload {
  const ont = row.ontology;
  return {
    exercise_id: row.id,
    name: row.name,
    description: row.description,
    equipment: [...(row.equipment ?? [])],
    tags: [...(row.tags ?? [])],
    muscles: [...(row.muscles ?? [])],
    modalities: [...(row.modalities ?? [])],
    legacy_movement_pattern: row.movement_pattern,
    ontology_movement_patterns: [...(ont?.movement_patterns ?? []).map(String)],
    deterministic_prefill: (() => {
      const eq = prefillRecord.prefill.equipment_class;
      let equipment_payload = packField(eq, priorForMovementEquipmentRole);
      if (
        equipment_payload &&
        eq?.reason_codes.some((c) => c.includes("equipment_support_only_slugs_fallback")) &&
        eq.trust_tier === "weak_prior"
      ) {
        equipment_payload = { ...equipment_payload, prior_policy: "low_confidence_hint" };
      }
      return {
        primary_role: packField(prefillRecord.prefill.primary_role, priorForMovementEquipmentRole),
        movement_patterns: packField(prefillRecord.prefill.movement_patterns, priorForMovementEquipmentRole),
        equipment_class: equipment_payload,
        complexity: packField(prefillRecord.prefill.complexity, priorForSoftField),
        sport_transfer_tags: packField(prefillRecord.prefill.sport_transfer_tags, priorForSoftField),
      };
    })(),
  };
}

export function buildLlmPayloadsForCatalog(
  exercises: CatalogExerciseRow[],
  prefillById: Map<string, ExercisePrefillRecord>
): LlmExerciseClassificationPayload[] {
  return exercises.map((row) => {
    const rec = prefillById.get(row.id);
    if (!rec) {
      return buildLlmExerciseClassificationPayload(row, { exercise_id: row.id, prefill: {} });
    }
    return buildLlmExerciseClassificationPayload(row, rec);
  });
}

/** Alias for callers that refer to this step as “exercise curation payload”. */
export const buildExerciseCurationPayload = buildLlmExerciseClassificationPayload;
