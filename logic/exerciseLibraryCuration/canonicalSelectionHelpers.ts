/**
 * Canonical exercise selection within a redundancy cluster (phase 5).
 */

import type { CurationKeepCategory } from "./enums";
import type { ExerciseValueProfile } from "./valueFilterTypes";

export type CanonicalSelectionOptions = {
  /** If every member is remove_candidate, do not heavily penalize remove_candidate. */
  all_members_remove_candidate: boolean;
};

const KEEP_ORDER: Record<CurationKeepCategory, number> = {
  core: 5,
  niche: 3,
  review: 2,
  merge_candidate: 1,
  remove_candidate: 0,
};

function keepRank(k: CurationKeepCategory | null | undefined): number {
  if (!k) return 2;
  return KEEP_ORDER[k] ?? 2;
}

/**
 * Prefer higher adjusted preference (simplest + least niche/technical/confusion),
 * then LLM keep_category, then lower niche penalty, then higher simplicity, then id.
 */
export function selectCanonicalFromValueProfiles(
  memberIds: string[],
  profiles: Map<string, ExerciseValueProfile>,
  opts: CanonicalSelectionOptions
): { canonical_id: string; selection_reason_codes: string[] } {
  const ids = [...memberIds].filter((id) => profiles.has(id));
  if (ids.length === 0) {
    return { canonical_id: memberIds[0]!, selection_reason_codes: ["no_profiles_fallback_first_id"] };
  }
  if (ids.length === 1) {
    return { canonical_id: ids[0]!, selection_reason_codes: ["singleton_cluster"] };
  }

  const scored = ids.map((id) => {
    const p = profiles.get(id)!;
    const k = p.llm_keep_category as CurationKeepCategory | null;
    let pref = p.canonical_preference_score;
    pref += 0.12 * p.simplicity_score;
    pref -= 0.22 * p.niche_penalty_score;
    pref -= 0.14 * p.technicality_penalty_score;
    pref -= 0.1 * p.confusion_penalty_score;
    if (k === "remove_candidate" && !opts.all_members_remove_candidate) {
      pref -= 0.24;
    }
    return {
      id,
      pref,
      keep_rank: keepRank(k),
      niche: p.niche_penalty_score,
      simplicity: p.simplicity_score,
    };
  });

  scored.sort((a, b) => {
    if (b.pref !== a.pref) return b.pref - a.pref;
    if (b.keep_rank !== a.keep_rank) return b.keep_rank - a.keep_rank;
    if (a.niche !== b.niche) return a.niche - b.niche;
    if (b.simplicity !== a.simplicity) return b.simplicity - a.simplicity;
    return a.id.localeCompare(b.id);
  });

  const winner = scored[0]!;
  const reasons = [
    `adjusted_preference_${winner.pref.toFixed(3)}`,
    `keep_rank_${winner.keep_rank}`,
    `niche_penalty_${winner.niche.toFixed(3)}`,
    "tie_break_simplicity_then_id",
  ];
  return { canonical_id: winner.id, selection_reason_codes: reasons };
}
