/**
 * Merge local curation artifacts into a single per-exercise payload for Supabase `public.exercises`.
 *
 * ## Precedence (authoritative order)
 *
 * 1. **Generator eligibility preview** (`exercise-generator-eligibility-preview.json`): `by_id[slug]` is the
 *    source of truth for `curation_generator_eligibility_state`, merge target, cluster membership flags used
 *    by the generator gate (same as phase-6 `buildGeneratorEligibilityState` output).
 * 2. **Library pruning decisions** (`exercise-library-pruning-decisions.json`): `pruning_recommendation`,
 *    `canonical_exercise_id`, `cluster_id`, `pruning_reason_codes` — canonical slug within cluster and audit.
 * 3. **LLM validated** (`exercise-curation-llm-validated.json`): `merged_with_locked_prefill` for role,
 *    movement patterns, equipment class, complexity, keep category, sport transfer tags, confidence.
 * 4. **Deterministic prefill** (`exercise-curation-prefill.json`): used **only** when an exercise has no
 *    validated LLM row — fills the same fields from `prefill.*.value` payloads.
 * 5. **Duplicate clusters** (`exercise-duplicate-clusters.json`): optional cross-check only; phase-5/6
 *    artifacts already embed `cluster_id` / canonical choices. Not required for DB columns when preview exists.
 */

import type { ExerciseEligibilityEntry } from "./generatorEligibilityTypes";
import type { LibraryPruningDecisionArtifact, LibraryPruningDecisionRecord } from "./valueFilterTypes";
import type { LlmClassificationValidated, LlmValidatedArtifact } from "./llmClassificationTypes";
import type { GeneratorEligibilityPreviewArtifact } from "./generatorEligibilityTypes";

export type CurationPrefillArtifact = {
  schema_version: number;
  records: Array<{
    exercise_id: string;
    prefill: Record<
      string,
      { value?: unknown; confidence?: number; reason_codes?: string[]; sources?: string[]; trust_tier?: string }
    >;
  }>;
};

/** Row shape written by `syncCurationToSupabase` (snake_case matches DB). */
export type CurationDbUpsertRow = {
  curation_primary_role: string | null;
  curation_equipment_class: string | null;
  curation_complexity: string | null;
  curation_keep_category: string | null;
  curation_generator_eligibility_state: string | null;
  curation_canonical_exercise_id: string | null;
  curation_cluster_id: string | null;
  curation_sport_transfer_tags: string[];
  curation_movement_patterns: string[];
  curation_llm_confidence: number | null;
  curation_pruning_recommendation: string | null;
  curation_is_canonical: boolean | null;
  curation_merge_target_exercise_id: string | null;
  curation_review_notes: Record<string, unknown> | null;
  curation_reason_codes: string[];
  curation_updated_at: string;
};

function readPrefillString(
  prefill: CurationPrefillArtifact["records"][0]["prefill"],
  key: string
): string | null {
  const block = prefill?.[key] as { value?: string } | undefined;
  const v = block?.value;
  return typeof v === "string" && v.length > 0 ? v : null;
}

function readPrefillStringArray(
  prefill: CurationPrefillArtifact["records"][0]["prefill"],
  key: string
): string[] {
  const block = prefill?.[key] as { value?: string[] } | undefined;
  const v = block?.value;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function indexPruning(records: LibraryPruningDecisionRecord[]): Map<string, LibraryPruningDecisionRecord> {
  const m = new Map<string, LibraryPruningDecisionRecord>();
  for (const r of records) m.set(r.exercise_id, r);
  return m;
}

function indexLlm(records: LlmValidatedArtifact["records"]): Map<string, LlmValidatedArtifact["records"][0]> {
  const m = new Map<string, LlmValidatedArtifact["records"][0]>();
  for (const r of records) m.set(r.exercise_id, r);
  return m;
}

function indexPrefill(records: CurationPrefillArtifact["records"]): Map<string, CurationPrefillArtifact["records"][0]> {
  const m = new Map<string, CurationPrefillArtifact["records"][0]>();
  for (const r of records) m.set(r.exercise_id, r);
  return m;
}

function pickLlmOrPrefill(
  merged: LlmClassificationValidated | null,
  prefill: CurationPrefillArtifact["records"][0] | undefined,
  field: keyof LlmClassificationValidated
): string | string[] | number | null {
  if (merged) {
    const v = merged[field];
    if (v != null) {
      if (Array.isArray(v) && v.length) return v;
      if (typeof v === "string" && v.length) return v;
      if (typeof v === "number") return v;
    }
  }
  if (!prefill) return null;
  if (field === "movement_patterns") return readPrefillStringArray(prefill.prefill, "movement_patterns");
  if (field === "sport_transfer_tags") return readPrefillStringArray(prefill.prefill, "sport_transfer_tags");
  const s = readPrefillString(prefill.prefill, field as string);
  return s;
}

export type MergeCurationArtifactsInput = {
  eligibilityPreview: GeneratorEligibilityPreviewArtifact;
  pruning: LibraryPruningDecisionArtifact;
  llmValidated: LlmValidatedArtifact;
  prefill: CurationPrefillArtifact;
  /** ISO timestamp for curation_updated_at */
  generatedAtIso: string;
};

export type MergeCurationArtifactsResult = {
  by_exercise_id: Map<string, CurationDbUpsertRow>;
  merge_summary: {
    exercise_count: number;
    ids_from_eligibility_preview: number;
    with_llm_validated: number;
    with_prefill_only: number;
  };
};

export function mergeCurationArtifacts(input: MergeCurationArtifactsInput): MergeCurationArtifactsResult {
  const { eligibilityPreview, pruning, llmValidated, prefill, generatedAtIso } = input;
  const pruningById = indexPruning(pruning.records);
  const llmById = indexLlm(llmValidated.records);
  const prefillById = indexPrefill(prefill.records);

  const by_id = eligibilityPreview.by_id as Record<string, ExerciseEligibilityEntry>;
  const allIds = Object.keys(by_id).sort();
  const by_exercise_id = new Map<string, CurationDbUpsertRow>();

  let withLlm = 0;
  let prefillOnly = 0;

  for (const exercise_id of allIds) {
    const elig = by_id[exercise_id];
    const pr = pruningById.get(exercise_id);
    const llmRec = llmById.get(exercise_id);
    const pre = prefillById.get(exercise_id);
    const merged = llmRec?.merged_with_locked_prefill ?? null;

    if (llmRec) withLlm += 1;
    else if (prefillById.has(exercise_id)) prefillOnly += 1;

    const primary_role = (pickLlmOrPrefill(merged, pre, "primary_role") as string | null) ?? null;
    const equipment_class = (pickLlmOrPrefill(merged, pre, "equipment_class") as string | null) ?? null;
    const complexity = (pickLlmOrPrefill(merged, pre, "complexity") as string | null) ?? null;
    const keep_category = (pickLlmOrPrefill(merged, pre, "keep_category") as string | null) ?? null;
    const mps = pickLlmOrPrefill(merged, pre, "movement_patterns") as string[];
    const sportTags = pickLlmOrPrefill(merged, pre, "sport_transfer_tags") as string[];

    const llmConf =
      merged?.llm_confidence ??
      (typeof pr?.value_profile?.llm_confidence === "number" ? pr.value_profile.llm_confidence : null);

    const pruningRec = pr?.pruning_recommendation ?? elig.pruning_recommendation;
    const reasonCodes = pr?.pruning_reason_codes ?? [];

    const reviewNotes: Record<string, unknown> | null =
      llmRec?.locked_fields_applied?.length || llmRec?.phase3_audit
        ? {
            locked_fields_applied: llmRec?.locked_fields_applied ?? [],
            ...(llmRec?.phase3_audit ? { has_phase3_audit: true } : {}),
          }
        : null;

    const row: CurationDbUpsertRow = {
      curation_primary_role: primary_role,
      curation_equipment_class: equipment_class,
      curation_complexity: complexity,
      curation_keep_category: keep_category,
      curation_generator_eligibility_state: elig.eligibility_state,
      curation_canonical_exercise_id: pr?.canonical_exercise_id ?? null,
      curation_cluster_id: elig.cluster_id ?? pr?.cluster_id ?? null,
      curation_sport_transfer_tags: [...new Set(sportTags)],
      curation_movement_patterns: [...new Set(mps)],
      curation_llm_confidence: llmConf,
      curation_pruning_recommendation: pruningRec,
      curation_is_canonical: elig.is_canonical_in_cluster,
      curation_merge_target_exercise_id: elig.merge_target_exercise_id,
      curation_review_notes: reviewNotes,
      curation_reason_codes: [...reasonCodes],
      curation_updated_at: generatedAtIso,
    };

    by_exercise_id.set(exercise_id, row);
  }

  return {
    by_exercise_id,
    merge_summary: {
      exercise_count: allIds.length,
      ids_from_eligibility_preview: allIds.length,
      with_llm_validated: withLlm,
      with_prefill_only: prefillOnly,
    },
  };
}
