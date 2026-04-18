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
  | "unknown_field";

export type LlmValidationResult =
  | { ok: true; value: LlmClassificationValidated }
  | { ok: false; errors: { code: ValidationFailureCode; message: string }[] };

export type LlmStagingItem = {
  exercise_id: string;
  batch_index: number;
  payload_summary: { name: string };
  raw_response: string | null;
  provider_error: string | null;
  validation: LlmValidationResult;
};

export type LlmStagingArtifact = {
  schema_version: 1;
  generated_at: string;
  catalog_path: string;
  prefill_path: string;
  provider: "openai_compatible" | "none" | "mock";
  batch_size: number;
  /** Exercise ids with a row in \`items\` from the latest run (for resume bookkeeping). */
  processed_ids: string[];
  items: LlmStagingItem[];
};

export type LlmValidatedRecord = {
  exercise_id: string;
  llm: LlmClassificationValidated;
  /** After applying phase-2 locked fields over LLM output (for downstream). */
  merged_with_locked_prefill: LlmClassificationValidated;
  /** Which deterministic fields were forced from prefill (locked). */
  locked_fields_applied: (
    | "primary_role"
    | "movement_patterns"
    | "equipment_class"
  )[];
};

export type LlmValidatedArtifact = {
  schema_version: 1;
  generated_at: string;
  catalog_path: string;
  records: LlmValidatedRecord[];
};

/** Compare deterministic prefill to LLM for fields the LLM was allowed to change. */
export type FieldChangeKind = "preserved" | "replaced" | "filled_no_prior" | "locked_unchanged";

export type LlmRunSummary = {
  total_processed: number;
  validated_count: number;
  rejected_count: number;
  ambiguous_count: number;
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
