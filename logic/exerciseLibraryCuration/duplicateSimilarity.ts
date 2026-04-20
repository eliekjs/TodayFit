/**
 * Deterministic redundancy similarity for library reduction (no LLM).
 */

import type { LlmClassificationValidated } from "./llmClassificationTypes";
import {
  bigramJaccard,
  normalizeForDuplicateMatching,
  tokenizeNormalizedName,
} from "./duplicateNormalization";
import type {
  ClusterConfidenceBand,
  DuplicateClusterConfig,
  ExerciseDuplicateFeatures,
  PairwiseDuplicateResult,
  RedundancyRelationship,
  RedundancyTierThresholds,
} from "./duplicateClusterTypes";
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
 * Hard merge blocks: meaningful programming distinctions — never union in the same redundancy cluster.
 */
export function hardMergeBlock(fa: ExerciseDuplicateFeatures, fb: ExerciseDuplicateFeatures): string | null {
  const a = fa.normalized_name;
  const b = fb.normalized_name;

  if (a.includes("pulldown") !== b.includes("pulldown")) {
    const barPull = (s: string) => s.includes("pull up") || s.includes("chin up");
    if ((a.includes("pulldown") && barPull(b)) || (b.includes("pulldown") && barPull(a))) {
      return "distinct_pulldown_vs_bar_vertical_pull";
    }
  }

  const goblet = (s: string) => s.includes("goblet");
  const frontSquat = (s: string) => s.includes("front") && s.includes("squat") && !s.includes("goblet");
  if ((goblet(a) && frontSquat(b)) || (goblet(b) && frontSquat(a))) return "distinct_goblet_vs_front_squat";

  const hipThrust = (s: string) => s.includes("hip thrust");
  const rdlFamily = (s: string) =>
    s.includes("romanian") || s.includes("romanian deadlift") || (s.includes("deadlift") && !s.includes("hip"));
  if ((hipThrust(a) && rdlFamily(b)) || (hipThrust(b) && rdlFamily(a))) return "distinct_hip_thrust_vs_rdl_family";

  /** Step-up (single-leg box step) vs split-squat / RFESS family — different exercise selection for programming. */
  const stepUpOnly = (s: string) =>
    (s.includes("step up") || s.includes("step-up")) && !s.includes("split squat") && !s.includes("rear foot elevated");
  const splitSquatFamily = (s: string) => s.includes("split squat") || s.includes("rear foot elevated");
  if ((stepUpOnly(a) && splitSquatFamily(b)) || (stepUpOnly(b) && splitSquatFamily(a))) {
    if (bigramJaccard(a, b) < 0.88) return "distinct_step_up_vs_split_squat_family";
  }

  const pallof = (s: string) => s.includes("pallof");
  const plank = (s: string) => /\bplank\b/.test(s);
  if ((pallof(a) && plank(b)) || (pallof(b) && plank(a))) return "distinct_pallof_vs_plank";

  const mpA = new Set(fa.movement_patterns);
  const mpB = new Set(fb.movement_patterns);
  if (mpA.size && mpB.size) {
    const pullSplit =
      (mpA.has("horizontal_pull") && mpB.has("vertical_pull")) || (mpA.has("vertical_pull") && mpB.has("horizontal_pull"));
    if (pullSplit && jaccard(mpA, mpB) < 0.5 && bigramJaccard(a, b) < 0.7) {
      return "distinct_pull_plane_horizontal_vs_vertical";
    }
  }

  return null;
}

function collectIgnoredTrivia(fa: ExerciseDuplicateFeatures, fb: ExerciseDuplicateFeatures): string[] {
  const notes: string[] = [];
  const ra = fa.raw_name.toLowerCase();
  const rb = fb.raw_name.toLowerCase();
  if (ra.includes("alternating") !== rb.includes("alternating")) notes.push("alternating_vs_non_alternating_treated_as_trivial");
  if (ra.includes("standard") !== rb.includes("standard") || ra.includes("basic") !== rb.includes("basic")) {
    notes.push("basic_standard_word_variant");
  }
  if (fa.normalized_name === fb.normalized_name && fa.exercise_id !== fb.exercise_id) notes.push("same_normalized_name_different_slug");
  if (Math.abs(ra.split(/\s+/).length - rb.split(/\s+/).length) <= 2 && bigramJaccard(fa.normalized_name, fb.normalized_name) > 0.92) {
    notes.push("minor_word_order_or_flat_descriptor_variant");
  }
  return notes.slice(0, 6);
}

function computeRawSimilarity(
  fa: ExerciseDuplicateFeatures,
  fb: ExerciseDuplicateFeatures,
  cfg: DuplicateClusterConfig
): { score: number; factor_scores: Record<string, number>; reason_codes: string[] } {
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
      kc = 0.55;
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

  /** Softer penalty for library reduction: only when almost no signal. */
  if (nameJ < 0.18 && charSim < 0.38 && mpJ < 0.35 && musJ < 0.2) {
    score *= 0.88;
    factor_scores["penalty_weak_shared_family"] = 0.88;
  }

  const reason_codes = ["pairwise_weighted_blend"];
  if (nameJ >= 0.5) reason_codes.push("strong_name_token_overlap");
  if (charSim >= 0.68) reason_codes.push("strong_char_similarity");
  if (mpJ >= 0.45 && eqMatch > 0) reason_codes.push("shared_movement_and_equipment");
  if (mpJ >= 0.5 && prMatch > 0) reason_codes.push("shared_movement_and_role");

  return { score, factor_scores, reason_codes };
}

export function computePairwiseDuplicateScore(
  fa: ExerciseDuplicateFeatures,
  fb: ExerciseDuplicateFeatures,
  cfg: DuplicateClusterConfig = DEFAULT_CFG
): PairwiseDuplicateResult {
  const raw = computeRawSimilarity(fa, fb, cfg);
  const block = hardMergeBlock(fa, fb);
  const ignored_trivia_notes = collectIgnoredTrivia(fa, fb);

  if (block) {
    return {
      exercise_id_a: fa.exercise_id,
      exercise_id_b: fb.exercise_id,
      score: 0,
      hypothetical_unblocked_score: raw.score,
      band: "low",
      factor_scores: raw.factor_scores,
      reason_codes: ["blocked_hard_distinction", block, ...raw.reason_codes],
      blocked: true,
      block_reason: block,
      hard_distinction: true,
      ignored_trivia_notes,
    };
  }

  return {
    exercise_id_a: fa.exercise_id,
    exercise_id_b: fb.exercise_id,
    score: raw.score,
    hypothetical_unblocked_score: raw.score,
    band: bandForScore(raw.score, cfg),
    factor_scores: raw.factor_scores,
    reason_codes: raw.reason_codes,
    blocked: false,
    hard_distinction: false,
    ignored_trivia_notes,
  };
}

export function redundancyTierFromMinScore(
  minInternal: number,
  tiers: RedundancyTierThresholds
): RedundancyRelationship {
  if (minInternal >= tiers.exact_duplicate) return "exact_duplicate";
  if (minInternal >= tiers.near_duplicate) return "near_duplicate";
  if (minInternal >= tiers.practical_merge_candidate) return "practical_merge_candidate";
  return "practical_merge_candidate";
}

export function metadataCompletenessScore(row: {
  description: string | null;
  tags: string[];
  muscles: string[];
  ontology_movement_patterns: string[];
}): number {
  let s = 0;
  const max = 5;
  if (row.description && row.description.trim().length > 20) s += 1;
  if (row.tags.length >= 3) s += 1;
  else if (row.tags.length) s += 0.5;
  if (row.muscles.length) s += 1;
  if (row.ontology_movement_patterns.length) s += 1;
  s += 0.5;
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
  };
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function movementEquipmentKey(f: ExerciseDuplicateFeatures): string {
  const mp = [...f.movement_patterns].sort().join(",");
  const eq = f.equipment_class ?? "_none_";
  return `${mp}@@${eq}`;
}

export function primaryRoleEquipmentKey(f: ExerciseDuplicateFeatures): string {
  const pr = f.primary_role ?? "_none_";
  const eq = f.equipment_class ?? "_none_";
  return `${pr}@@${eq}`;
}

function shareEnoughNameTokens(
  fa: ExerciseDuplicateFeatures,
  fb: ExerciseDuplicateFeatures,
  minShared: number,
  bigramFallback: number
): boolean {
  const sa = new Set(fa.name_tokens);
  let n = 0;
  for (const t of fb.name_tokens) {
    if (sa.has(t)) {
      n += 1;
      if (n >= minShared) return true;
    }
  }
  return bigramJaccard(fa.normalized_name, fb.normalized_name) >= bigramFallback;
}

function muscleOverlapRatio(fa: ExerciseDuplicateFeatures, fb: ExerciseDuplicateFeatures): number {
  const A = new Set(fa.muscles);
  const B = new Set(fb.muscles);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / Math.min(A.size, B.size);
}

/** Inverted index: token -> exercise ids. */
export function buildTokenIndex(features: Map<string, ExerciseDuplicateFeatures>): Map<string, Set<string>> {
  const idx = new Map<string, Set<string>>();
  for (const [id, f] of features) {
    const tok = new Set<string>();
    for (const t of f.name_tokens) {
      if (t.length >= 2) tok.add(t);
    }
    for (const al of f.aliases) {
      for (const t of tokenizeNormalizedName(al)) {
        if (t.length >= 2) tok.add(t);
      }
    }
    for (const t of tok) {
      if (!idx.has(t)) idx.set(t, new Set());
      idx.get(t)!.add(id);
    }
  }
  return idx;
}

function addWindowPairsFromSorted(
  sorted: string[],
  features: Map<string, ExerciseDuplicateFeatures>,
  pairs: Set<string>,
  window: number,
  bigramMin: number
): void {
  for (let i = 0; i < sorted.length; i++) {
    for (let k = 1; k <= window && i + k < sorted.length; k++) {
      const a = sorted[i]!;
      const b = sorted[i + k]!;
      const fa = features.get(a)!;
      const fb = features.get(b)!;
      if (bigramJaccard(fa.normalized_name, fb.normalized_name) >= bigramMin) {
        pairs.add(pairKey(a, b));
      }
    }
  }
}

function addPairsFromBucket(
  ids: string[],
  features: Map<string, ExerciseDuplicateFeatures>,
  pairs: Set<string>,
  cfg: DuplicateClusterConfig,
  maxPairs: number
): void {
  if (ids.length < 2) return;
  const sorted = [...ids].sort();
  const n = sorted.length;
  const total = (n * (n - 1)) / 2;
  if (total <= maxPairs) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const fa = features.get(sorted[i]!)!;
        const fb = features.get(sorted[j]!)!;
        if (
          shareEnoughNameTokens(fa, fb, cfg.candidate_generation.min_shared_name_tokens, cfg.candidate_generation.token_bucket_bigram_min) ||
          muscleOverlapRatio(fa, fb) >= cfg.candidate_generation.muscle_overlap_min_ratio ||
          bigramJaccard(fa.normalized_name, fb.normalized_name) >= cfg.candidate_generation.window_bigram_min
        ) {
          pairs.add(pairKey(sorted[i]!, sorted[j]!));
        }
      }
    }
    return;
  }
  const W = Math.max(12, Math.min(48, Math.ceil(cfg.candidate_generation.sorted_name_window / 2)));
  addWindowPairsFromSorted(sorted, features, pairs, W, cfg.candidate_generation.window_bigram_min * 0.92);
}

export function enumerateCandidatePairs(features: Map<string, ExerciseDuplicateFeatures>, cfg: DuplicateClusterConfig): Set<string> {
  const pairs = new Set<string>();
  const cg = cfg.candidate_generation;

  const idx = buildTokenIndex(features);
  for (const ids of idx.values()) {
    const arr = [...ids];
    if (arr.length <= cg.max_ids_per_token_bucket) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const fa = features.get(arr[i]!)!;
          const fb = features.get(arr[j]!)!;
          if (
            shareEnoughNameTokens(fa, fb, cg.min_shared_name_tokens, cg.token_bucket_bigram_min) ||
            bigramJaccard(fa.normalized_name, fb.normalized_name) >= cg.token_bucket_bigram_min
          ) {
            pairs.add(pairKey(arr[i]!, arr[j]!));
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
        pairs.add(pairKey(ids[i]!, ids[j]!));
      }
    }
  }

  const sorted = [...features.keys()].sort((a, b) => {
    const na = features.get(a)!.normalized_name;
    const nb = features.get(b)!.normalized_name;
    return na.localeCompare(nb);
  });
  addWindowPairsFromSorted(sorted, features, pairs, cg.sorted_name_window, cg.window_bigram_min);

  const meBuckets = new Map<string, string[]>();
  const roleBuckets = new Map<string, string[]>();
  for (const [id, f] of features) {
    const me = movementEquipmentKey(f);
    if (!meBuckets.has(me)) meBuckets.set(me, []);
    meBuckets.get(me)!.push(id);
    const re = primaryRoleEquipmentKey(f);
    if (!roleBuckets.has(re)) roleBuckets.set(re, []);
    roleBuckets.get(re)!.push(id);
  }
  for (const ids of meBuckets.values()) {
    addPairsFromBucket(ids, features, pairs, cfg, cg.max_pairs_per_me_bucket);
  }
  for (const ids of roleBuckets.values()) {
    addPairsFromBucket(ids, features, pairs, cfg, cg.max_pairs_per_role_bucket);
  }

  return pairs;
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

export function clusterByPairwiseScores(
  features: Map<string, ExerciseDuplicateFeatures>,
  pairScores: Map<string, PairwiseDuplicateResult>,
  cfg: DuplicateClusterConfig
): { components: string[][]; pairKeyToScore: Map<string, number> } {
  const uf = new UnionFind();
  const pairKeyToScore = new Map<string, number>();
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
