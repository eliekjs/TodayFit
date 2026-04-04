/**
 * Soccer field-sport session: gating, scoring hooks, coverage, repair debug.
 */

import { getCanonicalSportSlug } from "../../../../data/sportSubFocus/canonicalSportSlug";
import type { WorkoutBlock } from "../../../../lib/types";
import type { Exercise, GenerateWorkoutInput } from "../../types";
import {
  gatePoolForSportSlot,
  computeSportPatternSlotScoreAdjustment,
  getSportPatternSlotRuleForBlockType,
} from "../../sportPattern/framework";
import type { SportPatternSlotRule } from "../../sportPattern/framework/types";
import { buildSportCoverageContext, collectBlocksExerciseIdsByType } from "../../sportPattern/framework";
import type { HikingGateResult } from "../types";
import type { TrailRunningSessionEnforcementSnapshot, TrailRunningTransferItemDebug } from "../trailRunningTypes";
import {
  exerciseMatchesAnySoccerCategory,
  getSoccerPatternCategoriesForExercise,
  isExcludedFromSoccerMainWorkSlot,
  isSoccerConditioningExercise,
} from "./soccerExerciseCategories";
import {
  addExerciseToSoccerSessionCounts,
  computeSoccerEmphasisBucket,
  computeSoccerWithinPoolQualityScore,
  isSignatureSoccerMovement,
} from "./soccerQualityScoring";
import { evaluateSoccerMinimumCoverage, soccerSportSelectionRules } from "./soccerRules";

export const SOCCER_SCORE_MATCH_GATE = 4.25;
export const SOCCER_SCORE_MATCH_PREFER = 2.5;
export const SOCCER_SCORE_DEPRIORITIZED = 3.9;

const SOCCER_WEIGHTS = {
  matchGateFallback: SOCCER_SCORE_MATCH_GATE,
  matchPrefer: SOCCER_SCORE_MATCH_PREFER,
  deprioritized: SOCCER_SCORE_DEPRIORITIZED,
};

export function primarySportIsSoccer(input: GenerateWorkoutInput): boolean {
  const raw = input.sport_slugs?.[0];
  if (!raw) return false;
  return getCanonicalSportSlug(raw) === "soccer";
}

/** Lower / full body / core / quad / posterior focus days (sport-prep shaped). */
export function soccerPatternTransferApplies(input: GenerateWorkoutInput): boolean {
  if (!primarySportIsSoccer(input)) return false;
  const focus = (input.focus_body_parts ?? []).map((f) => f.toLowerCase().replace(/\s/g, "_"));
  if (focus.length === 0) return true;
  const allow = new Set(["full_body", "lower", "lower_body", "quad", "posterior", "core"]);
  return focus.some((f) => allow.has(f));
}

export function getSoccerSlotRuleForBlockType(blockType: string): SportPatternSlotRule | undefined {
  return getSportPatternSlotRuleForBlockType(blockType, soccerSportSelectionRules.slots);
}

export function gatePoolForSoccerSlot(
  fullPool: Exercise[],
  blockType: string,
  options?: { applyMainWorkExclusions?: boolean; requiredCount?: number }
): HikingGateResult {
  const rule = getSoccerSlotRuleForBlockType(blockType);
  return gatePoolForSportSlot(fullPool, blockType, rule, options, {
    exerciseMatchesGate: (ex, gateCategories) => exerciseMatchesAnySoccerCategory(ex, gateCategories),
    refineGatedPoolForMainWork: ({ gated, rawCategoryMatches }) => {
      const refined = gated.filter((e) => !isExcludedFromSoccerMainWorkSlot(e));
      return refined.length > 0 ? refined : rawCategoryMatches;
    },
  });
}

export function isValidSoccerMainWorkExercise(ex: Exercise): boolean {
  const rule = getSoccerSlotRuleForBlockType("main_strength");
  if (!rule) return true;
  if (!exerciseMatchesAnySoccerCategory(ex, rule.gateMatchAnyOf)) return false;
  if (isExcludedFromSoccerMainWorkSlot(ex)) return false;
  return true;
}

export function computeSoccerPatternScoreAdjustment(
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
    (e) => getSoccerPatternCategoriesForExercise(e) as Set<string>,
    SOCCER_WEIGHTS
  );
}

export function evaluateSoccerCoverageForBlocks(
  input: GenerateWorkoutInput,
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>
): ReturnType<typeof evaluateSoccerMinimumCoverage> {
  const ctx = buildSportCoverageContext(input, blocks);
  const byType = collectBlocksExerciseIdsByType(blocks);
  return evaluateSoccerMinimumCoverage(ctx, byType, exerciseById);
}

function poolModeForBlock(
  blockType: string,
  snap: TrailRunningSessionEnforcementSnapshot | undefined
): import("../types").HikingGateResult["poolMode"] | undefined {
  const bt = blockType.toLowerCase().replace(/\s/g, "_");
  if (bt === "main_strength" && snap?.main_strength) return snap.main_strength.poolMode;
  if (bt === "main_hypertrophy" && snap?.main_hypertrophy) return snap.main_hypertrophy.poolMode;
  if (bt === "accessory" && snap?.accessory) return snap.accessory.poolMode;
  return undefined;
}

export function buildSoccerTransferDebug(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>,
  enforcementSnapshot?: TrailRunningSessionEnforcementSnapshot,
  options?: { sessionSeed?: number }
): TrailRunningTransferItemDebug[] {
  const out: TrailRunningTransferItemDebug[] = [];
  const emphasisBucket = options?.sessionSeed != null ? computeSoccerEmphasisBucket(options.sessionSeed) : 0;
  const counts = new Map<string, number>();

  for (const b of blocks) {
    if (b.block_type === "warmup" || b.block_type === "cooldown") continue;
    const rule = getSoccerSlotRuleForBlockType(b.block_type);
    if (!rule) continue;
    const blockPoolMode = poolModeForBlock(b.block_type, enforcementSnapshot);

    for (const it of b.items) {
      const ex = exerciseById.get(it.exercise_id);
      if (!ex) continue;
      const cats = [...getSoccerPatternCategoriesForExercise(ex)];
      const adj = computeSoccerPatternScoreAdjustment(ex, rule, "gated");
      let tier: TrailRunningTransferItemDebug["tier"] = "fallback";
      if (adj.matchedGate) tier = "required";
      else if (adj.matchedPrefer) tier = "preferred";
      const noteParts: string[] = [`slot_rule=${rule.slotRuleId}`];
      if (adj.matchedDeprioritized) noteParts.push("also_matches_deprioritized_pattern");

      const passedGate = exerciseMatchesAnySoccerCategory(ex, rule.gateMatchAnyOf);
      const excludedMain = isExcludedFromSoccerMainWorkSlot(ex);
      const itemFallbackPool =
        (b.block_type === "main_strength" && enforcementSnapshot?.main_strength?.usedFullPoolFallback === true) ||
        (b.block_type === "main_hypertrophy" && enforcementSnapshot?.main_hypertrophy?.usedFullPoolFallback === true) ||
        (b.block_type === "accessory" && enforcementSnapshot?.accessory?.usedFullPoolFallback === true);

      const q = computeSoccerWithinPoolQualityScore(ex, {
        sessionSoccerCategoryCounts: new Map(counts),
        emphasisBucket,
        blockType: b.block_type,
      });
      addExerciseToSoccerSessionCounts(ex, counts);

      out.push({
        exercise_id: ex.id,
        block_type: b.block_type,
        categories_matched: cats as unknown as import("../trailRunningTypes").TrailRunningPatternCategory[],
        slot_rule_id: rule.slotRuleId,
        tier,
        note: noteParts.join("; "),
        enforcement: {
          main_work_pool_mode: blockPoolMode,
          passed_trail_gate_categories: passedGate,
          excluded_from_trail_main_work: excludedMain,
          item_used_full_pool_fallback_session: itemFallbackPool,
        },
        within_pool_quality: {
          signature_trail_movement: isSignatureSoccerMovement(ex),
          signature_category_bonus: q.signature_bonus,
          emphasis_rotation_bonus: q.emphasis_bonus,
          simplicity_transfer_bonus: 0,
          redundancy_penalty: q.redundancy_penalty,
          near_duplicate_penalty: 0,
          carry_step_penalty: 0,
          bilateral_squat_only_penalty: 0,
          within_pool_priority_total: q.total,
          emphasis_bucket: emphasisBucket,
        },
      });
    }
  }
  return out;
}

export function findBestSoccerReplacement(
  pool: Exercise[],
  categories: readonly string[],
  excludeIds: Set<string>
): Exercise | undefined {
  const candidates = pool.filter(
    (e) => !excludeIds.has(e.id) && exerciseMatchesAnySoccerCategory(e, categories)
  );
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => {
    const score = (ex: Exercise) => categories.filter((c) => getSoccerPatternCategoriesForExercise(ex).has(c as any)).length;
    return score(b) - score(a);
  });
  return candidates[0];
}

export function findBestSoccerMainWorkReplacement(pool: Exercise[], excludeIds: Set<string>): Exercise | undefined {
  const rule = getSoccerSlotRuleForBlockType("main_strength");
  if (!rule) return undefined;
  const strict = pool.filter(
    (e) =>
      !excludeIds.has(e.id) &&
      exerciseMatchesAnySoccerCategory(e, rule.gateMatchAnyOf) &&
      !isExcludedFromSoccerMainWorkSlot(e)
  );
  const pick = (candidates: Exercise[]) => {
    if (candidates.length === 0) return undefined;
    candidates.sort((a, b) => {
      const sa = rule.gateMatchAnyOf.filter((c) => getSoccerPatternCategoriesForExercise(a).has(c as any)).length;
      const sb = rule.gateMatchAnyOf.filter((c) => getSoccerPatternCategoriesForExercise(b).has(c as any)).length;
      return sb - sa;
    });
    return candidates[0];
  };
  return pick(strict) ?? pick(pool.filter((e) => !excludeIds.has(e.id) && exerciseMatchesAnySoccerCategory(e, rule.gateMatchAnyOf)));
}

export {
  addExerciseToSoccerSessionCounts,
  computeSoccerEmphasisBucket,
  computeSoccerWithinPoolQualityScore,
  isSoccerConditioningExercise,
};
