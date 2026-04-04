/**
 * Rock climbing: gating, slot scoring hooks, upstream coverage repairs.
 */

import { getCanonicalSportSlug } from "../../../data/sportSubFocus/canonicalSportSlug";
import type { Exercise, GenerateWorkoutInput } from "../types";
import {
  computeSportPatternSlotScoreAdjustment,
  gatePoolForSportSlot,
  sportPatternScoreModeFromPoolMode,
  type SportPatternSlotScoreWeights,
} from "../sportPattern/framework";
import type { SportPatternSlotRule } from "../sportPattern/framework/types";
import type { HikingGateResult } from "./types";
import {
  exerciseMatchesAnyRockClimbingCategory,
  getRockClimbingPatternCategoriesForExercise,
  isExcludedFromRockClimbingMainWorkSlot,
} from "./rockClimbingExerciseCategories";
import {
  ROCK_CLIMBING_DEPRIORITIZED,
  ROCK_COVERAGE_POSTAL_SUPPORT,
  ROCK_COVERAGE_PULL_FAMILY,
  ROCK_QUALITY_LADDER_ANCHORS,
  ROCK_QUALITY_LADDER_MIN_SCORE,
  getRockClimbingSlotRuleForBlockType,
} from "./rockClimbingRules";
import {
  addExerciseToRockSessionCounts,
  computeRockClimbingWithinPoolQualityScore,
} from "./rockClimbingQualityScoring";

export const ROCK_SCORE_MATCH_GATE = 4.2;
export const ROCK_SCORE_MATCH_PREFER = 2.4;
export const ROCK_SCORE_DEPRIORITIZED = 3.8;

const ROCK_SLOT_SCORE_WEIGHTS: SportPatternSlotScoreWeights = {
  matchGateFallback: ROCK_SCORE_MATCH_GATE,
  matchPrefer: ROCK_SCORE_MATCH_PREFER,
  deprioritized: ROCK_SCORE_DEPRIORITIZED,
};

const ALLOW_FOCUS = new Set([
  "full_body",
  "lower",
  "lower_body",
  "quad",
  "posterior",
  "core",
  "upper_pull",
  "upper",
  "upper_body",
]);

export function primarySportIsRockClimbing(input: GenerateWorkoutInput): boolean {
  const raw = input.sport_slugs?.[0];
  if (!raw) return false;
  return getCanonicalSportSlug(raw) === "rock_climbing";
}

export function rockClimbingBodyFocusAllows(input: GenerateWorkoutInput): boolean {
  const focus = (input.focus_body_parts ?? []).map((f) => f.toLowerCase().replace(/\s/g, "_"));
  if (focus.length === 0) return true;
  return focus.some((f) => ALLOW_FOCUS.has(f));
}

export function rockClimbingPatternTransferApplies(input: GenerateWorkoutInput): boolean {
  return primarySportIsRockClimbing(input) && rockClimbingBodyFocusAllows(input);
}

export function getRockClimbingSlotRule(blockType: string): SportPatternSlotRule | undefined {
  return getRockClimbingSlotRuleForBlockType(blockType);
}

function rockExercisePassesQualityLadderTier(ex: Exercise, blockType: string): boolean {
  const cats = getRockClimbingPatternCategoriesForExercise(ex);
  if (cats.size === 0) return false;
  const dep = ROCK_CLIMBING_DEPRIORITIZED as readonly string[];
  if ([...cats].every((c) => dep.includes(c))) return false;
  const anchors = ROCK_QUALITY_LADDER_ANCHORS as readonly string[];
  if ([...cats].some((c) => anchors.includes(c))) return true;
  const q = computeRockClimbingWithinPoolQualityScore(ex, {
    sessionRockCategoryCounts: new Map(),
    emphasisBucket: 0,
    blockType,
  });
  return q.total >= ROCK_QUALITY_LADDER_MIN_SCORE;
}

export function filterRockQualityAlignedLadderPool(
  fullPool: Exercise[],
  blockType: string,
  _rule: SportPatternSlotRule
): Exercise[] {
  return fullPool.filter((ex) => rockExercisePassesQualityLadderTier(ex, blockType));
}

export function gatePoolForRockClimbingSlot(
  fullPool: Exercise[],
  blockType: string,
  options?: { applyMainWorkExclusions?: boolean; requiredCount?: number }
): HikingGateResult {
  const rule = getRockClimbingSlotRule(blockType);
  return gatePoolForSportSlot(fullPool, blockType, rule, options, {
    exerciseMatchesGate: (ex, gateCategories) => exerciseMatchesAnyRockClimbingCategory(ex, gateCategories),
    refineGatedPoolForMainWork: ({ gated, rawCategoryMatches }) => {
      const withoutSkillNoise = gated.filter((e) => !isExcludedFromRockClimbingMainWorkSlot(e));
      if (withoutSkillNoise.length === 0) return rawCategoryMatches;
      return withoutSkillNoise.length > 0 ? withoutSkillNoise : rawCategoryMatches;
    },
    progressiveLadder: {
      exerciseMatchesPrefer: (ex: Exercise, preferCategories: readonly string[]) =>
        exerciseMatchesAnyRockClimbingCategory(ex, preferCategories),
      filterQualityAlignedPool: ({
        fullPool: fp,
        blockType: bt,
        rule: r,
      }: {
        fullPool: Exercise[];
        blockType: string;
        rule: SportPatternSlotRule;
      }) => filterRockQualityAlignedLadderPool(fp, bt, r),
    },
  });
}

export function isValidRockClimbingMainWorkExercise(ex: Exercise): boolean {
  const rule = getRockClimbingSlotRule("main_strength");
  if (!rule) return true;
  if (!exerciseMatchesAnyRockClimbingCategory(ex, rule.gateMatchAnyOf)) return false;
  if (isExcludedFromRockClimbingMainWorkSlot(ex)) return false;
  return true;
}

export function computeRockClimbingPatternScoreAdjustment(
  ex: Exercise,
  rule: SportPatternSlotRule,
  mode: "gated" | "fallback" | undefined
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
    (e) => getRockClimbingPatternCategoriesForExercise(e) as Set<string>,
    ROCK_SLOT_SCORE_WEIGHTS
  );
}

function pickWeakestRockMain(lifts: Exercise[], blockType: string): Exercise {
  let weakest = lifts[0]!;
  let weakestScore = Infinity;
  for (const m of lifts) {
    const q = computeRockClimbingWithinPoolQualityScore(m, {
      sessionRockCategoryCounts: new Map(),
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

export function findBestRockClimbingReplacement(
  pool: Exercise[],
  categories: readonly string[],
  excludeIds: Set<string>
): Exercise | undefined {
  const candidates = pool.filter((e) => !excludeIds.has(e.id) && exerciseMatchesAnyRockClimbingCategory(e, categories));
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => {
    const ca = getRockClimbingPatternCategoriesForExercise(a);
    const cb = getRockClimbingPatternCategoriesForExercise(b);
    const score = (s: Set<string>) => categories.filter((c) => s.has(c)).length;
    return score(cb) - score(ca);
  });
  return candidates[0];
}

export function applyRockUpstreamMainLiftsCoverage(
  mainLifts: Exercise[],
  replacementCatalog: Exercise[],
  blockType: "main_strength" | "main_hypertrophy"
): boolean {
  if (mainLifts.length === 0) return false;
  let changed = false;
  const gatedMain = gatePoolForRockClimbingSlot(replacementCatalog, blockType, {
    applyMainWorkExclusions: true,
  }).poolForSelection;

  if (!mainLifts.some((m) => exerciseMatchesAnyRockClimbingCategory(m, [...ROCK_COVERAGE_PULL_FAMILY]))) {
    const weakest = pickWeakestRockMain(mainLifts, blockType);
    const repl = findBestRockClimbingReplacement(
      gatedMain,
      [...ROCK_COVERAGE_PULL_FAMILY],
      new Set(mainLifts.map((m) => m.id).filter((id) => id !== weakest.id))
    );
    if (repl) {
      const idx = mainLifts.indexOf(weakest);
      if (idx >= 0) mainLifts[idx] = repl;
      changed = true;
    }
  }

  if (mainLifts.length >= 2 && !mainLifts.some((m) => exerciseMatchesAnyRockClimbingCategory(m, [...ROCK_COVERAGE_POSTAL_SUPPORT]))) {
    for (let i = 0; i < mainLifts.length; i++) {
      const m = mainLifts[i];
      if (exerciseMatchesAnyRockClimbingCategory(m, [...ROCK_COVERAGE_POSTAL_SUPPORT])) continue;
      const repl = findBestRockClimbingReplacement(
        replacementCatalog,
        [...ROCK_COVERAGE_POSTAL_SUPPORT],
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

function cumulativeRockMainAndAccessoryPairs(mainLifts: Exercise[], pairRows: Exercise[][]): Exercise[] {
  return [...mainLifts, ...pairRows.flatMap((p) => [...p])];
}

export function applyRockUpstreamAccessoryPairsCoverage(
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
        const q = computeRockClimbingWithinPoolQualityScore(ex, {
          sessionRockCategoryCounts: new Map(),
          emphasisBucket: 0,
          blockType: pairRowBlockType,
        }).total;
        slots.push({ ex, pi, ei, q });
      }
    }
    if (slots.length === 0) return false;
    slots.sort((a, b) => a.q - b.q);
    const usedAll = new Set(cumulativeRockMainAndAccessoryPairs(mainLifts, pairRows).map((e) => e.id));
    for (const slot of slots) {
      const exclude = new Set(usedAll);
      exclude.delete(slot.ex.id);
      const repl = findBestRockClimbingReplacement(replacementCatalog, categories, exclude);
      if (repl) {
        const row = [...pairRows[slot.pi]];
        row[slot.ei] = repl;
        pairRows[slot.pi] = row;
        return true;
      }
    }
    return false;
  };

  const scapOk = () =>
    cumulativeRockMainAndAccessoryPairs(mainLifts, pairRows).some((e) =>
      exerciseMatchesAnyRockClimbingCategory(e, ["scapular_stability_pull"])
    );
  const trunkOk = () =>
    cumulativeRockMainAndAccessoryPairs(mainLifts, pairRows).some((e) =>
      exerciseMatchesAnyRockClimbingCategory(e, ["trunk_bracing_climbing"])
    );

  if (!scapOk() && replaceWorstPairSlot(["scapular_stability_pull", "vertical_pull_transfer", "horizontal_pull_transfer"])) {
    changed = true;
  }
  if (!trunkOk() && replaceWorstPairSlot(["trunk_bracing_climbing"])) changed = true;
  return changed;
}
