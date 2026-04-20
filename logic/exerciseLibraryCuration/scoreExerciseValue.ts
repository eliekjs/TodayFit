/**
 * Deterministic exercise value scoring for library pruning (phase 5).
 */

import type { CurationKeepCategory } from "./enums";
import type { LlmClassificationValidated } from "./llmClassificationTypes";
import type { ExercisePrefillRecord } from "./types";
import { blendKeywordPenaltyVectors } from "./removalKeywordSets";
import {
  analyzeExerciseName,
  catalogDescriptionSignal,
  complexityToTechnicality,
  equipmentSubstitutability,
  nameLengthComplexity,
  nameStructureConfusionAndTechnicality,
  primaryRoleUsefulness,
} from "./valueHeuristics";
import type { ExerciseValueProfile, LibraryPruningConfig, PruningRecommendation } from "./valueFilterTypes";
import { DEFAULT_LIBRARY_PRUNING_CONFIG } from "./valueFilterTypes";
import type { CatalogExerciseRow } from "./types";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

const KEEP_RANK: Record<CurationKeepCategory, number> = {
  core: 4,
  niche: 2,
  review: 0,
  merge_candidate: -1,
  remove_candidate: -3,
};

function llmKeepAlignment(merged: LlmClassificationValidated | null): number {
  if (!merged) return 0.45;
  const k = merged.keep_category;
  const base = (KEEP_RANK[k] + 3) / 7;
  const conf = merged.llm_confidence ?? 0.65;
  const amb = Math.min(0.35, (merged.ambiguity_flags?.length ?? 0) * 0.07);
  return clamp01(base * 0.65 + conf * 0.35 - amb);
}

function sportTransferBoost(merged: LlmClassificationValidated | null): number {
  const tags = merged?.sport_transfer_tags ?? [];
  if (tags.includes("general_athletic")) return 0.12;
  if (tags.some((t) => t === "running" || t === "skiing" || t === "climbing")) return 0.06;
  if (tags.includes("rehab_friendly")) return 0.04;
  return 0;
}

function prefillTrustBoost(prefill: ExercisePrefillRecord | null): number {
  if (!prefill?.prefill) return 0;
  let b = 0;
  for (const block of Object.values(prefill.prefill)) {
    if (block?.trust_tier === "locked") b += 0.02;
    else if (block?.trust_tier === "strong_prior") b += 0.01;
  }
  return Math.min(0.06, b);
}

export type ScoreExerciseValueOptions = {
  /** Unique exercises (not in any redundancy cluster) get a small extra penalty when already weak. */
  not_in_redundancy_cluster?: boolean;
};

/**
 * Compute intrinsic value profile (merge-cluster fields applied in `buildLibraryPruningDecision`).
 */
export function scoreExerciseValue(
  row: CatalogExerciseRow,
  merged: LlmClassificationValidated | null,
  prefill: ExercisePrefillRecord | null,
  cfg: LibraryPruningConfig = DEFAULT_LIBRARY_PRUNING_CONFIG,
  opts?: ScoreExerciseValueOptions
): ExerciseValueProfile {
  const analysis = analyzeExerciseName(row.name, row.id);
  const nameComplexity = nameLengthComplexity(analysis);
  const kw = blendKeywordPenaltyVectors(analysis.keyword_hits);
  const struct = nameStructureConfusionAndTechnicality(analysis, nameComplexity);

  const techLlm = complexityToTechnicality(merged?.complexity ?? null);
  const technicality_penalty_score = clamp01(
    techLlm * 0.22 + 0.52 * kw.technicality + 0.42 * struct.technicality + 0.14 * nameComplexity
  );

  const confusion_penalty_score = clamp01(
    0.52 * kw.confusion +
      0.4 * struct.confusion +
      0.16 * nameComplexity +
      0.12 * Math.min(1, (merged?.ambiguity_flags?.length ?? 0) * 0.09)
  );

  const subEq = equipmentSubstitutability(merged?.equipment_class ?? null);
  const niche_penalty_score = clamp01(
    0.62 * kw.niche +
      0.2 * (merged?.keep_category === "niche" ? 0.85 : 0) +
      0.14 * subEq +
      0.2 * technicality_penalty_score
  );

  const simplicity_score = clamp01(
    1 -
      0.62 * nameComplexity -
      0.22 * Math.min(1, kw.niche * 1.1) -
      0.08 * Math.min(1, analysis.stacked_modifier_count / 8)
  );

  const roleU = primaryRoleUsefulness(merged?.primary_role ?? null);
  const sportB = sportTransferBoost(merged);
  const descPen = catalogDescriptionSignal(row);
  let general_usefulness_score = clamp01(roleU * 0.82 + sportB + prefillTrustBoost(prefill) - descPen);

  const substitutability_score = clamp01(1 - subEq - 0.22 * kw.niche - 0.08 * nameComplexity);

  const setup_complexity_score = clamp01(
    0.38 * nameComplexity + 0.28 * positionalModifierProxy(analysis.normalized) + 0.22 * subEq + 0.2 * techLlm
  );

  const w = cfg.weights;
  let raw = clamp01(
    w.simplicity * simplicity_score +
      w.general_usefulness * general_usefulness_score +
      w.substitutability * substitutability_score +
      w.inverse_setup_burden * (1 - setup_complexity_score) +
      w.inverse_niche * (1 - niche_penalty_score) +
      w.inverse_technicality * (1 - technicality_penalty_score) +
      w.inverse_confusion * (1 - confusion_penalty_score) +
      w.llm_keep_alignment * llmKeepAlignment(merged)
  );

  /** Non-clustered unique rows that are already weak on simplicity + usefulness get a nudge toward removal. */
  if (opts?.not_in_redundancy_cluster && simplicity_score < 0.48 && general_usefulness_score < 0.58) {
    raw = clamp01(raw * 0.88 - 0.034);
  }

  /** Aggregate keyword burden pulls overall down without changing configured cutoffs. */
  const spamTri = clamp01((kw.niche + kw.confusion + kw.technicality) / 3);
  raw = clamp01(raw * (1 - 0.165 * spamTri) - 0.024 * spamTri);

  const intrinsic = clamp01(raw);

  const canonical_preference_score = computeCanonicalPreferenceScore({
    simplicity_score,
    general_usefulness_score,
    substitutability_score,
    niche_penalty_score,
    technicality_penalty_score,
    confusion_penalty_score,
    setup_complexity_score,
    merged,
  });

  const reasons: string[] = [];
  for (const h of analysis.keyword_hits) {
    reasons.push(`name_keyword_family_${h.family_id}_tier_${h.tier}`);
  }
  if (kw.niche >= 0.45) reasons.push("keyword_penalty_niche_substantial");
  if (kw.technicality >= 0.35) reasons.push("keyword_penalty_technicality_substantial");
  if (kw.confusion >= 0.35) reasons.push("keyword_penalty_confusion_substantial");
  if (technicality_penalty_score >= 0.55) reasons.push("penalty_high_technicality");
  if (confusion_penalty_score >= 0.55) reasons.push("penalty_high_confusion");
  if (niche_penalty_score >= 0.55) reasons.push("penalty_high_niche");
  if (nameComplexity >= 0.55) reasons.push("long_or_overloaded_name");
  if (analysis.stacked_modifier_count >= 3) reasons.push("stacked_modifiers_3plus");
  if (analysis.positional_qualifier_hits >= 2) reasons.push("multiple_positional_qualifiers");
  if (subEq >= 0.2) reasons.push("equipment_substitutability_penalty");
  if (merged?.keep_category === "remove_candidate") reasons.push("llm_keep_category_remove_candidate");
  if (merged?.keep_category === "niche") reasons.push("llm_keep_category_niche");
  if ((merged?.ambiguity_flags?.length ?? 0) > 0) reasons.push("llm_ambiguity_flags");
  if (opts?.not_in_redundancy_cluster && simplicity_score < 0.48 && general_usefulness_score < 0.58) {
    reasons.push("heuristic_non_clustered_low_value_unique");
  }
  if (spamTri >= 0.38) {
    reasons.push(`aggregate_keyword_burden_${spamTri.toFixed(2)}`);
  }

  return {
    exercise_id: row.id,
    exercise_name: row.name,
    intrinsic_overall_value_score: intrinsic,
    overall_value_score: intrinsic,
    simplicity_score,
    general_usefulness_score,
    substitutability_score,
    setup_complexity_score,
    niche_penalty_score,
    technicality_penalty_score,
    confusion_penalty_score,
    redundancy_penalty_score: 0,
    canonical_preference_score,
    pruning_recommendation: "review",
    pruning_reason_codes: reasons,
    llm_keep_category: merged?.keep_category ?? null,
    llm_complexity: merged?.complexity ?? null,
    llm_confidence: merged?.llm_confidence ?? null,
  };
}

function positionalModifierProxy(normalized: string): number {
  let s = 0;
  const keys = ["kneeling", "contralateral", "ipsilateral", "elevated", "offset", "staggered", "bottoms", "oscillat"];
  for (const k of keys) {
    if (normalized.includes(k)) s += 0.14;
  }
  return Math.min(1, s);
}

function computeCanonicalPreferenceScore(params: {
  simplicity_score: number;
  general_usefulness_score: number;
  substitutability_score: number;
  niche_penalty_score: number;
  technicality_penalty_score: number;
  confusion_penalty_score: number;
  setup_complexity_score: number;
  merged: LlmClassificationValidated | null;
}): number {
  const k = params.merged?.keep_category;
  let kBoost = 0;
  if (k === "core") kBoost = 0.12;
  else if (k === "niche") kBoost = 0.02;
  else if (k === "remove_candidate") kBoost = -0.2;
  else if (k === "merge_candidate") kBoost = -0.05;

  return clamp01(
    0.3 * params.simplicity_score +
      0.2 * params.general_usefulness_score +
      0.16 * params.substitutability_score +
      0.12 * (1 - params.niche_penalty_score) +
      0.1 * (1 - params.technicality_penalty_score) +
      0.08 * (1 - params.confusion_penalty_score) +
      0.04 * (1 - params.setup_complexity_score) +
      kBoost
  );
}

export function recommendStandalonePruning(
  intrinsic: number,
  merged: LlmClassificationValidated | null,
  cfg: LibraryPruningConfig,
  hints?: {
    simplicity_score: number;
    niche_penalty_score: number;
    keyword_hit_count: number;
  }
): { recommendation: PruningRecommendation; reason_codes: string[] } {
  const reasons: string[] = [];
  const k = merged?.keep_category;
  let score = intrinsic;
  if (k === "merge_candidate") {
    score -= cfg.merge_candidate_not_in_cluster_penalty;
    reasons.push("llm_merge_candidate_not_in_cluster_penalty");
  }

  if (k === "remove_candidate" && score < 0.82) {
    reasons.push("llm_remove_candidate");
    return { recommendation: "remove_niche_or_low_value", reason_codes: reasons };
  }

  if (hints) {
    if (hints.simplicity_score < 0.28 && score < 0.58) {
      reasons.push("heuristic_extreme_name_burden");
      return { recommendation: "remove_niche_or_low_value", reason_codes: reasons };
    }
    if (hints.niche_penalty_score >= 0.58 && hints.simplicity_score < 0.44 && score < 0.54) {
      reasons.push("heuristic_high_niche_low_simplicity");
      return { recommendation: "remove_niche_or_low_value", reason_codes: reasons };
    }
    if (hints.simplicity_score < 0.38 && hints.niche_penalty_score > 0.58) {
      reasons.push("heuristic_low_simplicity_high_niche");
      return { recommendation: "remove_niche_or_low_value", reason_codes: reasons };
    }
    if (hints.keyword_hit_count >= 3 && hints.simplicity_score < 0.48) {
      reasons.push("heuristic_keyword_stack_low_simplicity");
      return { recommendation: "remove_niche_or_low_value", reason_codes: reasons };
    }
  }

  if (score < cfg.thresholds.remove_below) {
    reasons.push("score_below_remove_threshold");
    return { recommendation: "remove_niche_or_low_value", reason_codes: reasons };
  }

  if (
    k === "review" &&
    score >= cfg.thresholds.keep_niche_min &&
    score < cfg.thresholds.keep_core_min
  ) {
    reasons.push("llm_review_mid_band");
    return { recommendation: "review", reason_codes: reasons };
  }

  if (score >= cfg.thresholds.keep_core_min && k !== "niche") {
    reasons.push("score_keep_core_band");
    return { recommendation: "keep_core", reason_codes: reasons };
  }

  if (score >= cfg.thresholds.keep_core_min && k === "niche") {
    reasons.push("score_high_but_llm_niche");
    return { recommendation: "keep_niche", reason_codes: reasons };
  }

  if (score >= cfg.thresholds.keep_niche_min) {
    reasons.push("score_keep_niche_band");
    return { recommendation: "keep_niche", reason_codes: reasons };
  }

  if (score >= cfg.thresholds.review_low && score < cfg.thresholds.review_high) {
    reasons.push("score_review_band");
    return { recommendation: "review", reason_codes: reasons };
  }

  reasons.push("score_low");
  return { recommendation: "remove_niche_or_low_value", reason_codes: reasons };
}
