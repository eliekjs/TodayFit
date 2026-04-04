/**
 * Road-running sport-pattern integration (running family).
 */

import { getCanonicalSportSlug } from "../../../data/sportSubFocus/canonicalSportSlug";
import type { WorkoutBlock } from "../../../lib/types";
import type { Exercise, GenerateWorkoutInput } from "../types";
import { buildSportCoverageContext, collectBlocksExerciseIdsByType } from "../sportPattern/framework";
import {
  addExerciseToRunningSessionCounts,
  computeRunningEmphasisBucket,
  computeRunningWithinPoolQualityScore,
  isSignatureRunningMovement,
  type RunningFamilyQualityContext,
} from "./runningFamily/runningQualityScoring";
import { evaluateRoadMinimumCoverage } from "./runningFamily/roadRunningRules";
import {
  computeRunningPatternScoreAdjustment,
  findBestRunningMainWorkReplacement,
  findBestRunningReplacement,
  gatePoolForRunningSlot,
  getRunningSlotRuleForBlockType,
  ROAD_SCORE_DEPRIORITIZED,
  ROAD_SCORE_MATCH_GATE,
  ROAD_SCORE_MATCH_PREFER,
} from "./runningFamily/runningSession";
import {
  exerciseMatchesAnyRunningCategory,
  getRunningPatternCategoriesForExercise,
  isExcludedFromRoadMainWorkSlot,
  isRoadRunningConditioningExercise,
} from "./runningFamily/exerciseRunningCategories";
import type { SportPatternSlotRule } from "../sportPattern/framework/types";
import type { TrailRunningSessionEnforcementSnapshot, TrailRunningTransferItemDebug } from "./trailRunningTypes";

export { ROAD_SCORE_MATCH_GATE, ROAD_SCORE_MATCH_PREFER, ROAD_SCORE_DEPRIORITIZED };

export function primarySportIsRoadRunning(input: GenerateWorkoutInput): boolean {
  const raw = input.sport_slugs?.[0];
  if (!raw) return false;
  return getCanonicalSportSlug(raw) === "road_running";
}

/** Same focus-day eligibility as trail (lower / full body / core). */
export function roadRunningPatternTransferApplies(input: GenerateWorkoutInput): boolean {
  if (!primarySportIsRoadRunning(input)) return false;
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

export function getRoadRunningSlotRuleForBlockType(blockType: string): SportPatternSlotRule | undefined {
  return getRunningSlotRuleForBlockType("road_running", blockType);
}

export function gatePoolForRoadRunningSlot(
  fullPool: Exercise[],
  blockType: string,
  options?: { applyMainWorkExclusions?: boolean; requiredCount?: number }
): import("./types").HikingGateResult {
  return gatePoolForRunningSlot(fullPool, blockType, "road_running", options);
}

export function isValidRoadMainWorkExercise(ex: Exercise): boolean {
  const rule = getRoadRunningSlotRuleForBlockType("main_strength");
  if (!rule) return true;
  if (!exerciseMatchesAnyRunningCategory(ex, rule.gateMatchAnyOf)) return false;
  if (isExcludedFromRoadMainWorkSlot(ex)) return false;
  return true;
}

export function computeRoadRunningPatternScoreAdjustment(
  ex: Exercise,
  rule: SportPatternSlotRule,
  mode?: "gated" | "fallback"
) {
  return computeRunningPatternScoreAdjustment(ex, rule, mode, "road_running");
}

export function evaluateRoadCoverageForBlocks(
  input: GenerateWorkoutInput,
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>
): ReturnType<typeof evaluateRoadMinimumCoverage> {
  const ctx = buildSportCoverageContext(input, blocks);
  const byType = collectBlocksExerciseIdsByType(blocks);
  return evaluateRoadMinimumCoverage(ctx, byType, exerciseById);
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

export function buildRoadRunningTransferDebug(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>,
  enforcementSnapshot?: TrailRunningSessionEnforcementSnapshot,
  options?: { sessionSeed?: number }
): TrailRunningTransferItemDebug[] {
  const out: TrailRunningTransferItemDebug[] = [];
  const emphasisBucket =
    options?.sessionSeed != null ? computeRunningEmphasisBucket(options.sessionSeed, "road_running") : 0;
  const runningCategoryCounts = new Map<string, number>();

  for (const b of blocks) {
    if (b.block_type === "warmup" || b.block_type === "cooldown") continue;
    const rule = getRoadRunningSlotRuleForBlockType(b.block_type);
    if (!rule) continue;
    const blockPoolMode = poolModeForBlock(b.block_type, enforcementSnapshot);

    for (const it of b.items) {
      const ex = exerciseById.get(it.exercise_id);
      if (!ex) continue;
      const cats = [...getRunningPatternCategoriesForExercise(ex)];
      const adj = computeRoadRunningPatternScoreAdjustment(ex, rule, "gated");
      let tier: TrailRunningTransferItemDebug["tier"] = "fallback";
      if (adj.matchedGate) tier = "required";
      else if (adj.matchedPrefer) tier = "preferred";
      const noteParts: string[] = [];
      noteParts.push(`slot_rule=${rule.slotRuleId}`);
      if (adj.matchedDeprioritized) noteParts.push("also_matches_deprioritized_pattern");

      const passedGate = exerciseMatchesAnyRunningCategory(ex, rule.gateMatchAnyOf);
      const excludedMain = isExcludedFromRoadMainWorkSlot(ex);
      const itemFallbackPool =
        (b.block_type === "main_strength" && enforcementSnapshot?.main_strength?.usedFullPoolFallback === true) ||
        (b.block_type === "main_hypertrophy" && enforcementSnapshot?.main_hypertrophy?.usedFullPoolFallback === true) ||
        (b.block_type === "accessory" && enforcementSnapshot?.accessory?.usedFullPoolFallback === true);

      const q = computeRunningWithinPoolQualityScore(
        ex,
        {
          sessionTrailCategoryCounts: new Map(runningCategoryCounts),
          emphasisBucket,
          blockType: b.block_type,
        },
        "road_running"
      );
      addExerciseToRunningSessionCounts(ex, runningCategoryCounts, "road_running");

      out.push({
        exercise_id: ex.id,
        block_type: b.block_type,
        categories_matched: cats as import("./trailRunningTypes").TrailRunningPatternCategory[],
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
          signature_trail_movement: isSignatureRunningMovement(ex, "road_running"),
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

export function findBestRoadRunningReplacement(
  pool: Exercise[],
  categories: readonly string[],
  excludeIds: Set<string>
): Exercise | undefined {
  return findBestRunningReplacement(pool, categories, excludeIds);
}

export function findBestRoadMainWorkReplacement(pool: Exercise[], excludeIds: Set<string>): Exercise | undefined {
  return findBestRunningMainWorkReplacement(pool, excludeIds, "road_running");
}

export { isRoadRunningConditioningExercise };

export function computeRoadRunningEmphasisBucket(seed: number): number {
  return computeRunningEmphasisBucket(seed, "road_running");
}

export function addExerciseToRoadRunningSessionCounts(ex: Exercise, counts: Map<string, number>): void {
  addExerciseToRunningSessionCounts(ex, counts, "road_running");
}

export function computeRoadRunningWithinPoolQualityScore(ex: Exercise, ctx: RunningFamilyQualityContext) {
  return computeRunningWithinPoolQualityScore(ex, ctx, "road_running");
}
