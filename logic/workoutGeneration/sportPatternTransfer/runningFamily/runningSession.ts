/**
 * Unified running-family session hooks (road + trail): gating, slot rules, score adjustments.
 */

import { getCanonicalSportSlug } from "../../../../data/sportSubFocus/canonicalSportSlug";
import type { Exercise } from "../../types";
import type { GenerateWorkoutInput } from "../../types";
import {
  gatePoolForSportSlot,
  computeSportPatternSlotScoreAdjustment,
  getSportPatternSlotRuleForBlockType,
  type SportPatternSlotScoreWeights,
} from "../../sportPattern/framework";
import type { SportPatternSlotRule } from "../../sportPattern/framework/types";
import {
  exerciseMatchesAnyRunningCategory,
  getRunningPatternCategoriesForExercise,
  isExcludedFromRoadMainWorkSlot,
  isExcludedFromTrailMainWorkSlot,
} from "./exerciseRunningCategories";
import { roadSportSelectionRules } from "./roadRunningRules";
import { trailSportSelectionRules } from "../trailRunningRules";
import type { RunningSportKind } from "./runningPatternTypes";
import type { HikingGateResult } from "../types";

export const TRAIL_SCORE_MATCH_GATE = 4.2;
export const TRAIL_SCORE_MATCH_PREFER = 2.4;
export const TRAIL_SCORE_DEPRIORITIZED = 3.8;

export const ROAD_SCORE_MATCH_GATE = 4.35;
export const ROAD_SCORE_MATCH_PREFER = 2.55;
export const ROAD_SCORE_DEPRIORITIZED = 4.0;

const TRAIL_WEIGHTS: SportPatternSlotScoreWeights = {
  matchGateFallback: TRAIL_SCORE_MATCH_GATE,
  matchPrefer: TRAIL_SCORE_MATCH_PREFER,
  deprioritized: TRAIL_SCORE_DEPRIORITIZED,
};

const ROAD_WEIGHTS: SportPatternSlotScoreWeights = {
  matchGateFallback: ROAD_SCORE_MATCH_GATE,
  matchPrefer: ROAD_SCORE_MATCH_PREFER,
  deprioritized: ROAD_SCORE_DEPRIORITIZED,
};

export function resolveRunningSportKind(input: GenerateWorkoutInput): RunningSportKind | null {
  const raw = input.sport_slugs?.[0];
  if (!raw) return null;
  const s = getCanonicalSportSlug(raw);
  if (s === "road_running") return "road_running";
  if (s === "trail_running") return "trail_running";
  return null;
}

export function runningPatternTransferApplies(input: GenerateWorkoutInput): boolean {
  if (!resolveRunningSportKind(input)) return false;
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

export function primarySportIsRoadRunning(input: GenerateWorkoutInput): boolean {
  return resolveRunningSportKind(input) === "road_running";
}

export function primarySportIsTrailRunning(input: GenerateWorkoutInput): boolean {
  return resolveRunningSportKind(input) === "trail_running";
}

export function getRunningSportSelectionRules(kind: RunningSportKind) {
  return kind === "road_running" ? roadSportSelectionRules : trailSportSelectionRules;
}

export function getRunningSlotRuleForBlockType(kind: RunningSportKind, blockType: string): SportPatternSlotRule | undefined {
  return getSportPatternSlotRuleForBlockType(blockType, getRunningSportSelectionRules(kind).slots);
}

export function gatePoolForRunningSlot(
  fullPool: Exercise[],
  blockType: string,
  kind: RunningSportKind,
  options?: { applyMainWorkExclusions?: boolean; requiredCount?: number }
): HikingGateResult {
  const rule = getRunningSlotRuleForBlockType(kind, blockType);
  return gatePoolForSportSlot(fullPool, blockType, rule, options, {
    exerciseMatchesGate: (ex, gateCategories) => exerciseMatchesAnyRunningCategory(ex, gateCategories),
    refineGatedPoolForMainWork:
      kind === "trail_running"
        ? ({ gated, rawCategoryMatches }) => {
            const withoutSkillNoise = gated.filter((e) => !isExcludedFromTrailMainWorkSlot(e));
            return withoutSkillNoise.length > 0 ? withoutSkillNoise : rawCategoryMatches;
          }
        : ({ gated, rawCategoryMatches }) => {
            const withoutSkillNoise = gated.filter((e) => !isExcludedFromRoadMainWorkSlot(e));
            return withoutSkillNoise.length > 0 ? withoutSkillNoise : rawCategoryMatches;
          },
  });
}

export function isValidRunningMainWorkExercise(ex: Exercise, kind: RunningSportKind): boolean {
  const rule = getRunningSlotRuleForBlockType(kind, "main_strength");
  if (!rule) return true;
  if (!exerciseMatchesAnyRunningCategory(ex, rule.gateMatchAnyOf)) return false;
  if (kind === "trail_running") {
    if (isExcludedFromTrailMainWorkSlot(ex)) return false;
  } else {
    if (isExcludedFromRoadMainWorkSlot(ex)) return false;
  }
  return true;
}

export function computeRunningPatternScoreAdjustment(
  ex: Exercise,
  rule: SportPatternSlotRule,
  mode: "gated" | "fallback" | undefined,
  kind: RunningSportKind
): {
  delta: number;
  matchedGate: boolean;
  matchedPrefer: boolean;
  matchedDeprioritized: boolean;
} {
  const weights = kind === "road_running" ? ROAD_WEIGHTS : TRAIL_WEIGHTS;
  return computeSportPatternSlotScoreAdjustment(
    ex,
    rule,
    mode,
    (e) => getRunningPatternCategoriesForExercise(e) as Set<string>,
    weights
  );
}

export function findBestRunningReplacement(
  pool: Exercise[],
  categories: readonly string[],
  excludeIds: Set<string>
): Exercise | undefined {
  const candidates = pool.filter(
    (e) => !excludeIds.has(e.id) && exerciseMatchesAnyRunningCategory(e, categories)
  );
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => {
    const ca = getRunningPatternCategoriesForExercise(a);
    const cb = getRunningPatternCategoriesForExercise(b);
    const score = (s: Set<string>) => categories.filter((c) => s.has(c)).length;
    return score(cb) - score(ca);
  });
  return candidates[0];
}

export function findBestRunningMainWorkReplacement(
  pool: Exercise[],
  excludeIds: Set<string>,
  kind: RunningSportKind
): Exercise | undefined {
  const rule = getRunningSlotRuleForBlockType(kind, "main_strength");
  if (!rule) return undefined;
  const excluded =
    kind === "trail_running" ? isExcludedFromTrailMainWorkSlot : isExcludedFromRoadMainWorkSlot;
  const strict = pool.filter(
    (e) =>
      !excludeIds.has(e.id) &&
      exerciseMatchesAnyRunningCategory(e, rule.gateMatchAnyOf) &&
      !excluded(e)
  );
  const pick = (candidates: Exercise[]) => {
    if (candidates.length === 0) return undefined;
    candidates.sort((a, b) => {
      const ca = getRunningPatternCategoriesForExercise(a);
      const cb = getRunningPatternCategoriesForExercise(b);
      const score = (s: Set<string>) => rule.gateMatchAnyOf.filter((c) => s.has(c)).length;
      return score(cb) - score(ca);
    });
    return candidates[0];
  };
  const bestStrict = pick(strict);
  if (bestStrict) return bestStrict;
  const loose = pool.filter(
    (e) => !excludeIds.has(e.id) && exerciseMatchesAnyRunningCategory(e, rule.gateMatchAnyOf)
  );
  return pick(loose);
}
