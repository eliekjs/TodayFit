/**
 * Deterministic duplicate similarity and clustering (no LLM).
 */

import type { LlmClassificationValidated } from "./llmClassificationTypes";
import {
  bigramJaccard,
  normalizeForDuplicateMatching,
  tokenizeNormalizedName,
} from "./duplicateNormalization";
import type { ClusterConfidenceBand, DuplicateClusterConfig, ExerciseDuplicateFeatures, PairwiseDuplicateResult } from "./duplicateClusterTypes";
import { DEFAULT_DUPLICATE_CLUSTER_CONFIG as DEFAULT_CFG } from "./duplicateClusterTypes";

export { DEFAULT_CFG as DEFAULT_DUPLICATE_CLUSTER_CONFIG };

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter || 1);
}

function tokenSet(tokens: string[]): Set<string> {
  return new Set(tokens.map((t) => t.toLowerCase()));
}

function bandForScore(score: number, cfg: DuplicateClusterConfig): ClusterConfidenceBand {
  if (score >= cfg.bands.high) return "high";
  if (score >= cfg.bands.medium) return "medium";
  return "low";
}

/**
 * Heuristic blocks for pairs that share a family token but are distinct exercises.
 */
export function antiDistinctPairBlock(fa: ExerciseDuplicateFeatures, fb: ExerciseDuplicateFeatures): string | null {
  const a = fa.normalized_name;
  const b = fb.normalized_name;

  if (a.includes("pulldown") !== b.includes("pulldown")) {
    const barPull = (s: string) =>
      s.includes("pull up") || s.includes("chin up") || s.includes("pull-up") || s.includes("chin-up");
    if ((a.includes("pulldown") && barPull(b)) || (b.includes("pulldown") && barPull(a))) {
      return "distinct_pulldown_vs_bar_vertical_pull";
    }
  }

  const goblet = (s: string) => s.includes("goblet");
  const frontSquat = (s: string) => s.includes("front") && s.includes("squat");
  if ((goblet(a) && frontSquat(b)) || (goblet(b) && frontSquat(a))) return "distinct_goblet_vs_front_squat";

  const hipThrust = (s: string) => s.includes("hip thrust");
  const rdlFamily = (s: string) => s.includes("romanian") || /\brdl\b/.test(s) || (s.includes("deadlift") && !s.includes("hip"));
  if ((hipThrust(a) && rdlFamily(b)) || (hipThrust(b) && rdlFamily(a))) return "distinct_hip_thrust_vs_rdl_family";

  const bulg = (s: string) => s.includes("bulgarian") || s.includes("split squat");
  const stepUp = (s: string) => s.includes("step up") || s.includes("step-up");
  if ((bulg(a) && stepUp(b) && !bulg(b)) || (bulg(b) && stepUp(a) && !bulg(a))) {
    if (bigramJaccard(a, b) < 0.55) return "distinct_bulgarian_split_vs_step_up";
  }

  const pallof = (s: string) => s.includes("pallof");
  const plank = (s: string) => /\bplank\b/.test(s);
  if ((pallof(a) && plank(b)) || (pallof(b) && plank(a))) return "distinct_pallof_vs_plank";

  const mpA = new Set(fa.movement_patterns);
  const mpB = new Set(fb.movement_patterns);
  if (mpA.size && mpB.size) {
    const pullSplit =
      (mpA.has("horizontal_pull") && mpB.has("vertical_pull")) || (mpA.has("vertical_pull") && mpB.has("horizontal_pull"));
    if (pullSplit && jaccard(mpA, mpB) < 0.5 && bigramJaccard(a, b) < 0.72) {
      return "distinct_pull_plane_horizontal_vs_vertical";
    }
  }

  return null;
}

export function metadataCompletenessScore(row: {
  description: string | null;
  tags: string[];
  muscles: string[];
  ontology_movement_patterns: string[];
}): number {
  let s = 0;
  let max = 5;
  if (row.description && row.description.trim().length > 20) s += 1;
  if (row.tags.length >= 3) s += 1;
  else if (row.tags.length) s += 0.5;
  if (row.muscles.length) s += 1;
  if (row.ontology_movement_patterns.length) s += 1;
  s += 0.5; // has id/name always
  return Math.min(1, s / max);
}

export function buildExerciseDuplicateFeatures(
  exercise_id: string,
  row: import("./types").CatalogExerciseRow,
  merged: LlmClassificationValidated | null
): ExerciseDuplicateFeatures {
  const raw_name = row.name;
  const normalized_name = normalizeForDuplicateMatching(raw_name);
  const name_tokens = tokenizeNormalizedName(normalized_name);
  const ont = row.ontology;
  const aliases: string[] = [];
  const extra = row.extra as { aliases?: string[] } | undefined;
  if (extra?.aliases?.length) aliases.push(...extra.aliases.map(String));

  const movement_patterns = merged?.movement_patterns?.length
    ? [...merged.movement_patterns]
    : (ont?.movement_patterns ?? []).map(String);
  const equipment_class = merged?.equipment_class ?? null;
  const primary_role = merged?.primary_role ?? null;
  const keep_category = merged?.keep_category ?? null;

  const meta = metadataCompletenessScore({
    description: row.description,
    tags: row.tags ?? [],
    muscles: row.muscles ?? [],
    ontology_movement_patterns: ont?.movement_patterns ?? [],
  });

  return {
    exercise_id,
    raw_name,
    normalized_name,
    name_tokens,
    aliases: aliases.map((x) => normalizeForDuplicateMatching(x)),
    movement_patterns,
    equipment_class,
    primary_role,
    keep_category,
    muscles: [...(row.muscles ?? []), ...(row.primary_muscles ?? [])].map((m) => m.toLowerCase()),
    tags: (row.tags ?? []).map((t) => t.toLowerCase()),
    metadata_completeness: meta,
    llm_confidence: merged?.llm_confidence ?? null,
    ambiguity_flag_count: merged?.ambiguity_flags?.length ?? 0,
  }
}

export function computePairwiseDuplicateScore(
  fa: ExerciseDuplicateFeatures,
  fb: ExerciseDuplicateFeatures,
  cfg: DuplicateClusterConfig = DEFAULT_CFG
): PairwiseDuplicateResult {
  const block = antiDistinctPairBlock(fa, fb);
  if (block) {
    return {
      exercise_id_a: fa.exercise_id,
      exercise_id_b: fb.exercise_id,
      score: 0,
      band: "low",
      factor_scores: {},
      reason_codes: ["blocked_anti_distinct", block],
      blocked: true,
      block_reason: block,
    };
  }

  const w = cfg.weights;
  const ta = tokenSet(fa.name_tokens);
  const tb = tokenSet(fb.name_tokens);
  const nameJ = jaccard(ta, tb);

  let aliasScore = 0;
  if (fa.aliases.length && fb.aliases.length) {
    const aset = new Set(fa.aliases.flatMap((x) => tokenizeNormalizedName(x)));
    const bset = new Set(fb.aliases.flatMap((x) => tokenizeNormalizedName(x)));
    aliasScore = jaccard(aset, bset);
  }

  const charSim = bigramJaccard(fa.normalized_name, fb.normalized_name);

  const mpA = new Set(fa.movement_patterns);
  const mpB = new Set(fb.movement_patterns);
  const mpJ = mpA.size && mpB.size ? jaccard(mpA, mpB) : 0;

  const eqMatch = fa.equipment_class && fb.equipment_class && fa.equipment_class === fb.equipment_class ? 1 : 0;
  const prMatch = fa.primary_role && fb.primary_role && fa.primary_role === fb.primary_role ? 1 : 0;

  const musJ = jaccard(new Set(fa.muscles), new Set(fb.muscles));
  const tagJ = jaccard(new Set(fa.tags), new Set(fb.tags));

  let kc = 0;
  if (fa.keep_category && fb.keep_category) {
    if (fa.keep_category === fb.keep_category) kc = 1;
    else if (
      (fa.keep_category === "core" && fb.keep_category === "niche") ||
      (fb.keep_category === "core" && fa.keep_category === "niche")
    ) {
      kc = 0.5;
    }
  }

  const factor_scores: Record<string, number> = {
    name_token_jaccard: nameJ,
    name_char_similarity: charSim,
    alias_overlap: aliasScore,
    movement_patterns_jaccard: mpJ,
    equipment_match: eqMatch,
    primary_role_match: prMatch,
    muscle_jaccard: musJ,
    tag_jaccard: tagJ,
    keep_category_alignment: kc,
  };

  let score = 0;
  score += w.name_token_jaccard * nameJ;
  score += w.name_char_similarity * charSim;
  score += w.alias_overlap * aliasScore;
  score += w.movement_patterns_jaccard * mpJ;
  score += w.equipment_match * eqMatch;
  score += w.primary_role_match * prMatch;
  score += w.muscle_jaccard * musJ;
  score += w.tag_jaccard * tagJ;
  score += w.keep_category_alignment * kc;

  const wsum =
    w.name_token_jaccard +
    w.name_char_similarity +
    w.alias_overlap +
    w.movement_patterns_jaccard +
    w.equipment_match +
    w.primary_role_match +
    w.muscle_jaccard +
    w.tag_jaccard +
    w.keep_category_alignment;

  score = wsum > 0 ? score / wsum : 0;

  /** Penalize single shared vague token without strong name match. */
  if (nameJ < 0.25 && charSim < 0.45 && mpJ < 0.5) {
    score *= 0.85;
    factor_scores["penalty_weak_shared_family"] = 0.85;
  }

  const reason_codes = ["pairwise_weighted_blend"];
  if (nameJ >= 0.6) reason_codes.push("strong_name_token_overlap");
  if (charSim >= 0.75) reason_codes.push("strong_char_similarity");
  if (mpJ >= 0.5 && eqMatch > 0) reason_codes.push("shared_movement_and_equipment");

  return {
    exercise_id_a: fa.exercise_id,
    exercise_id_b: fb.exercise_id,
    score,
    band: bandForScore(score, cfg),
    factor_scores,
    reason_codes,
    blocked: false,
  };
}

class UnionFind {
  parent: Map<string, string> = new Map();
  find(a: string): string {
    if (!this.parent.has(a)) this.parent.set(a, a);
    let p = this.parent.get(a)!;
    if (p !== a) this.parent.set(a, this.find(p));
    return this.parent.get(a)!;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

/** Inverted index: token -> exercise ids (tokens length >= 3 or from meaningful set). */
export function buildTokenIndex(features: Map<string, ExerciseDuplicateFeatures>): Map<string, Set<string>> {
  const idx = new Map<string, Set<string>>();
  for (const [id, f] of features) {
    const tok = new Set<string>();
    for (const t of f.name_tokens) {
      if (t.length >= 3) tok.add(t);
    }
    for (const al of f.aliases) {
      for (const t of tokenizeNormalizedName(al)) {
        if (t.length >= 3) tok.add(t);
      }
    }
    for (const t of tok) {
      if (!idx.has(t)) idx.set(t, new Set());
      idx.get(t)!.add(id);
    }
  }
  return idx;
}

const MAX_IDS_PER_TOKEN_FOR_ALL_PAIRS = 120;

function shareAtLeastTwoNameTokens(fa: ExerciseDuplicateFeatures, fb: ExerciseDuplicateFeatures): boolean {
  const sa = new Set(fa.name_tokens);
  let n = 0;
  for (const t of fb.name_tokens) {
    if (sa.has(t)) {
      n += 1;
      if (n >= 2) return true;
    }
  }
  return false;
}

export function enumerateCandidatePairs(features: Map<string, ExerciseDuplicateFeatures>): Set<string> {
  const idx = buildTokenIndex(features);
  const pairs = new Set<string>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  for (const ids of idx.values()) {
    const arr = [...ids];
    if (arr.length <= MAX_IDS_PER_TOKEN_FOR_ALL_PAIRS) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const fa = features.get(arr[i]!)!;
          const fb = features.get(arr[j]!)!;
          if (
            shareAtLeastTwoNameTokens(fa, fb) ||
            bigramJaccard(fa.normalized_name, fb.normalized_name) >= 0.88
          ) {
            pairs.add(key(arr[i]!, arr[j]!));
          }
        }
      }
    }
  }

  const sigMap = new Map<string, string[]>();
  for (const [id, f] of features) {
    const sig = [...f.name_tokens].sort().join(" ");
    if (!sigMap.has(sig)) sigMap.set(sig, []);
    sigMap.get(sig)!.push(id);
  }
  for (const ids of sigMap.values()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        pairs.add(key(ids[i]!, ids[j]!));
      }
    }
  }

  const sorted = [...features.keys()].sort((a, b) => {
    const na = features.get(a)!.normalized_name;
    const nb = features.get(b)!.normalized_name;
    return na.localeCompare(nb);
  });
  const WINDOW = 12;
  for (let i = 0; i < sorted.length; i++) {
    for (let k = 1; k <= WINDOW && i + k < sorted.length; k++) {
      const a = sorted[i]!;
      const b = sorted[i + k]!;
      const fa = features.get(a)!;
      const fb = features.get(b)!;
      if (bigramJaccard(fa.normalized_name, fb.normalized_name) >= 0.82) {
        pairs.add(key(a, b));
      }
    }
  }

  return pairs;
}

export function clusterByPairwiseScores(
  features: Map<string, ExerciseDuplicateFeatures>,
  pairScores: Map<string, PairwiseDuplicateResult>,
  cfg: DuplicateClusterConfig
): { components: string[][]; pairKeyToScore: Map<string, number> } {
  const uf = new UnionFind();
  const pairKeyToScore = new Map<string, number>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  const edges: { k: string; s: number }[] = [];
  for (const [k, r] of pairScores) {
    if (r.blocked || r.score < cfg.edge_threshold) continue;
    pairKeyToScore.set(k, r.score);
    edges.push({ k, s: r.score });
  }
  edges.sort((a, b) => b.s - a.s);

  for (const e of edges) {
    const [a, b] = e.k.split("|") as [string, string];
    uf.union(a, b);
  }

  const compMap = new Map<string, string[]>();
  for (const id of features.keys()) {
    const r = uf.find(id);
    if (!compMap.has(r)) compMap.set(r, []);
    compMap.get(r)!.push(id);
  }

  const components = [...compMap.values()].filter((c) => c.length >= 2);
  return { components, pairKeyToScore };
}

export function minPairwiseScoreInCluster(
  memberIds: string[],
  pairScores: Map<string, PairwiseDuplicateResult>
): number {
  if (memberIds.length < 2) return 1;
  let m = 1;
  let any = false;
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const k =
        memberIds[i]! < memberIds[j]!
          ? `${memberIds[i]}|${memberIds[j]}`
          : `${memberIds[j]}|${memberIds[i]}`;
      const r = pairScores.get(k);
      if (!r || r.blocked) continue;
      any = true;
      m = Math.min(m, r.score);
    }
  }
  return any ? m : 0;
}
