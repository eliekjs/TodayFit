/**
 * Deterministic heuristics for exercise value / simplicity (phase 5).
 */

import { normalizeForDuplicateMatching, tokenizeNormalizedName } from "./duplicateNormalization";
import type { KeywordFamilyHit } from "./removalKeywordSets";
import { matchRemovalKeywordFamilies } from "./removalKeywordSets";
import type { CatalogExerciseRow } from "./types";

const MODIFIER_TOKENS = new Set([
  "decline",
  "incline",
  "staggered",
  "offset",
  "unilateral",
  "alternating",
  "single",
  "rear",
  "foot",
  "elevated",
  "paused",
  "tempo",
  "band",
  "resisted",
  "assisted",
  "weighted",
  "deficit",
  "rack",
  "landmine",
  "kneeling",
  "half",
  "tall",
  "contralateral",
  "ipsilateral",
  "bottoms",
  "oscillat",
  "isometric",
  "extreme",
  "wide",
  "narrow",
  "close",
  "sumo",
  "3",
  "way",
  "three",
  "order",
  "cossack",
]);

const POSITIONAL_QUALIFIERS = [
  "kneeling",
  "half kneeling",
  "tall kneeling",
  "contralateral",
  "ipsilateral",
  "elevated",
  "offset",
  "staggered",
  "bottoms",
  "rear foot",
  "foot elevated",
];

export type NameHeuristicAnalysis = {
  normalized: string;
  token_count: number;
  slug_word_count: number;
  char_count: number;
  keyword_hits: KeywordFamilyHit[];
  modifier_token_hits: number;
  /** Distinct modifier tokens from MODIFIER_TOKENS set. */
  stacked_modifier_count: number;
  positional_modifier_score: number;
  /** How many positional qualifier phrases appear (stacked coaching burden). */
  positional_qualifier_hits: number;
};

export function analyzeExerciseName(exerciseName: string, exerciseId: string): NameHeuristicAnalysis {
  const normalized = normalizeForDuplicateMatching(exerciseName);
  const tokens = tokenizeNormalizedName(normalized);
  const slug = exerciseId.replace(/[_/]+/g, " ").trim().toLowerCase();
  const slugWords = slug.split(/\s+/).filter(Boolean);
  const keyword_hits = matchRemovalKeywordFamilies(normalized);

  let modifier_token_hits = 0;
  let stacked_modifier_count = 0;
  for (const t of tokens) {
    if (MODIFIER_TOKENS.has(t)) {
      modifier_token_hits += 1;
      stacked_modifier_count += 1;
    }
  }

  let positional_modifier_score = 0;
  const stackSignals = ["kneeling", "half", "contralateral", "ipsilateral", "elevated", "offset", "staggered", "bottoms"];
  for (const s of stackSignals) {
    if (normalized.includes(s)) positional_modifier_score += 0.11;
  }
  positional_modifier_score = Math.min(1, positional_modifier_score);

  let positional_qualifier_hits = 0;
  for (const phrase of POSITIONAL_QUALIFIERS) {
    if (normalized.includes(phrase)) positional_qualifier_hits += 1;
  }

  return {
    normalized,
    token_count: tokens.length,
    slug_word_count: slugWords.length,
    char_count: exerciseName.length,
    keyword_hits,
    modifier_token_hits,
    stacked_modifier_count,
    positional_modifier_score,
    positional_qualifier_hits,
  };
}

/** 0 = simple, 1 = long / overloaded name (feeds simplicity). */
export function nameLengthComplexity(analysis: NameHeuristicAnalysis): number {
  let s = 0;
  if (analysis.token_count >= 9) s += 0.42;
  else if (analysis.token_count >= 7) s += 0.32;
  else if (analysis.token_count >= 5) s += 0.2;
  else if (analysis.token_count >= 4) s += 0.1;

  if (analysis.char_count >= 58) s += 0.34;
  else if (analysis.char_count >= 48) s += 0.26;
  else if (analysis.char_count >= 40) s += 0.14;

  s += Math.min(0.28, analysis.modifier_token_hits * 0.055);
  s += analysis.positional_modifier_score * 0.38;

  /** 3+ stacked modifiers: variation spam signal. */
  if (analysis.stacked_modifier_count >= 5) s += 0.22;
  else if (analysis.stacked_modifier_count >= 3) s += 0.14;

  /** Multiple positional qualifiers stacked. */
  if (analysis.positional_qualifier_hits >= 4) s += 0.2;
  else if (analysis.positional_qualifier_hits >= 2) s += 0.1;

  return Math.min(1, s);
}

/**
 * Extra confusion / technicality from name structure (feeds penalty scores).
 */
export function nameStructureConfusionAndTechnicality(analysis: NameHeuristicAnalysis, nameComplexity: number): {
  confusion: number;
  technicality: number;
} {
  let confusion = 0.32 * nameComplexity;
  confusion += Math.min(0.35, analysis.keyword_hits.length * 0.07);
  if (analysis.token_count >= 8) confusion += 0.12;
  if (analysis.char_count >= 52) confusion += 0.1;
  if (analysis.positional_qualifier_hits >= 3) confusion += 0.14;
  if (analysis.stacked_modifier_count >= 4) confusion += 0.12;

  let technicality = 0.22 * nameComplexity;
  technicality += Math.min(0.28, analysis.stacked_modifier_count * 0.045);
  if (analysis.positional_qualifier_hits >= 2) technicality += 0.1;
  return { confusion: Math.min(1, confusion), technicality: Math.min(1, technicality) };
}

/** Map LLM complexity to technicality baseline. */
export function complexityToTechnicality(complexity: string | null | undefined): number {
  const c = complexity?.toLowerCase() ?? "";
  if (c === "advanced") return 0.55;
  if (c === "intermediate") return 0.28;
  if (c === "beginner_friendly") return 0.08;
  return 0.22;
}

/** Equipment class that is harder to substitute in a general gym. */
export function equipmentSubstitutability(equipmentClass: string | null | undefined): number {
  const e = equipmentClass?.toLowerCase() ?? "";
  if (e === "specialty" || e === "cardio_machine") return 0.35;
  if (e === "mixed") return 0.22;
  if (e === "machine") return 0.12;
  return 0.06;
}

export function primaryRoleUsefulness(primaryRole: string | null | undefined): number {
  const r = primaryRole?.toLowerCase() ?? "";
  if (r === "compound_strength" || r === "power_explosive" || r === "conditioning") return 0.92;
  if (r === "accessory_strength" || r === "unilateral_strength") return 0.78;
  if (r === "stability_core" || r === "mobility") return 0.7;
  if (r === "injury_prevention") return 0.62;
  return 0.55;
}

export function catalogDescriptionSignal(row: CatalogExerciseRow): number {
  const d = (row.description ?? "").trim();
  if (d.length >= 280) return 0.08;
  if (d.length >= 160) return 0.04;
  return 0;
}
