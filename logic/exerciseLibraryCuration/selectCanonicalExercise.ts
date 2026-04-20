/**
 * Choose a canonical exercise id within a duplicate cluster (deterministic).
 * Phase 4 uses value-aware scoring when a catalog row is present on the context.
 */

import type { CurationKeepCategory } from "./enums";
import type { ExerciseDuplicateFeatures } from "./duplicateClusterTypes";
import type { LlmClassificationValidated } from "./llmClassificationTypes";
import { scoreExerciseValue } from "./scoreExerciseValue";
import type { ExercisePrefillRecord } from "./types";
import type { CatalogExerciseRow } from "./types";
import { selectCanonicalFromValueProfiles } from "./canonicalSelectionHelpers";
import type { ExerciseValueProfile } from "./valueFilterTypes";
import { DEFAULT_LIBRARY_PRUNING_CONFIG } from "./valueFilterTypes";

export type CanonicalSelectionContext = {
  features: ExerciseDuplicateFeatures;
  merged: LlmClassificationValidated | null;
  /** When set, phase-5 value scoring uses full catalog metadata. */
  catalog_row?: CatalogExerciseRow | null;
  /** Optional phase-2 prefill for the exercise (rare in phase 4 runner). */
  prefill_record?: ExercisePrefillRecord | null;
};

export type CanonicalScoreOptions = {
  /** When true, every member in the cluster is remove_candidate — avoid extra penalty. */
  all_members_are_remove_candidate: boolean;
};

function syntheticCatalogRowFromFeatures(f: ExerciseDuplicateFeatures): CatalogExerciseRow {
  return {
    id: f.exercise_id,
    name: f.raw_name,
    description: null,
    primary_muscles: [],
    secondary_muscles: [],
    muscles: f.muscles,
    modalities: [],
    equipment: f.equipment_class ? [f.equipment_class] : [],
    tags: f.tags,
    contraindications: [],
    progressions: [],
    regressions: [],
    movement_pattern: null,
    ontology: { movement_patterns: f.movement_patterns },
    extra: {},
  };
}

function profileFromContext(ctx: CanonicalSelectionContext): ExerciseValueProfile {
  const row = ctx.catalog_row ?? syntheticCatalogRowFromFeatures(ctx.features);
  return scoreExerciseValue(row, ctx.merged, ctx.prefill_record ?? null, DEFAULT_LIBRARY_PRUNING_CONFIG, {
    not_in_redundancy_cluster: false,
  });
}

/**
 * Higher score = better canonical candidate. Deterministic tie-break by exercise_id.
 * @deprecated Prefer `selectCanonicalExerciseId` which uses the same underlying value profiles.
 */
export function canonicalCandidateScore(
  ctx: CanonicalSelectionContext,
  opts: CanonicalScoreOptions
): { score: number; reasons: string[] } {
  const p = profileFromContext(ctx);
  let score = p.canonical_preference_score * 100;
  const reasons = [...p.pruning_reason_codes];

  const kc = ctx.merged?.keep_category as CurationKeepCategory | undefined;
  if (kc === "remove_candidate" && !opts.all_members_are_remove_candidate) {
    score -= 18;
    reasons.push("penalize_remove_candidate");
  } else if (kc === "remove_candidate" && opts.all_members_are_remove_candidate) {
    reasons.push("remove_candidate_all_members_poor_no_extra_penalty");
  }

  return { score, reasons };
}

/**
 * Pick canonical exercise using phase-5 value profiles (aligned with library pruning).
 */
export function selectCanonicalExerciseId(
  memberIds: string[],
  ctxById: Map<string, CanonicalSelectionContext>
): { canonical_id: string; reasons: string[] } {
  const allRemove = memberIds.every((id) => ctxById.get(id)?.merged?.keep_category === "remove_candidate");
  const profiles = new Map<string, ExerciseValueProfile>();
  for (const id of memberIds) {
    const ctx = ctxById.get(id);
    if (!ctx) continue;
    profiles.set(id, profileFromContext(ctx));
  }
  const { canonical_id, selection_reason_codes } = selectCanonicalFromValueProfiles(memberIds, profiles, {
    all_members_remove_candidate: allRemove,
  });
  return { canonical_id, reasons: selection_reason_codes };
}
