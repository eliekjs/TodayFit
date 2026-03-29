/**
 * Hiking/backpacking sport-pattern integration.
 *
 * **Framework (generic):** `../sportPattern/framework` — gating contract, slot score delta, coverage context.
 * **Hiking-local:** categories (`hikingExerciseCategories`), rules bundle (`hikingBackpackingRules`),
 * exclusions, within-pool quality (`hikingQualityScoring`), conditioning allowlist, debug labels.
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
  type SportPatternSlotScoreWeights,
} from "../sportPattern/framework";
import { evaluateHikingMinimumCoverage, sportSelectionRules } from "./hikingBackpackingRules";
import {
  exerciseMatchesAnyHikingCategory,
  getHikingPatternCategoriesForExercise,
  isExcludedFromHikingMainWorkSlot,
} from "./hikingExerciseCategories";
import {
  addExerciseToHikingSessionCounts,
  computeHikingEmphasisBucket,
  computeHikingWithinPoolQualityScore,
  isSignatureHikingMovement,
} from "./hikingQualityScoring";
import type {
  HikingGateResult,
  HikingPatternCategory,
  HikingSessionEnforcementSnapshot,
  HikingTransferItemDebug,
  SportPatternSlotRule,
} from "./types";

export { buildSportCoverageContext, collectBlocksExerciseIdsByType } from "../sportPattern/framework";

export const HIKING_SCORE_MATCH_GATE = 4.2;
export const HIKING_SCORE_MATCH_PREFER = 2.4;
export const HIKING_SCORE_DEPRIORITIZED = 3.8;

const HIKING_SLOT_SCORE_WEIGHTS: SportPatternSlotScoreWeights = {
  matchGateFallback: HIKING_SCORE_MATCH_GATE,
  matchPrefer: HIKING_SCORE_MATCH_PREFER,
  deprioritized: HIKING_SCORE_DEPRIORITIZED,
};

export function primarySportIsHikingBackpacking(input: GenerateWorkoutInput): boolean {
  const raw = input.sport_slugs?.[0];
  if (!raw) return false;
  return getCanonicalSportSlug(raw) === "hiking_backpacking";
}

/** Hiking pattern algorithm applies (lower / full / unspecified focus; skip upper-only days). */
export function hikingPatternTransferApplies(input: GenerateWorkoutInput): boolean {
  if (!primarySportIsHikingBackpacking(input)) return false;
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

/** Hiking slot rules: resolved from `sportSelectionRules.slots` in `hikingBackpackingRules.ts`. */
export function getHikingSlotRuleForBlockType(blockType: string): SportPatternSlotRule | undefined {
  return getSportPatternSlotRuleForBlockType(blockType, sportSelectionRules.slots);
}

/**
 * Gate hiking slot categories (framework: `gatePoolForSportSlot` + hiking match/refine hooks).
 * If **any** exercises match the gate, `poolForSelection` is **only** those matches.
 * Full-pool fallback **only** when `matchCount === 0`.
 */
export function gatePoolForHikingSlot(
  fullPool: Exercise[],
  blockType: string,
  options?: { applyMainWorkExclusions?: boolean; requiredCount?: number }
): HikingGateResult {
  const rule = getHikingSlotRuleForBlockType(blockType);
  return gatePoolForSportSlot(fullPool, blockType, rule, options, {
    exerciseMatchesGate: (ex, gateCategories) =>
      exerciseMatchesAnyHikingCategory(ex, gateCategories as readonly HikingPatternCategory[]),
    refineGatedPoolForMainWork: ({ gated, rawCategoryMatches }) => {
      const withoutSkillNoise = gated.filter((e) => !isExcludedFromHikingMainWorkSlot(e));
      return withoutSkillNoise.length > 0 ? withoutSkillNoise : rawCategoryMatches;
    },
  });
}

/** True when exercise satisfies main-strength hiking gate and is not excluded (e.g. clean+lunge skill combos). */
export function isValidHikingMainWorkExercise(ex: Exercise): boolean {
  const rule = getHikingSlotRuleForBlockType("main_strength");
  if (!rule) return true;
  if (!exerciseMatchesAnyHikingCategory(ex, rule.gateMatchAnyOf)) return false;
  if (isExcludedFromHikingMainWorkSlot(ex)) return false;
  return true;
}

/** Hiking slot scoring deltas; uses generic `computeSportPatternSlotScoreAdjustment` + hiking weights. */
export function computeHikingPatternScoreAdjustment(
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
    (e) => getHikingPatternCategoriesForExercise(e) as Set<string>,
    HIKING_SLOT_SCORE_WEIGHTS
  );
}

export function evaluateHikingCoverageForBlocks(
  input: GenerateWorkoutInput,
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>
): ReturnType<typeof evaluateHikingMinimumCoverage> {
  const ctx = buildSportCoverageContext(input, blocks);
  const byType = collectBlocksExerciseIdsByType(blocks);
  return evaluateHikingMinimumCoverage(ctx, byType, exerciseById);
}

function poolModeForBlock(
  blockType: string,
  snap: HikingSessionEnforcementSnapshot | undefined
): HikingGateResult["poolMode"] | undefined {
  const bt = blockType.toLowerCase().replace(/\s/g, "_");
  if (bt === "main_strength" && snap?.main_strength) return snap.main_strength.poolMode;
  if (bt === "main_hypertrophy" && snap?.main_hypertrophy) return snap.main_hypertrophy.poolMode;
  if (bt === "accessory" && snap?.accessory) return snap.accessory.poolMode;
  if (bt === "conditioning") return undefined;
  return undefined;
}

export function buildHikingTransferDebug(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>,
  enforcementSnapshot?: HikingSessionEnforcementSnapshot,
  options?: { sessionSeed?: number }
): HikingTransferItemDebug[] {
  const out: HikingTransferItemDebug[] = [];
  const emphasisBucket =
    options?.sessionSeed != null ? computeHikingEmphasisBucket(options.sessionSeed) : 0;
  const runningCategoryCounts = new Map<string, number>();

  for (const b of blocks) {
    if (b.block_type === "warmup" || b.block_type === "cooldown") continue;
    const rule = getHikingSlotRuleForBlockType(b.block_type);
    if (!rule) continue;
    const blockPoolMode = poolModeForBlock(b.block_type, enforcementSnapshot);

    for (const it of b.items) {
      const ex = exerciseById.get(it.exercise_id);
      if (!ex) continue;
      const cats = [...getHikingPatternCategoriesForExercise(ex)];
      const adj = computeHikingPatternScoreAdjustment(ex, rule, "gated");
      let tier: HikingTransferItemDebug["tier"] = "fallback";
      if (adj.matchedGate) tier = "required";
      else if (adj.matchedPrefer) tier = "preferred";
      const noteParts: string[] = [];
      noteParts.push(`slot_rule=${rule.slotRuleId}`);
      if (adj.matchedDeprioritized) noteParts.push("also_matches_deprioritized_pattern");

      const passedGate = exerciseMatchesAnyHikingCategory(ex, rule.gateMatchAnyOf);
      const excludedMain = isExcludedFromHikingMainWorkSlot(ex);
      const itemFallbackPool =
        (b.block_type === "main_strength" && enforcementSnapshot?.main_strength?.usedFullPoolFallback === true) ||
        (b.block_type === "main_hypertrophy" && enforcementSnapshot?.main_hypertrophy?.usedFullPoolFallback === true) ||
        (b.block_type === "accessory" && enforcementSnapshot?.accessory?.usedFullPoolFallback === true);

      const q = computeHikingWithinPoolQualityScore(ex, {
        sessionHikingCategoryCounts: new Map(runningCategoryCounts),
        emphasisBucket,
        blockType: b.block_type,
      });
      addExerciseToHikingSessionCounts(ex, runningCategoryCounts);

      out.push({
        exercise_id: ex.id,
        block_type: b.block_type,
        categories_matched: cats,
        slot_rule_id: rule.slotRuleId,
        tier,
        note: noteParts.join("; "),
        enforcement: {
          main_work_pool_mode: blockPoolMode,
          passed_hiking_gate_categories: passedGate,
          excluded_from_hiking_main_work: excludedMain,
          item_used_full_pool_fallback_session: itemFallbackPool,
        },
        within_pool_quality: {
          signature_hiking_movement: isSignatureHikingMovement(ex),
          signature_category_bonus: q.signature_bonus,
          emphasis_rotation_bonus: q.emphasis_bonus,
          simplicity_transfer_bonus: q.simplicity_transfer_bonus,
          redundancy_penalty: q.redundancy_penalty,
          near_duplicate_penalty: q.near_duplicate_penalty,
          within_pool_priority_total: q.total,
          emphasis_bucket: emphasisBucket,
        },
      });
    }
  }
  return out;
}

export function findBestHikingReplacement(
  pool: Exercise[],
  categories: readonly HikingPatternCategory[],
  excludeIds: Set<string>
): Exercise | undefined {
  const candidates = pool.filter((e) => !excludeIds.has(e.id) && exerciseMatchesAnyHikingCategory(e, categories));
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => {
    const ca = getHikingPatternCategoriesForExercise(a);
    const cb = getHikingPatternCategoriesForExercise(b);
    const score = (s: Set<string>) => categories.filter((c) => s.has(c)).length;
    return score(cb) - score(a);
  });
  return candidates[0];
}

/** Prefer gate-valid + non-excluded main work; if none, any gate match (last resort). */
export function findBestHikingMainWorkReplacement(pool: Exercise[], excludeIds: Set<string>): Exercise | undefined {
  const rule = getHikingSlotRuleForBlockType("main_strength");
  if (!rule) return undefined;
  const strict = pool.filter(
    (e) =>
      !excludeIds.has(e.id) &&
      exerciseMatchesAnyHikingCategory(e, rule.gateMatchAnyOf) &&
      !isExcludedFromHikingMainWorkSlot(e)
  );
  const pick = (candidates: Exercise[]) => {
    if (candidates.length === 0) return undefined;
    candidates.sort((a, b) => {
      const ca = getHikingPatternCategoriesForExercise(a);
      const cb = getHikingPatternCategoriesForExercise(b);
      const score = (s: Set<string>) =>
        rule.gateMatchAnyOf.filter((c) => s.has(c as HikingPatternCategory)).length;
      return score(cb) - score(ca);
    });
    return candidates[0];
  };
  const bestStrict = pick(strict);
  if (bestStrict) return bestStrict;
  const loose = pool.filter(
    (e) => !excludeIds.has(e.id) && exerciseMatchesAnyHikingCategory(e, rule.gateMatchAnyOf)
  );
  return pick(loose);
}
