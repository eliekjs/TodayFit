/**
 * Name/catalog-driven hints for equipment_class and post-merge corrections (phase 3 only).
 */

import type { ExercisePrefillBlock } from "./types";
import type { LlmClassificationValidated } from "./llmClassificationTypes";
import { inferEquipmentFromCatalogAndText } from "./equipmentNameHint";

export { inferEquipmentFromCatalogAndText } from "./equipmentNameHint";

/**
 * After locked prefill merge, correct obvious equipment_class mistakes using strong priors + name/catalog hints.
 * Raw LLM on the validated record stays unchanged; this only adjusts merged output.
 */
export function applyEquipmentClassificationQualityPass(
  prefill: ExercisePrefillBlock,
  equipmentSlugs: readonly string[],
  exerciseId: string,
  displayName: string,
  merged: LlmClassificationValidated
): { merged: LlmClassificationValidated; notes: string[]; conflict_codes: string[] } {
  const notes: string[] = [];
  const conflict_codes: string[] = [];
  const hint = inferEquipmentFromCatalogAndText(equipmentSlugs, exerciseId, displayName);
  const prior = prefill.equipment_class;
  let eq = merged.equipment_class;

  if (prior?.trust_tier === "locked") {
    if (hint && prior.value !== hint) {
      conflict_codes.push("equipment_locked_prior_vs_name_hint");
      notes.push(`review_locked_prior_${prior.value}_name_hint_${hint}`);
    }
    return { merged: { ...merged, equipment_class: eq }, notes, conflict_codes };
  }

  if (prior?.trust_tier === "strong_prior") {
    if (eq !== prior.value) {
      if (hint === prior.value) {
        eq = prior.value;
        notes.push("equipment_set_to_strong_prior_matches_hint");
      } else if (eq === "bodyweight" && prior.value !== "bodyweight") {
        eq = prior.value;
        notes.push("equipment_strong_prior_over_llm_bodyweight");
      } else if (hint && hint !== eq && hint !== prior.value) {
        conflict_codes.push("equipment_strong_prior_hint_mismatch");
        notes.push(`review_strong_prior_${prior.value}_llm_${eq}_hint_${hint}`);
      }
    }
  } else {
    if (eq === "bodyweight" && hint && hint !== "bodyweight") {
      eq = hint;
      notes.push("equipment_keyword_override_bodyweight_to_hint");
    }
  }

  return {
    merged: { ...merged, equipment_class: eq },
    notes,
    conflict_codes,
  };
}
