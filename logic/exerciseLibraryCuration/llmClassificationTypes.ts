/**
 * Phase 3 — LLM classification types (validated output, staging, merge hints).
 * Generator logic unchanged; staging only until wired in a later phase.
 */

import type {
  CurationComplexity,
  CurationEquipmentClass,
  CurationKeepCategory,
  CurationMovementPattern,
  CurationPrimaryRole,
  CurationSportTransferTag,
} from "./enums";
import { EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION } from "./enums";

export type LlmClassificationValidated = {
  primary_role: CurationPrimaryRole;
  movement_patterns: CurationMovementPattern[];
  equipment_class: CurationEquipmentClass;
  complexity: CurationComplexity;
  keep_category: CurationKeepCategory;
  sport_transfer_tags: CurationSportTransferTag[];
  llm_confidence: number;
  ambiguity_flags: string[];
};

/** How the LLM should treat deterministic phase-2 output for a field. */
export type LlmPriorPolicy =
  | "locked_do_not_override"
  | "recommendation"
  | "low_confidence_hint"
  /** complexity / sport_transfer_tags — never locked in phase 2 */
  | "soft_strong"
  | "soft_weak";

export type DeterministicFieldPayload<T> = {
  value: T;
  confidence: number;
  reason_codes: string[];
  sources: string[];
  trust_tier: "locked" | "strong_prior" | "weak_prior";
  prior_policy: LlmPriorPolicy;
};

export type LlmExerciseClassificationPayload = {
  exercise_id: string;
  name: string;
  description: string | null;
  equipment: string[];
  tags: string[];
  muscles: string[];
  modalities: string[];
  legacy_movement_pattern: string | null;
  ontology_movement_patterns: string[];
  /** Phase 2 prefill with trust-aware prior_policy for the LLM. */
  deterministic_prefill: {
    primary_role?: DeterministicFieldPayload<CurationPrimaryRole>;
    movement_patterns?: DeterministicFieldPayload<CurationMovementPattern[]>;
    equipment_class?: DeterministicFieldPayload<CurationEquipmentClass>;
    complexity?: DeterministicFieldPayload<CurationComplexity>;
    sport_transfer_tags?: DeterministicFieldPayload<CurationSportTransferTag[]>;
  };
};

export type ValidationFailureCode =
  | "parse_json_failed"
  | "not_object"
  | "missing_field"
  | "invalid_enum"
  | "movement_patterns_too_many"
  | "movement_patterns_invalid"
  | "llm_confidence_invalid"
  | "ambiguity_flags_invalid"
  | "unknown_field"
  | "missing_batch_result"
  | "exercise_id_mismatch"
  | "batch_results_not_array"
  | "batch_root_invalid";

export type LlmValidationResult =
  | { ok: true; value: LlmClassificationValidated }
  | { ok: false; errors: { code: ValidationFailureCode; message: string }[] };

export type LlmStagingItem = {
  exercise_id: string;
  /** Flush window index (legacy; groups exercises for periodic staging writes). */
  batch_index: number;
  /** Stable id for one API request (shared by all exercises in that request). Schema v2+. */
  request_batch_id?: string;
  /** Exercise ids sent in that API request. Schema v2+. */
  request_exercise_ids?: string[];
  payload_summary: { name: string };
  /** Raw model text for the whole batch response (duplicated per exercise row for resumability). */
  raw_response_text?: string | null;
  /** @deprecated Use raw_response_text; kept for older staging files. */
  raw_response?: string | null;
  provider_error: string | null;
  validation: LlmValidationResult;
};

export type LlmStagingArtifact = {
  schema_version: 1 | 2;
  generated_at: string;
  catalog_path: string;
  prefill_path: string;
  provider: "openai_compatible" | "none" | "mock";
  /** Exercises per flush window (legacy name; periodic disk flush). */
  batch_size: number;
  /** Exercises classified per API request (schema v2+). */
  exercises_per_request?: number;
  max_retries?: number;
  /** Exercise ids with a row in \`items\` from the latest run (for resume bookkeeping). */
  processed_ids: string[];
  items: LlmStagingItem[];
};

/** Per-field explanation for phase-3 smoke/debug (not used by generator). */
export type Phase3MergeFieldAudit = {
  raw_llm: unknown;
  merged_final: unknown;
  /** True when phase-2 trust_tier "locked" forced merged_final for this field. */
  applied_locked_prefill: boolean;
};

export type Phase3EquipmentFieldAudit = Phase3MergeFieldAudit & {
  merged_after_locked_prefill: unknown;
  /** True when post-validation equipment pass changed merged vs after-lock merge. */
  equipment_quality_applied: boolean;
};

export type Phase3RecordAudit = {
  primary_role: Phase3MergeFieldAudit;
  movement_patterns: Phase3MergeFieldAudit;
  equipment_class: Phase3EquipmentFieldAudit;
  equipment_quality_notes: string[];
  equipment_conflict_codes: string[];
};

export type LlmValidatedRecord = {
  exercise_id: string;
  llm: LlmClassificationValidated;
  /** After locked prefill merge and phase-3 equipment quality pass (authoritative for downstream). */
  merged_with_locked_prefill: LlmClassificationValidated;
  /** Which deterministic fields were forced from prefill (locked). */
  locked_fields_applied: (
    | "primary_role"
    | "movement_patterns"
    | "equipment_class"
  )[];
  /** Optional merge trace for debugging / smoke tests. */
  phase3_audit?: Phase3RecordAudit;
};

export type LlmValidatedArtifact = {
  schema_version: 1;
  generated_at: string;
  catalog_path: string;
  records: LlmValidatedRecord[];
};

/** Compare deterministic prefill to LLM for fields the LLM was allowed to change. */
export type FieldChangeKind = "preserved" | "replaced" | "filled_no_prior" | "locked_unchanged";

/** Optional metrics for the current process invocation (batch API + retries). */
export type LlmClassificationRunMetrics = {
  exercises_attempted: number;
  api_requests_made: number;
  average_exercises_per_request: number;
  provider_error_rate_limit: number;
  provider_error_other: number;
  partial_batch_success_count: number;
};

export type LlmRunSummary = {
  total_processed: number;
  validated_count: number;
  rejected_count: number;
  ambiguous_count: number;
  /** Staging rows whose errors include only record-level issues (invalid_enum, missing_batch_result, …), not batch JSON/root parse failures. */
  malformed_record_count: number;
  /** Staging rows whose errors include parse_json_failed, batch_root_invalid, or batch_results_not_array. */
  parse_json_failed_count: number;
  run_metrics?: LlmClassificationRunMetrics;
  by_keep_category: Record<string, number>;
  by_primary_role: Record<string, number>;
  by_complexity: Record<string, number>;
  /** tag -> count (exercises can have multiple tags) */
  sport_transfer_tag_counts: Record<string, number>;
  /** For challengeable fields: did raw LLM output match phase-2 prefill (non-locked only). */
  deterministic_vs_llm: {
    primary_role: Record<FieldChangeKind, number>;
    movement_patterns: Record<FieldChangeKind, number>;
    equipment_class: Record<FieldChangeKind, number>;
    complexity: Record<FieldChangeKind, number>;
    sport_transfer_tags: Record<FieldChangeKind, number>;
  };
  /** Times merge overwrote LLM because phase-2 trust was locked. */
  locked_prefill_overrides_llm: {
    primary_role: number;
    movement_patterns: number;
    equipment_class: number;
  };
  top_ambiguity_flags: { flag: string; count: number }[];
  validation_failure_reasons: { code: string; count: number }[];
};
