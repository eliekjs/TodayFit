/**
 * Trail-running sport-pattern integration (framework + trail-local hooks).
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
import {
  addExerciseToTrailRunningSessionCounts,
  computeTrailRunningEmphasisBucket,
  computeTrailRunningWithinPoolQualityScore,
  isSignatureTrailMovement,
} from "./trailRunningQualityScoring";
import {
  evaluateTrailMinimumCoverage,
  trailSportSelectionRules,
} from "./trailRunningRules";
import {
  exerciseMatchesAnyTrailRunningCategory,
  getTrailRunningPatternCategoriesForExercise,
  isExcludedFromTrailMainWorkSlot,
} from "./trailRunningExerciseCategories";
import type { SportPatternSlotRule } from "../sportPattern/framework/types";
import type { TrailRunningSessionEnforcementSnapshot, TrailRunningTransferItemDebug } from "./trailRunningTypes";

export { buildSportCoverageContext, collectBlocksExerciseIdsByType };

export const TRAIL_SCORE_MATCH_GATE = 4.2;
export const TRAIL_SCORE_MATCH_PREFER = 2.4;
export const TRAIL_SCORE_DEPRIORITIZED = 3.8;

const TRAIL_SLOT_SCORE_WEIGHTS: SportPatternSlotScoreWeights = {
  matchGateFallback: TRAIL_SCORE_MATCH_GATE,
  matchPrefer: TRAIL_SCORE_MATCH_PREFER,
  deprioritized: TRAIL_SCORE_DEPRIORITIZED,
};

export function primarySportIsTrailRunning(input: GenerateWorkoutInput): boolean {
  const raw = input.sport_slugs?.[0];
  if (!raw) return false;
  return getCanonicalSportSlug(raw) === "trail_running";
}

/** Same focus-day eligibility as hiking: lower / full body / core — not upper-only prep days. */
export function trailRunningPatternTransferApplies(input: GenerateWorkoutInput): boolean {
  if (!primarySportIsTrailRunning(input)) return false;
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

export function getTrailRunningSlotRuleForBlockType(blockType: string): SportPatternSlotRule | undefined {
  return getSportPatternSlotRuleForBlockType(blockType, trailSportSelectionRules.slots);
}

export function gatePoolForTrailRunningSlot(
  fullPool: Exercise[],
  blockType: string,
  options?: { applyMainWorkExclusions?: boolean; requiredCount?: number }
): import("./types").HikingGateResult {
  const rule = getTrailRunningSlotRuleForBlockType(blockType);
  return gatePoolForSportSlot(fullPool, blockType, rule, options, {
    exerciseMatchesGate: (ex, gateCategories) =>
      exerciseMatchesAnyTrailRunningCategory(ex, gateCategories),
    refineGatedPoolForMainWork: ({ gated, rawCategoryMatches }) => {
      const withoutSkillNoise = gated.filter((e) => !isExcludedFromTrailMainWorkSlot(e));
      return withoutSkillNoise.length > 0 ? withoutSkillNoise : rawCategoryMatches;
    },
  });
}

export function isValidTrailMainWorkExercise(ex: Exercise): boolean {
  const rule = getTrailRunningSlotRuleForBlockType("main_strength");
  if (!rule) return true;
  if (!exerciseMatchesAnyTrailRunningCategory(ex, rule.gateMatchAnyOf)) return false;
  if (isExcludedFromTrailMainWorkSlot(ex)) return false;
  return true;
}

export function computeTrailRunningPatternScoreAdjustment(
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
    (e) => getTrailRunningPatternCategoriesForExercise(e) as Set<string>,
    TRAIL_SLOT_SCORE_WEIGHTS
  );
}

export function evaluateTrailCoverageForBlocks(
  input: GenerateWorkoutInput,
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>
): ReturnType<typeof evaluateTrailMinimumCoverage> {
  const ctx = buildSportCoverageContext(input, blocks);
  const byType = collectBlocksExerciseIdsByType(blocks);
  return evaluateTrailMinimumCoverage(ctx, byType, exerciseById);
}

function poolModeForBlock(
  blockType: string,
  snap: TrailRunningSessionEnforcementSnapshot | undefined
): import("./types").HikingGateResult["poolMode"] | undefined {
  const bt = blockType.toLowerCase().replace(/\s/g, "_");
  if (bt === "main_strength" && snap?.main_strength) return snap.main_strength.poolMode;
  if (bt === "main_hypertrophy" && snap?.main_hypertrophy) return snap.main_hypertrophy.poolMode;
  if (bt === "accessory" && snap?.accessory) return snap.accessory.poolMode;
  return undefined;
}

export function buildTrailRunningTransferDebug(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>,
  enforcementSnapshot?: TrailRunningSessionEnforcementSnapshot,
  options?: { sessionSeed?: number }
): TrailRunningTransferItemDebug[] {
  const out: TrailRunningTransferItemDebug[] = [];
  const emphasisBucket =
    options?.sessionSeed != null ? computeTrailRunningEmphasisBucket(options.sessionSeed) : 0;
  const runningCategoryCounts = new Map<string, number>();

  for (const b of blocks) {
    if (b.block_type === "warmup" || b.block_type === "cooldown") continue;
    const rule = getTrailRunningSlotRuleForBlockType(b.block_type);
    if (!rule) continue;
    const blockPoolMode = poolModeForBlock(b.block_type, enforcementSnapshot);

    for (const it of b.items) {
      const ex = exerciseById.get(it.exercise_id);
      if (!ex) continue;
      const cats = [...getTrailRunningPatternCategoriesForExercise(ex)];
      const adj = computeTrailRunningPatternScoreAdjustment(ex, rule, "gated");
      let tier: TrailRunningTransferItemDebug["tier"] = "fallback";
      if (adj.matchedGate) tier = "required";
      else if (adj.matchedPrefer) tier = "preferred";
      const noteParts: string[] = [];
      noteParts.push(`slot_rule=${rule.slotRuleId}`);
      if (adj.matchedDeprioritized) noteParts.push("also_matches_deprioritized_pattern");

      const passedGate = exerciseMatchesAnyTrailRunningCategory(ex, rule.gateMatchAnyOf);
      const excludedMain = isExcludedFromTrailMainWorkSlot(ex);
      const itemFallbackPool =
        (b.block_type === "main_strength" && enforcementSnapshot?.main_strength?.usedFullPoolFallback === true) ||
        (b.block_type === "main_hypertrophy" && enforcementSnapshot?.main_hypertrophy?.usedFullPoolFallback === true) ||
        (b.block_type === "accessory" && enforcementSnapshot?.accessory?.usedFullPoolFallback === true);

      const q = computeTrailRunningWithinPoolQualityScore(ex, {
        sessionTrailCategoryCounts: new Map(runningCategoryCounts),
        emphasisBucket,
        blockType: b.block_type,
      });
      addExerciseToTrailRunningSessionCounts(ex, runningCategoryCounts);

      out.push({
        exercise_id: ex.id,
        block_type: b.block_type,
        categories_matched: cats,
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
          signature_trail_movement: isSignatureTrailMovement(ex),
          signature_category_bonus: q.signature_bonus,
          emphasis_rotation_bonus: q.emphasis_bonus,
          simplicity_transfer_bonus: q.simplicity_transfer_bonus,
          redundancy_penalty: q.redundancy_penalty,
          near_duplicate_penalty: q.near_duplicate_penalty,
          carry_step_penalty: q.carry_step_penalty,
          bilateral_squat_only_penalty: q.bilateral_squat_only_penalty,
          within_pool_priority_total: q.total,
          emphasis_bucket: emphasisBucket,
        },
      });
    }
  }
  return out;
}

export function findBestTrailRunningReplacement(
  pool: Exercise[],
  categories: readonly string[],
  excludeIds: Set<string>
): Exercise | undefined {
  const candidates = pool.filter(
    (e) => !excludeIds.has(e.id) && exerciseMatchesAnyTrailRunningCategory(e, categories)
  );
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => {
    const ca = getTrailRunningPatternCategoriesForExercise(a);
    const cb = getTrailRunningPatternCategoriesForExercise(b);
    const score = (s: Set<string>) => categories.filter((c) => s.has(c)).length;
    return score(cb) - score(ca);
  });
  return candidates[0];
}

export function findBestTrailMainWorkReplacement(pool: Exercise[], excludeIds: Set<string>): Exercise | undefined {
  const rule = getTrailRunningSlotRuleForBlockType("main_strength");
  if (!rule) return undefined;
  const strict = pool.filter(
    (e) =>
      !excludeIds.has(e.id) &&
      exerciseMatchesAnyTrailRunningCategory(e, rule.gateMatchAnyOf) &&
      !isExcludedFromTrailMainWorkSlot(e)
  );
  const pick = (candidates: Exercise[]) => {
    if (candidates.length === 0) return undefined;
    candidates.sort((a, b) => {
      const ca = getTrailRunningPatternCategoriesForExercise(a);
      const cb = getTrailRunningPatternCategoriesForExercise(b);
      const score = (s: Set<string>) => rule.gateMatchAnyOf.filter((c) => s.has(c)).length;
      return score(cb) - score(ca);
    });
    return candidates[0];
  };
  const bestStrict = pick(strict);
  if (bestStrict) return bestStrict;
  const loose = pool.filter(
    (e) => !excludeIds.has(e.id) && exerciseMatchesAnyTrailRunningCategory(e, rule.gateMatchAnyOf)
  );
  return pick(loose);
}
