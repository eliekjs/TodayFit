/**
 * Merge phase-2 deterministic prefill with validated LLM output.
 * Locked trust-tier fields from prefill override LLM values; all else uses LLM.
 * Use this in later phases to build a single curation profile (no generator_state here).
 */

import { applyEquipmentClassificationQualityPass } from "./equipmentClassificationQuality";
import type { ExercisePrefillBlock } from "./types";
import type {
  LlmClassificationValidated,
  LlmExerciseClassificationPayload,
  LlmValidatedRecord,
  Phase3RecordAudit,
} from "./llmClassificationTypes";

export type LockedFieldKey = "primary_role" | "movement_patterns" | "equipment_class";

/**
 * Apply locked deterministic fields over LLM output. Complexity / sport_transfer_tags are never locked in phase 2.
 */
export function mergeLockedPrefillIntoLlmOutput(
  prefill: ExercisePrefillBlock,
  llm: LlmClassificationValidated
): { merged: LlmClassificationValidated; locked_fields_applied: LockedFieldKey[] } {
  const locked_fields_applied: LockedFieldKey[] = [];
  const merged: LlmClassificationValidated = { ...llm };

  if (prefill.movement_patterns?.trust_tier === "locked") {
    merged.movement_patterns = [...prefill.movement_patterns.value].slice(0, 2);
    locked_fields_applied.push("movement_patterns");
  }

  if (prefill.equipment_class?.trust_tier === "locked") {
    merged.equipment_class = prefill.equipment_class.value;
    locked_fields_applied.push("equipment_class");
  }

  if (prefill.primary_role?.trust_tier === "locked") {
    merged.primary_role = prefill.primary_role.value;
    locked_fields_applied.push("primary_role");
  }

  return { merged, locked_fields_applied };
}

export function buildLlmValidatedRecord(
  exercise_id: string,
  prefill: ExercisePrefillBlock,
  llm: LlmClassificationValidated
): LlmValidatedRecord {
  const { merged, locked_fields_applied } = mergeLockedPrefillIntoLlmOutput(prefill, llm);
  return { exercise_id, llm, merged_with_locked_prefill: merged, locked_fields_applied };
}

/**
 * Locked prefill merge + phase-3 equipment quality pass + per-field audit (for smoke/debug).
 */
export function buildLlmValidatedRecordPhase3(
  exercise_id: string,
  prefill: ExercisePrefillBlock,
  llm: LlmClassificationValidated,
  payload: LlmExerciseClassificationPayload
): LlmValidatedRecord {
  const { merged: mergedAfterLock, locked_fields_applied } = mergeLockedPrefillIntoLlmOutput(prefill, llm);
  const { merged: mergedFinal, notes, conflict_codes } = applyEquipmentClassificationQualityPass(
    prefill,
    payload.equipment,
    payload.exercise_id,
    payload.name,
    mergedAfterLock
  );

  const lockSet = new Set(locked_fields_applied);
  const equipQualityApplied = mergedFinal.equipment_class !== mergedAfterLock.equipment_class;

  const phase3_audit: Phase3RecordAudit = {
    primary_role: {
      raw_llm: llm.primary_role,
      merged_final: mergedFinal.primary_role,
      applied_locked_prefill: lockSet.has("primary_role"),
    },
    movement_patterns: {
      raw_llm: [...llm.movement_patterns],
      merged_final: [...mergedFinal.movement_patterns],
      applied_locked_prefill: lockSet.has("movement_patterns"),
    },
    equipment_class: {
      raw_llm: llm.equipment_class,
      merged_after_locked_prefill: mergedAfterLock.equipment_class,
      merged_final: mergedFinal.equipment_class,
      applied_locked_prefill: lockSet.has("equipment_class"),
      equipment_quality_applied: equipQualityApplied,
    },
    equipment_quality_notes: notes,
    equipment_conflict_codes: conflict_codes,
  };

  return {
    exercise_id,
    llm,
    merged_with_locked_prefill: mergedFinal,
    locked_fields_applied,
    phase3_audit,
  };
}

function sortedStr<T extends string>(arr: T[]): string {
  return [...arr].sort().join(",");
}

function valuesEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export type FieldCompareKey =
  | "primary_role"
  | "movement_patterns"
  | "equipment_class"
  | "complexity"
  | "sport_transfer_tags";

export type CompareOutcome = "preserved" | "replaced" | "filled_no_prior";

/**
 * For fields the LLM was allowed to change: compare raw LLM output to deterministic prefill (if any).
 */
export function compareLlmToDeterministicForField(
  key: FieldCompareKey,
  prefill: ExercisePrefillBlock,
  llm: LlmClassificationValidated
): CompareOutcome {
  const pf = prefill;
  if (key === "primary_role") {
    if (!pf.primary_role) return "filled_no_prior";
    return valuesEqual(pf.primary_role.value, llm.primary_role) ? "preserved" : "replaced";
  }
  if (key === "movement_patterns") {
    if (!pf.movement_patterns) return "filled_no_prior";
    const a = sortedStr(pf.movement_patterns.value);
    const b = sortedStr(llm.movement_patterns);
    return a === b ? "preserved" : "replaced";
  }
  if (key === "equipment_class") {
    if (!pf.equipment_class) return "filled_no_prior";
    return pf.equipment_class.value === llm.equipment_class ? "preserved" : "replaced";
  }
  if (key === "complexity") {
    if (!pf.complexity) return "filled_no_prior";
    return pf.complexity.value === llm.complexity ? "preserved" : "replaced";
  }
  if (key === "sport_transfer_tags") {
    if (!pf.sport_transfer_tags) return "filled_no_prior";
    return sortedStr(pf.sport_transfer_tags.value) === sortedStr(llm.sport_transfer_tags) ? "preserved" : "replaced";
  }
  return "filled_no_prior";
}
