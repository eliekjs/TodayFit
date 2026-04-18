/**
 * Choose a canonical exercise id within a duplicate cluster (deterministic).
 */

import type { CurationKeepCategory } from "./enums";
import type { ExerciseDuplicateFeatures } from "./duplicateClusterTypes";
import type { LlmClassificationValidated } from "./llmClassificationTypes";

export type CanonicalSelectionContext = {
  features: ExerciseDuplicateFeatures;
  merged: LlmClassificationValidated | null;
};

const KEEP_RANK: Record<CurationKeepCategory, number> = {
  core: 4,
  niche: 2,
  review: 1,
  merge_candidate: 0,
  remove_candidate: -2,
};

export type CanonicalScoreOptions = {
  /** When true, every member in the cluster is remove_candidate — avoid extra penalty. */
  all_members_are_remove_candidate: boolean;
};

/**
 * Higher score = better canonical candidate. Deterministic tie-break by exercise_id.
 */
export function canonicalCandidateScore(
  ctx: CanonicalSelectionContext,
  opts: CanonicalScoreOptions
): { score: number; reasons: string[] } {
  const { features, merged } = ctx;
  const reasons: string[] = [];
  let score = 0;

  const name = features.raw_name;
  const len = name.length;
  if (len >= 12 && len <= 48) {
    score += 2;
    reasons.push("name_length_readable");
  }
  if (/^[A-Z]/.test(name) && !/\s{2,}/.test(name)) {
    score += 0.5;
    reasons.push("name_title_case_clean");
  }

  score += features.metadata_completeness * 6;
  reasons.push(`metadata_completeness_${features.metadata_completeness.toFixed(2)}`);

  const kc = merged?.keep_category as CurationKeepCategory | undefined;
  if (kc) {
    score += KEEP_RANK[kc] * 2;
    reasons.push(`keep_category_${kc}`);
  }

  if (merged) {
    score += merged.llm_confidence * 3;
    reasons.push(`llm_confidence_${merged.llm_confidence.toFixed(2)}`);
    score -= merged.ambiguity_flags.length * 1.5;
    if (merged.ambiguity_flags.length) reasons.push("ambiguity_penalty");
  }

  if (kc === "remove_candidate" && !opts.all_members_are_remove_candidate) {
    score -= 8;
    reasons.push("penalize_remove_candidate");
  } else if (kc === "remove_candidate" && opts.all_members_are_remove_candidate) {
    reasons.push("remove_candidate_all_members_poor_no_extra_penalty");
  }

  return { score, reasons };
}

export function selectCanonicalExerciseId(
  memberIds: string[],
  ctxById: Map<string, CanonicalSelectionContext>
): { canonical_id: string; reasons: string[] } {
  const allRemove = memberIds.every((id) => ctxById.get(id)?.merged?.keep_category === "remove_candidate");
  const opts: CanonicalScoreOptions = { all_members_are_remove_candidate: allRemove };

  let bestId = memberIds[0]!;
  let best = canonicalCandidateScore(ctxById.get(bestId)!, opts);
  for (const id of memberIds.slice(1)) {
    const ctx = ctxById.get(id);
    if (!ctx) continue;
    const s = canonicalCandidateScore(ctx, opts);
    if (s.score > best.score || (s.score === best.score && id < bestId)) {
      best = s;
      bestId = id;
    }
  }
  return { canonical_id: bestId, reasons: best.reasons };
}
