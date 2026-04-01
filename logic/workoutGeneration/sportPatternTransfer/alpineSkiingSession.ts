/**
 * Alpine skiing sport-pattern integration (framework + alpine-local hooks).
 */

import { getCanonicalSportSlug } from "../../../data/sportSubFocus/canonicalSportSlug";
import type { WorkoutBlock } from "../../../lib/types";
import type { Exercise, GenerateWorkoutInput } from "../types";
import {
  buildSportCoverageContext,
  collectBlocksExerciseIdsByType,
  computeSportPatternSlotScoreAdjustment,
  gatePoolForSportSlot,
  getSportPatternSlotRuleForBlockType,
  sportPatternScoreModeFromPoolMode,
  type SportPatternSlotScoreWeights,
} from "../sportPattern/framework";
import {
  addExerciseToAlpineSessionCounts,
  computeAlpineSkiingEmphasisBucket,
  computeAlpineSkiingWithinPoolQualityScore,
  isSignatureAlpineMovement,
} from "./alpineSkiingQualityScoring";
import {
  evaluateAlpineMinimumCoverage,
  alpineSportSelectionRules,
  ALPINE_DEPRIORITIZED_CATEGORIES,
  ALPINE_ECCENTRIC_CONTROL_CATEGORIES,
  ALPINE_LATERAL_STABILITY_CATEGORIES,
  ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES,
  ALPINE_MAIN_ECCENTRIC_OR_DECEL_CATEGORIES,
  ALPINE_QUALITY_LADDER_ANCHOR_CATEGORIES,
  ALPINE_QUALITY_LADDER_MIN_SCORE,
} from "./alpineSkiingRules";
import {
  exerciseMatchesAnyAlpineSkiingCategory,
  getAlpineSkiingPatternCategoriesForExercise,
  isExcludedFromAlpineMainWorkSlot,
} from "./alpineSkiingExerciseCategories";
import type { SportPatternSelectionTier, SportPatternSlotRule } from "../sportPattern/framework/types";
import type { AlpineSkiingSessionEnforcementSnapshot, AlpineSkiingTransferItemDebug } from "./alpineSkiingTypes";

export { buildSportCoverageContext, collectBlocksExerciseIdsByType };

export const ALPINE_SCORE_MATCH_GATE = 4.2;
export const ALPINE_SCORE_MATCH_PREFER = 2.4;
export const ALPINE_SCORE_DEPRIORITIZED = 3.8;

const ALPINE_SLOT_SCORE_WEIGHTS: SportPatternSlotScoreWeights = {
  matchGateFallback: ALPINE_SCORE_MATCH_GATE,
  matchPrefer: ALPINE_SCORE_MATCH_PREFER,
  deprioritized: ALPINE_SCORE_DEPRIORITIZED,
};

export function primarySportIsAlpineSkiing(input: GenerateWorkoutInput): boolean {
  const raw = input.sport_slugs?.[0];
  if (!raw) return false;
  return getCanonicalSportSlug(raw) === "alpine_skiing";
}

export function alpineSkiingPatternTransferApplies(input: GenerateWorkoutInput): boolean {
  if (!primarySportIsAlpineSkiing(input)) return false;
  const focus = (input.focus_body_parts ?? []).map((f) => f.toLowerCase().replace(/\s/g, "_"));
  if (focus.length === 0) return true;
  const allow = new Set([
    "full_body",
    "lower",
    "lower_body",
    "quad",
    "posterior",
    "core",
  ]);
  return focus.some((f) => allow.has(f));
}

export function getAlpineSkiingSlotRuleForBlockType(blockType: string): SportPatternSlotRule | undefined {
  return getSportPatternSlotRuleForBlockType(blockType, alpineSportSelectionRules.slots);
}

/** Tier 3 pool: anchor categories from rules or alpine within-pool quality floor (empty session context). */
export function filterAlpineQualityAlignedLadderPool(
  fullPool: Exercise[],
  blockType: string,
  _rule: SportPatternSlotRule
): Exercise[] {
  return fullPool.filter((ex) => alpineExercisePassesQualityLadderTier(ex, blockType));
}

function alpineExercisePassesQualityLadderTier(ex: Exercise, blockType: string): boolean {
  const cats = getAlpineSkiingPatternCategoriesForExercise(ex);
  if (cats.size === 0) return false;
  const dep = ALPINE_DEPRIORITIZED_CATEGORIES as readonly string[];
  if ([...cats].every((c) => dep.includes(c))) return false;
  const anchors = ALPINE_QUALITY_LADDER_ANCHOR_CATEGORIES as readonly string[];
  if ([...cats].some((c) => anchors.includes(c))) return true;
  const q = computeAlpineSkiingWithinPoolQualityScore(ex, {
    sessionAlpineCategoryCounts: new Map(),
    emphasisBucket: 0,
    blockType,
  });
  return q.total >= ALPINE_QUALITY_LADDER_MIN_SCORE;
}

export function gatePoolForAlpineSkiingSlot(
  fullPool: Exercise[],
  blockType: string,
  options?: { applyMainWorkExclusions?: boolean; requiredCount?: number }
): import("./types").HikingGateResult {
  const rule = getAlpineSkiingSlotRuleForBlockType(blockType);
  return gatePoolForSportSlot(fullPool, blockType, rule, options, {
    exerciseMatchesGate: (ex, gateCategories) =>
      exerciseMatchesAnyAlpineSkiingCategory(ex, gateCategories),
    refineGatedPoolForMainWork: ({ gated, rawCategoryMatches }) => {
      const withoutSkillNoise = gated.filter((e) => !isExcludedFromAlpineMainWorkSlot(e));
      return withoutSkillNoise.length > 0 ? withoutSkillNoise : rawCategoryMatches;
    },
    progressiveLadder: {
      exerciseMatchesPrefer: (ex, preferCategories) =>
        exerciseMatchesAnyAlpineSkiingCategory(ex, preferCategories),
      filterQualityAlignedPool: ({ fullPool, blockType: bt, rule: r }) =>
        filterAlpineQualityAlignedLadderPool(fullPool, bt, r),
    },
  });
}

export function isValidAlpineMainWorkExercise(ex: Exercise): boolean {
  const rule = getAlpineSkiingSlotRuleForBlockType("main_strength");
  if (!rule) return true;
  if (!exerciseMatchesAnyAlpineSkiingCategory(ex, rule.gateMatchAnyOf)) return false;
  if (isExcludedFromAlpineMainWorkSlot(ex)) return false;
  return true;
}

export function computeAlpineSkiingPatternScoreAdjustment(
  ex: Exercise,
  rule: SportPatternSlotRule,
  mode?: "gated" | "fallback"
): {
  delta: number;
  matchedGate: boolean;
  matchedPrefer: boolean;
  matchedDeprioritized: boolean;
} {
  return computeSportPatternSlotScoreAdjustment(
    ex,
    rule,
    mode,
    (e) => getAlpineSkiingPatternCategoriesForExercise(e) as Set<string>,
    ALPINE_SLOT_SCORE_WEIGHTS
  );
}

export function evaluateAlpineCoverageForBlocks(
  input: GenerateWorkoutInput,
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>
): ReturnType<typeof evaluateAlpineMinimumCoverage> {
  const ctx = buildSportCoverageContext(input, blocks);
  const byType = collectBlocksExerciseIdsByType(blocks);
  return evaluateAlpineMinimumCoverage(ctx, byType, exerciseById);
}

function poolModeForBlock(
  blockType: string,
  snap: AlpineSkiingSessionEnforcementSnapshot | undefined
): import("./types").HikingGateResult["poolMode"] | undefined {
  const bt = blockType.toLowerCase().replace(/\s/g, "_");
  if (bt === "main_strength" && snap?.main_strength) return snap.main_strength.poolMode;
  if (bt === "main_hypertrophy" && snap?.main_hypertrophy) return snap.main_hypertrophy.poolMode;
  if (bt === "accessory" && snap?.accessory) return snap.accessory.poolMode;
  return undefined;
}

function selectionTierForBlock(
  blockType: string,
  snap: AlpineSkiingSessionEnforcementSnapshot | undefined
): SportPatternSelectionTier | undefined {
  const bt = blockType.toLowerCase().replace(/\s/g, "_");
  if (bt === "main_strength" && snap?.main_strength) return snap.main_strength.selectionTier;
  if (bt === "main_hypertrophy" && snap?.main_hypertrophy) return snap.main_hypertrophy.selectionTier;
  if (bt === "accessory" && snap?.accessory) return snap.accessory.selectionTier;
  return undefined;
}

export function buildAlpineSkiingTransferDebug(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>,
  enforcementSnapshot?: AlpineSkiingSessionEnforcementSnapshot,
  options?: { sessionSeed?: number }
): AlpineSkiingTransferItemDebug[] {
  const out: AlpineSkiingTransferItemDebug[] = [];
  const emphasisBucket =
    options?.sessionSeed != null ? computeAlpineSkiingEmphasisBucket(options.sessionSeed) : 0;
  const runningCategoryCounts = new Map<string, number>();

  for (const b of blocks) {
    if (b.block_type === "warmup" || b.block_type === "cooldown") continue;
    const rule = getAlpineSkiingSlotRuleForBlockType(b.block_type);
    if (!rule) continue;
    const blockPoolMode = poolModeForBlock(b.block_type, enforcementSnapshot);
    const blockSelectionTier = selectionTierForBlock(b.block_type, enforcementSnapshot);
    const slotScoreMode = sportPatternScoreModeFromPoolMode(blockPoolMode) ?? "fallback";

    for (const it of b.items) {
      const ex = exerciseById.get(it.exercise_id);
      if (!ex) continue;
      const cats = [...getAlpineSkiingPatternCategoriesForExercise(ex)];
      const adj = computeAlpineSkiingPatternScoreAdjustment(ex, rule, slotScoreMode);
      let tier: AlpineSkiingTransferItemDebug["tier"] = "fallback";
      if (adj.matchedGate) tier = "required";
      else if (adj.matchedPrefer) tier = "preferred";
      const noteParts: string[] = [];
      noteParts.push(`slot_rule=${rule.slotRuleId}`);
      if (adj.matchedDeprioritized) noteParts.push("also_matches_deprioritized_pattern");

      const passedGate = exerciseMatchesAnyAlpineSkiingCategory(ex, rule.gateMatchAnyOf);
      const excludedMain = isExcludedFromAlpineMainWorkSlot(ex);
      const itemFallbackPool =
        (b.block_type === "main_strength" && enforcementSnapshot?.main_strength?.usedFullPoolFallback === true) ||
        (b.block_type === "main_hypertrophy" && enforcementSnapshot?.main_hypertrophy?.usedFullPoolFallback === true) ||
        (b.block_type === "accessory" && enforcementSnapshot?.accessory?.usedFullPoolFallback === true);

      const q = computeAlpineSkiingWithinPoolQualityScore(ex, {
        sessionAlpineCategoryCounts: new Map(runningCategoryCounts),
        emphasisBucket,
        blockType: b.block_type,
      });
      addExerciseToAlpineSessionCounts(ex, runningCategoryCounts);

      out.push({
        exercise_id: ex.id,
        block_type: b.block_type,
        categories_matched: cats,
        slot_rule_id: rule.slotRuleId,
        tier,
        note: noteParts.join("; "),
        enforcement: {
          main_work_pool_mode: blockPoolMode,
          sport_pattern_selection_tier: blockSelectionTier,
          passed_alpine_gate_categories: passedGate,
          excluded_from_alpine_main_work: excludedMain,
          item_used_full_pool_fallback_session: itemFallbackPool,
        },
        within_pool_quality: {
          signature_alpine_movement: isSignatureAlpineMovement(ex),
          signature_category_bonus: q.signature_bonus,
          emphasis_rotation_bonus: q.emphasis_bonus,
          simplicity_transfer_bonus: q.simplicity_transfer_bonus,
          redundancy_penalty: q.redundancy_penalty,
          near_duplicate_penalty: q.near_duplicate_penalty,
          sagittal_only_penalty: q.sagittal_only_penalty,
          locomotion_identity_penalty: q.locomotion_identity_penalty,
          within_pool_priority_total: q.total,
          emphasis_bucket: emphasisBucket,
        },
      });
    }
  }
  return out;
}

export function findBestAlpineSkiingReplacement(
  pool: Exercise[],
  categories: readonly string[],
  excludeIds: Set<string>
): Exercise | undefined {
  const candidates = pool.filter(
    (e) => !excludeIds.has(e.id) && exerciseMatchesAnyAlpineSkiingCategory(e, categories)
  );
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => {
    const ca = getAlpineSkiingPatternCategoriesForExercise(a);
    const cb = getAlpineSkiingPatternCategoriesForExercise(b);
    const score = (s: Set<string>) => categories.filter((c) => s.has(c)).length;
    return score(cb) - score(ca);
  });
  return candidates[0];
}

function pickWeakestAlpineMainForReplacement(lifts: Exercise[], blockType: string): Exercise {
  let weakest = lifts[0]!;
  let weakestScore = Infinity;
  for (const m of lifts) {
    const q = computeAlpineSkiingWithinPoolQualityScore(m, {
      sessionAlpineCategoryCounts: new Map(),
      emphasisBucket: 0,
      blockType,
    });
    if (q.total < weakestScore) {
      weakestScore = q.total;
      weakest = m;
    }
  }
  return weakest;
}

/**
 * Pre-assembly main coverage for alpine: eccentric/decel anchor, eccentric-control family, lower-body tension/endurance.
 * Mutates `mainLifts`. Reuse the same category sets as `tryRepairAlpineSkiingSession` so coverage is satisfied during build when possible.
 */
export function applyAlpineUpstreamMainLiftsCoverage(
  mainLifts: Exercise[],
  replacementCatalog: Exercise[],
  blockType: "main_strength" | "main_hypertrophy"
): boolean {
  if (mainLifts.length === 0) return false;
  let changed = false;
  const gatedMain = gatePoolForAlpineSkiingSlot(replacementCatalog, blockType, {
    applyMainWorkExclusions: true,
  }).poolForSelection;

  if (!mainLifts.some((m) => exerciseMatchesAnyAlpineSkiingCategory(m, [...ALPINE_MAIN_ECCENTRIC_OR_DECEL_CATEGORIES]))) {
    const weakest = pickWeakestAlpineMainForReplacement(mainLifts, blockType);
    const repl = findBestAlpineSkiingReplacement(
      gatedMain,
      [...ALPINE_MAIN_ECCENTRIC_OR_DECEL_CATEGORIES],
      new Set(mainLifts.map((m) => m.id).filter((id) => id !== weakest.id))
    );
    if (repl) {
      const idx = mainLifts.indexOf(weakest);
      if (idx >= 0) mainLifts[idx] = repl;
      changed = true;
    }
  }

  if (!mainLifts.some((m) => exerciseMatchesAnyAlpineSkiingCategory(m, [...ALPINE_ECCENTRIC_CONTROL_CATEGORIES]))) {
    for (let i = 0; i < mainLifts.length; i++) {
      const m = mainLifts[i];
      if (exerciseMatchesAnyAlpineSkiingCategory(m, [...ALPINE_ECCENTRIC_CONTROL_CATEGORIES])) continue;
      const repl = findBestAlpineSkiingReplacement(
        replacementCatalog,
        [...ALPINE_ECCENTRIC_CONTROL_CATEGORIES],
        new Set(mainLifts.map((x) => x.id).filter((id) => id !== m.id))
      );
      if (repl) {
        mainLifts[i] = repl;
        changed = true;
        break;
      }
    }
  }

  if (!mainLifts.some((m) => exerciseMatchesAnyAlpineSkiingCategory(m, [...ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES]))) {
    for (let i = 0; i < mainLifts.length; i++) {
      const m = mainLifts[i];
      if (exerciseMatchesAnyAlpineSkiingCategory(m, [...ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES])) continue;
      const repl = findBestAlpineSkiingReplacement(
        replacementCatalog,
        [...ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES],
        new Set(mainLifts.map((x) => x.id).filter((id) => id !== m.id))
      );
      if (repl) {
        mainLifts[i] = repl;
        changed = true;
        break;
      }
    }
  }

  return changed;
}

function cumulativeMainAndAccessoryPairs(mainLifts: Exercise[], pairRows: Exercise[][]): Exercise[] {
  return [...mainLifts, ...pairRows.flatMap((p) => [...p])];
}

/**
 * Before accessory (or hypertrophy volume) blocks are serialized: satisfy lateral/trunk and lower-body tension
 * via the worst-scoring slot. Mutates `pairRows` in place (each row is one superset round or a singleton).
 */
export function applyAlpineUpstreamAccessoryPairsCoverage(
  mainLifts: Exercise[],
  pairRows: Exercise[][],
  replacementCatalog: Exercise[],
  pairRowBlockType: "accessory" | "main_hypertrophy" = "accessory"
): boolean {
  if (pairRows.length === 0) return false;
  let changed = false;

  const replaceWorstPairSlot = (categories: readonly string[]): boolean => {
    const slots: { ex: Exercise; pi: number; ei: number; q: number }[] = [];
    for (let pi = 0; pi < pairRows.length; pi++) {
      const row = pairRows[pi];
      for (let ei = 0; ei < row.length; ei++) {
        const ex = row[ei];
        const q = computeAlpineSkiingWithinPoolQualityScore(ex, {
          sessionAlpineCategoryCounts: new Map(),
          emphasisBucket: 0,
          blockType: pairRowBlockType,
        }).total;
        slots.push({ ex, pi, ei, q });
      }
    }
    if (slots.length === 0) return false;
    slots.sort((a, b) => a.q - b.q);
    const usedAll = new Set(cumulativeMainAndAccessoryPairs(mainLifts, pairRows).map((e) => e.id));
    for (const slot of slots) {
      const exclude = new Set(usedAll);
      exclude.delete(slot.ex.id);
      const repl = findBestAlpineSkiingReplacement(replacementCatalog, categories, exclude);
      if (repl) {
        const row = [...pairRows[slot.pi]];
        row[slot.ei] = repl;
        pairRows[slot.pi] = row;
        return true;
      }
    }
    return false;
  };

  const lateralOk = () =>
    cumulativeMainAndAccessoryPairs(mainLifts, pairRows).some((e) =>
      exerciseMatchesAnyAlpineSkiingCategory(e, [...ALPINE_LATERAL_STABILITY_CATEGORIES])
    );
  const tensionOk = () =>
    cumulativeMainAndAccessoryPairs(mainLifts, pairRows).some((e) =>
      exerciseMatchesAnyAlpineSkiingCategory(e, [...ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES])
    );

  if (!lateralOk() && replaceWorstPairSlot([...ALPINE_LATERAL_STABILITY_CATEGORIES])) changed = true;
  if (!tensionOk() && replaceWorstPairSlot([...ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES])) changed = true;
  return changed;
}

export function findBestAlpineMainWorkReplacement(pool: Exercise[], excludeIds: Set<string>): Exercise | undefined {
  const rule = getAlpineSkiingSlotRuleForBlockType("main_strength");
  if (!rule) return undefined;
  const strict = pool.filter(
    (e) =>
      !excludeIds.has(e.id) &&
      exerciseMatchesAnyAlpineSkiingCategory(e, rule.gateMatchAnyOf) &&
      !isExcludedFromAlpineMainWorkSlot(e)
  );
  const pick = (candidates: Exercise[]) => {
    if (candidates.length === 0) return undefined;
    candidates.sort((a, b) => {
      const ca = getAlpineSkiingPatternCategoriesForExercise(a);
      const cb = getAlpineSkiingPatternCategoriesForExercise(b);
      const score = (s: Set<string>) => rule.gateMatchAnyOf.filter((c) => s.has(c)).length;
      return score(cb) - score(ca);
    });
    return candidates[0];
  };
  const bestStrict = pick(strict);
  if (bestStrict) return bestStrict;
  const loose = pool.filter(
    (e) => !excludeIds.has(e.id) && exerciseMatchesAnyAlpineSkiingCategory(e, rule.gateMatchAnyOf)
  );
  return pick(loose);
}
