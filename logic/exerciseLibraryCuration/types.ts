/**
 * Types for exercise library curation — audit inputs/outputs and optional persisted profile.
 * Catalog row mirrors `data/workout-exercise-catalog.json` (export from merged static + DB).
 */

import type {
  CurationComplexity,
  CurationEquipmentClass,
  CurationGeneratorState,
  CurationKeepCategory,
  CurationMovementPattern,
  CurationPrimaryRole,
  CurationSportTransferTag,
} from "./enums";
import { EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION } from "./enums";

export type ExerciseLibraryCurationSchemaVersion = typeof EXERCISE_LIBRARY_CURATION_SCHEMA_VERSION;

/** Optional profile to be filled by curation pipeline; may live under `CatalogExerciseRow.extra.curation` later. */
export type ExerciseCurationProfile = {
  primary_role?: CurationPrimaryRole | null;
  movement_patterns?: CurationMovementPattern[] | null;
  equipment_class?: CurationEquipmentClass | null;
  complexity?: CurationComplexity | null;
  sport_transfer_tags?: CurationSportTransferTag[] | null;
  keep_category?: CurationKeepCategory | null;
  generator_state?: CurationGeneratorState | null;
};

/** Where a prefill assignment drew signal from (provenance). */
export type PrefillSource =
  | "name"
  | "description"
  | "equipment"
  | "tags"
  | "muscles"
  | "modalities"
  | "legacy_movement_pattern"
  | "ontology_movement_patterns"
  | "ontology_other"
  | "extra";

/**
 * Trust tier for staged curation (phase 2).
 * - locked: safe to treat as authoritative for downstream merging in most cases
 * - strong_prior: good default; may be overridden by LLM / review
 * - weak_prior: exploratory; do not treat as locked
 */
export type PrefillTrustTier = "locked" | "strong_prior" | "weak_prior";

/** One high-confidence field assignment with machine-readable provenance. */
export type PrefillFieldAssignment<T> = {
  value: T;
  confidence: number;
  reason_codes: string[];
  sources: PrefillSource[];
  /** Set after deterministic rules + trust policy (phase 2 refinement). */
  trust_tier?: PrefillTrustTier;
};

/** Partial curation output for one exercise (phase 2 — no keep_category / generator_state). */
export type ExercisePrefillBlock = {
  primary_role?: PrefillFieldAssignment<CurationPrimaryRole>;
  movement_patterns?: PrefillFieldAssignment<CurationMovementPattern[]>;
  equipment_class?: PrefillFieldAssignment<CurationEquipmentClass>;
  complexity?: PrefillFieldAssignment<CurationComplexity>;
  sport_transfer_tags?: PrefillFieldAssignment<CurationSportTransferTag[]>;
};

export type ExercisePrefillRecord = {
  exercise_id: string;
  prefill: ExercisePrefillBlock;
};

export type PrefillRunOptions = {
  /** Minimum confidence [0,1] to emit a field (below = omitted). Default 0.75. */
  min_confidence: number;
  /** Threshold for “high confidence” in summary stats. Default 0.88. */
  high_confidence_threshold: number;
};

export type PrefillRunStats = {
  total_exercises: number;
  assigned_counts: {
    primary_role: number;
    movement_patterns: number;
    equipment_class: number;
    complexity: number;
    sport_transfer_tags: number;
  };
  high_confidence_counts: {
    primary_role: number;
    movement_patterns: number;
    equipment_class: number;
    complexity: number;
    sport_transfer_tags: number;
  };
  low_confidence_counts: {
    primary_role: number;
    movement_patterns: number;
    equipment_class: number;
    complexity: number;
    sport_transfer_tags: number;
  };
  /** Coverage = exercises with that field emitted after min_confidence filter. */
  coverage_fraction: {
    primary_role: number;
    movement_patterns: number;
    equipment_class: number;
    complexity: number;
    sport_transfer_tags: number;
  };
  /** Aggregated reason_code strings from all emitted field assignments. */
  top_reason_codes: { code: string; count: number }[];
};

export type PrefillRunArtifact = {
  schema_version: ExerciseLibraryCurationSchemaVersion;
  generated_at: string;
  catalog_path: string;
  options: PrefillRunOptions & { persist_extra_curation_staging: boolean };
  exercise_count: number;
  records: ExercisePrefillRecord[];
  stats: PrefillRunStats;
  /** Aggregated trust + movement/equipment diagnostics (phase 2). */
  diagnostics: PrefillDiagnosticsArtifact;
};

/** Summary artifact: movement/equipment trust breakdowns and mixed-equipment reasons. */
export type PrefillDiagnosticsArtifact = {
  schema_version: ExerciseLibraryCurationSchemaVersion;
  generated_at: string;
  exercise_count: number;
  /** movement_pattern slug → tier → count */
  movement_pattern_counts_by_tier: Record<string, Partial<Record<PrefillTrustTier, number>>>;
  /** primary_role value → tier → count */
  primary_role_counts_by_tier: Record<string, Partial<Record<PrefillTrustTier, number>>>;
  /** equipment_class value → tier → count */
  equipment_class_counts_by_tier: Record<string, Partial<Record<PrefillTrustTier, number>>>;
  /** Exercises with equipment_class === "mixed": totals and reason_code → count */
  mixed_equipment: {
    count: number;
    reason_counts: { reason_code: string; count: number }[];
  };
  /** Top composite keys for locked movement_pattern assignments (for QA). */
  locked_movement_pattern_source_reason_combos: {
    key: string;
    movement_patterns: string[];
    sources: string;
    reason_codes: string;
    count: number;
  }[];
};

/** Ontology blob as exported in the merged workout catalog (existing app schema). */
export type CatalogOntologyBlob = {
  primary_movement_family?: string | null;
  secondary_movement_families?: string[] | null;
  movement_patterns?: string[] | null;
  joint_stress_tags?: string[] | null;
  contraindication_tags?: string[] | null;
  impact_level?: string | null;
  exercise_role?: string | null;
  pairing_category?: string | null;
  fatigue_regions?: string[] | null;
  mobility_targets?: string[] | null;
  stretch_targets?: string[] | null;
  unilateral?: boolean | null;
  rep_range_min?: number | null;
  rep_range_max?: number | null;
};

/** Single exercise row from `data/workout-exercise-catalog.json`. */
export type CatalogExerciseRow = {
  id: string;
  name: string;
  description: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  muscles: string[];
  modalities: string[];
  equipment: string[];
  tags: string[];
  contraindications: string[];
  progressions: string[];
  regressions: string[];
  movement_pattern: string | null;
  merge_role?: string;
  static_catalog_source?: string;
  supabase_exercise_uuid?: string;
  ontology: CatalogOntologyBlob | null;
  extra: Record<string, unknown>;
};

export type WorkoutExerciseCatalogFile = {
  exercises: CatalogExerciseRow[];
};

export type AuditSeverity = "info" | "warn" | "error";

export type ExerciseAuditFlag = {
  exercise_id: string;
  code: string;
  severity: AuditSeverity;
  message: string;
};

export type FieldCoverageStat = {
  field_key: string;
  /** Rows with a non-empty / non-null value for this field. */
  present_count: number;
  missing_count: number;
};

export type ExerciseLibraryAuditReport = {
  schema_version: ExerciseLibraryCurationSchemaVersion;
  generated_at: string;
  catalog_path: string;
  total_exercises: number;
  /** Rows with optional `extra.curation` partial profile (phase 1: usually zero). */
  curation_profile_rows: number;
  field_coverage: FieldCoverageStat[];
  /** Flattened equipment slug counts from catalog `equipment` arrays. */
  equipment_counts: Record<string, number>;
  /** Tag slug/string counts from catalog `tags`. */
  tag_counts: Record<string, number>;
  /** Legacy single `movement_pattern` value counts. */
  legacy_movement_pattern_counts: Record<string, number>;
  /** Union of ontology `movement_patterns[]` entries when present. */
  ontology_movement_pattern_counts: Record<string, number>;
  modality_counts: Record<string, number>;
  unique_counts: {
    distinct_equipment_slugs: number;
    distinct_tags: number;
    distinct_legacy_movement_patterns: number;
    distinct_ontology_movement_pattern_slugs: number;
    distinct_modalities: number;
  };
  flags: ExerciseAuditFlag[];
  duplicate_ids: string[];
  summary_line: string;
};
