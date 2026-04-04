/**
 * Alpine skiing — thin facade over mountain snow family (kind = alpine_skiing).
 */

import { getCanonicalSportSlug } from "../../../data/sportSubFocus/canonicalSportSlug";
import type { WorkoutBlock } from "../../../lib/types";
import type { Exercise, GenerateWorkoutInput } from "../types";
import {
  applySnowUpstreamAccessoryPairsCoverage,
  applySnowUpstreamMainLiftsCoverage,
  buildSnowSportTransferDebug,
  computeSnowSportPatternScoreAdjustment,
  evaluateSnowSportCoverageForBlocks,
  findBestSnowSportMainWorkReplacement,
  findBestSnowSportReplacement,
  gatePoolForSnowSportSlot,
  getSnowSportSlotRule,
  isValidSnowSportMainWorkExercise,
  snowSportBodyFocusAllows,
  resolveSnowSportKind,
} from "./snowSportFamily/snowSportSession";
import type { SportPatternSlotRule } from "../sportPattern/framework/types";
import type { AlpineSkiingSessionEnforcementSnapshot, AlpineSkiingTransferItemDebug } from "./alpineSkiingTypes";

export {
  buildSportCoverageContext,
  collectBlocksExerciseIdsByType,
} from "./snowSportFamily/snowSportSession";

export const ALPINE_SCORE_MATCH_GATE = 4.2;
export const ALPINE_SCORE_MATCH_PREFER = 2.4;
export const ALPINE_SCORE_DEPRIORITIZED = 3.8;

export function primarySportIsAlpineSkiing(input: GenerateWorkoutInput): boolean {
  const raw = input.sport_slugs?.[0];
  if (!raw) return false;
  return getCanonicalSportSlug(raw) === "alpine_skiing";
}

export function alpineSkiingPatternTransferApplies(input: GenerateWorkoutInput): boolean {
  return resolveSnowSportKind(input) === "alpine_skiing" && snowSportBodyFocusAllows(input);
}

export function getAlpineSkiingSlotRuleForBlockType(blockType: string): SportPatternSlotRule | undefined {
  return getSnowSportSlotRule(blockType, "alpine_skiing");
}

export function gatePoolForAlpineSkiingSlot(
  fullPool: Exercise[],
  blockType: string,
  options?: { applyMainWorkExclusions?: boolean; requiredCount?: number }
): import("./types").HikingGateResult {
  return gatePoolForSnowSportSlot(fullPool, blockType, "alpine_skiing", options);
}

export function isValidAlpineMainWorkExercise(ex: Exercise): boolean {
  return isValidSnowSportMainWorkExercise(ex, "alpine_skiing");
}

export function computeAlpineSkiingPatternScoreAdjustment(
  ex: Exercise,
  rule: SportPatternSlotRule,
  mode?: "gated" | "fallback"
): ReturnType<typeof computeSnowSportPatternScoreAdjustment> {
  return computeSnowSportPatternScoreAdjustment(ex, rule, mode, "alpine_skiing");
}

export function evaluateAlpineCoverageForBlocks(
  input: GenerateWorkoutInput,
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>
): ReturnType<typeof evaluateSnowSportCoverageForBlocks> {
  return evaluateSnowSportCoverageForBlocks("alpine_skiing", input, blocks, exerciseById);
}

export function buildAlpineSkiingTransferDebug(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>,
  enforcementSnapshot?: AlpineSkiingSessionEnforcementSnapshot,
  options?: { sessionSeed?: number }
): AlpineSkiingTransferItemDebug[] {
  return buildSnowSportTransferDebug("alpine_skiing", blocks, exerciseById, enforcementSnapshot, options);
}

export function findBestAlpineSkiingReplacement(
  pool: Exercise[],
  categories: readonly string[],
  excludeIds: Set<string>
): Exercise | undefined {
  return findBestSnowSportReplacement(pool, categories, excludeIds, "alpine_skiing");
}

export function applyAlpineUpstreamMainLiftsCoverage(
  mainLifts: Exercise[],
  replacementCatalog: Exercise[],
  blockType: "main_strength" | "main_hypertrophy"
): boolean {
  return applySnowUpstreamMainLiftsCoverage("alpine_skiing", mainLifts, replacementCatalog, blockType);
}

export function applyAlpineUpstreamAccessoryPairsCoverage(
  mainLifts: Exercise[],
  pairRows: Exercise[][],
  replacementCatalog: Exercise[],
  pairRowBlockType: "accessory" | "main_hypertrophy" = "accessory"
): boolean {
  return applySnowUpstreamAccessoryPairsCoverage(
    "alpine_skiing",
    mainLifts,
    pairRows,
    replacementCatalog,
    pairRowBlockType
  );
}

export function findBestAlpineMainWorkReplacement(pool: Exercise[], excludeIds: Set<string>): Exercise | undefined {
  return findBestSnowSportMainWorkReplacement(pool, excludeIds, "alpine_skiing");
}
