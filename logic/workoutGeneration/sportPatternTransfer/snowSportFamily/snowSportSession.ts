/**
 * Snow family session wiring: gating, scoring, upstream coverage, debug — parameterized by SnowSportKind.
 */

import { getCanonicalSportSlug } from "../../../../data/sportSubFocus/canonicalSportSlug";
import type { WorkoutBlock } from "../../../../lib/types";
import type { Exercise, GenerateWorkoutInput } from "../../types";
import {
  buildSportCoverageContext,
  collectBlocksExerciseIdsByType,
  computeSportPatternSlotScoreAdjustment,
  gatePoolForSportSlot,
  getSportPatternSlotRuleForBlockType,
  sportPatternScoreModeFromPoolMode,
  type SportPatternSlotScoreWeights,
} from "../../sportPattern/framework";
import type { SportPatternSelectionTier, SportPatternSlotRule } from "../../sportPattern/framework/types";
import {
  exerciseMatchesAnySnowSportCategory,
  getSnowSportPatternCategoriesForExercise,
  isExcludedFromSnowSportMainWorkSlot,
} from "./snowSportExerciseCategories";
import {
  evaluateSnowSportMinimumCoverage,
  getSnowQualityLadderAnchors,
  getSnowSportDeprioritized,
  getSnowSportSlotRuleForBlockType,
  SNOW_ECCENTRIC_CONTROL_FAMILY,
  SNOW_ECCENTRIC_OR_DECEL,
  SNOW_QUALITY_LADDER_MIN_SCORE,
  SNOW_LATERAL_TRUNK,
  SNOW_QUAD_SUSTAINED,
} from "./snowSportFamilyRules";
import {
  addExerciseToSnowSessionCounts,
  computeSnowSportEmphasisBucket,
  computeSnowSportWithinPoolQualityScore,
  isSignatureSnowSportMovement,
} from "./snowSportQualityScoring";
import type { SnowSportKind } from "./snowSportTypes";
import { isSnowSportKind } from "./snowSportTypes";
import type { HikingGateResult, HikingSessionEnforcementSnapshot } from "../types";
import type { AlpineSkiingTransferItemDebug } from "../alpineSkiingTypes";

export { buildSportCoverageContext, collectBlocksExerciseIdsByType };

export const SNOW_SCORE_MATCH_GATE = 4.2;
export const SNOW_SCORE_MATCH_PREFER = 2.4;
export const SNOW_SCORE_DEPRIORITIZED = 3.8;

const SNOW_SLOT_SCORE_WEIGHTS: SportPatternSlotScoreWeights = {
  matchGateFallback: SNOW_SCORE_MATCH_GATE,
  matchPrefer: SNOW_SCORE_MATCH_PREFER,
  deprioritized: SNOW_SCORE_DEPRIORITIZED,
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
]);

export function resolveSnowSportKind(input: GenerateWorkoutInput): SnowSportKind | null {
  const raw = input.sport_slugs?.[0];
  if (!raw) return null;
  const c = getCanonicalSportSlug(raw);
  return isSnowSportKind(c) ? c : null;
}

export function snowSportPatternTransferApplies(input: GenerateWorkoutInput): boolean {
  return resolveSnowSportKind(input) != null;
}

export function snowSportBodyFocusAllows(input: GenerateWorkoutInput): boolean {
  const focus = (input.focus_body_parts ?? []).map((f) => f.toLowerCase().replace(/\s/g, "_"));
  if (focus.length === 0) return true;
  return focus.some((f) => ALLOW_FOCUS.has(f));
}

export function getSnowSportSlotRule(blockType: string, kind: SnowSportKind): SportPatternSlotRule | undefined {
  return getSnowSportSlotRuleForBlockType(blockType, kind);
}

function snowboardPassesSagittalRefine(ex: Exercise): boolean {
  const c = getSnowSportPatternCategoriesForExercise(ex);
  if (!c.has("low_transfer_sagittal_only")) return true;
  return (
    c.has("eccentric_braking_control") ||
    c.has("lateral_frontal_plane_stability") ||
    c.has("snowboard_asymmetric_stance") ||
    c.has("landing_deceleration_support")
  );
}

export function filterSnowQualityAlignedLadderPool(
  fullPool: Exercise[],
  blockType: string,
  _rule: SportPatternSlotRule,
  kind: SnowSportKind
): Exercise[] {
  return fullPool.filter((ex) => snowExercisePassesQualityLadderTier(ex, blockType, kind));
}

function snowExercisePassesQualityLadderTier(ex: Exercise, blockType: string, kind: SnowSportKind): boolean {
  const cats = getSnowSportPatternCategoriesForExercise(ex);
  if (cats.size === 0) return false;
  const dep = getSnowSportDeprioritized(kind) as readonly string[];
  if ([...cats].every((c) => dep.includes(c))) return false;
  const anchors = getSnowQualityLadderAnchors(kind) as readonly string[];
  if ([...cats].some((c) => anchors.includes(c))) return true;
  const q = computeSnowSportWithinPoolQualityScore(
    ex,
    {
      sessionSnowCategoryCounts: new Map(),
      emphasisBucket: 0,
      blockType,
    },
    kind
  );
  return q.total >= SNOW_QUALITY_LADDER_MIN_SCORE;
}

export function gatePoolForSnowSportSlot(
  fullPool: Exercise[],
  blockType: string,
  kind: SnowSportKind,
  options?: { applyMainWorkExclusions?: boolean; requiredCount?: number }
): HikingGateResult {
  const rule = getSnowSportSlotRule(blockType, kind);
  return gatePoolForSportSlot(fullPool, blockType, rule, options, {
    exerciseMatchesGate: (ex, gateCategories) => exerciseMatchesAnySnowSportCategory(ex, gateCategories),
    refineGatedPoolForMainWork: ({ gated, rawCategoryMatches }) => {
      let withoutSkillNoise = gated.filter((e) => !isExcludedFromSnowSportMainWorkSlot(e));
      if (withoutSkillNoise.length === 0) return rawCategoryMatches;
      if (kind === "snowboarding") {
        const refined = withoutSkillNoise.filter(snowboardPassesSagittalRefine);
        if (refined.length > 0) withoutSkillNoise = refined;
      }
      return withoutSkillNoise.length > 0 ? withoutSkillNoise : rawCategoryMatches;
    },
    progressiveLadder: {
      exerciseMatchesPrefer: (ex: Exercise, preferCategories: readonly string[]) =>
        exerciseMatchesAnySnowSportCategory(ex, preferCategories),
      filterQualityAlignedPool: ({
        fullPool: fp,
        blockType: bt,
        rule: r,
      }: {
        fullPool: Exercise[];
        blockType: string;
        rule: SportPatternSlotRule;
      }) => filterSnowQualityAlignedLadderPool(fp, bt, r, kind),
    },
  });
}

export function isValidSnowSportMainWorkExercise(ex: Exercise, kind: SnowSportKind): boolean {
  const rule = getSnowSportSlotRule("main_strength", kind);
  if (!rule) return true;
  if (!exerciseMatchesAnySnowSportCategory(ex, rule.gateMatchAnyOf)) return false;
  if (isExcludedFromSnowSportMainWorkSlot(ex)) return false;
  if (kind === "snowboarding" && !snowboardPassesSagittalRefine(ex)) return false;
  return true;
}

export function computeSnowSportPatternScoreAdjustment(
  ex: Exercise,
  rule: SportPatternSlotRule,
  mode: "gated" | "fallback" | undefined,
  kind: SnowSportKind
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
    (e) => getSnowSportPatternCategoriesForExercise(e) as Set<string>,
    SNOW_SLOT_SCORE_WEIGHTS
  );
}

export function evaluateSnowSportCoverageForBlocks(
  kind: SnowSportKind,
  input: GenerateWorkoutInput,
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>
): ReturnType<typeof evaluateSnowSportMinimumCoverage> {
  const ctx = buildSportCoverageContext(input, blocks);
  const byType = collectBlocksExerciseIdsByType(blocks);
  return evaluateSnowSportMinimumCoverage(kind, ctx, byType, exerciseById);
}

export type SnowSportSessionEnforcementSnapshot = HikingSessionEnforcementSnapshot;

function poolModeForBlock(
  blockType: string,
  snap: SnowSportSessionEnforcementSnapshot | undefined
): HikingGateResult["poolMode"] | undefined {
  const bt = blockType.toLowerCase().replace(/\s/g, "_");
  if (bt === "main_strength" && snap?.main_strength) return snap.main_strength.poolMode;
  if (bt === "main_hypertrophy" && snap?.main_hypertrophy) return snap.main_hypertrophy.poolMode;
  if (bt === "accessory" && snap?.accessory) return snap.accessory.poolMode;
  return undefined;
}

function selectionTierForBlock(
  blockType: string,
  snap: SnowSportSessionEnforcementSnapshot | undefined
): SportPatternSelectionTier | undefined {
  const bt = blockType.toLowerCase().replace(/\s/g, "_");
  if (bt === "main_strength" && snap?.main_strength) return snap.main_strength.selectionTier;
  if (bt === "main_hypertrophy" && snap?.main_hypertrophy) return snap.main_hypertrophy.selectionTier;
  if (bt === "accessory" && snap?.accessory) return snap.accessory.selectionTier;
  return undefined;
}

/** Debug row shape reused for all snow sports (alpine-compatible field names where needed). */
export function buildSnowSportTransferDebug(
  kind: SnowSportKind,
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>,
  enforcementSnapshot?: SnowSportSessionEnforcementSnapshot,
  options?: { sessionSeed?: number }
): AlpineSkiingTransferItemDebug[] {
  const out: AlpineSkiingTransferItemDebug[] = [];
  const emphasisBucket =
    options?.sessionSeed != null ? computeSnowSportEmphasisBucket(options.sessionSeed, kind) : 0;
  const runningCategoryCounts = new Map<string, number>();

  for (const b of blocks) {
    if (b.block_type === "warmup" || b.block_type === "cooldown") continue;
    const rule = getSnowSportSlotRule(b.block_type, kind);
    if (!rule) continue;
    const blockPoolMode = poolModeForBlock(b.block_type, enforcementSnapshot);
    const blockSelectionTier = selectionTierForBlock(b.block_type, enforcementSnapshot);
    const slotScoreMode = sportPatternScoreModeFromPoolMode(blockPoolMode) ?? "fallback";

    for (const it of b.items) {
      const ex = exerciseById.get(it.exercise_id);
      if (!ex) continue;
      const cats = [...getSnowSportPatternCategoriesForExercise(ex)];
      const adj = computeSnowSportPatternScoreAdjustment(ex, rule, slotScoreMode, kind);
      let tier: AlpineSkiingTransferItemDebug["tier"] = "fallback";
      if (adj.matchedGate) tier = "required";
      else if (adj.matchedPrefer) tier = "preferred";
      const noteParts: string[] = [];
      noteParts.push(`snow_kind=${kind};slot_rule=${rule.slotRuleId}`);
      if (adj.matchedDeprioritized) noteParts.push("also_matches_deprioritized_pattern");

      const passedGate = exerciseMatchesAnySnowSportCategory(ex, rule.gateMatchAnyOf);
      const excludedMain = isExcludedFromSnowSportMainWorkSlot(ex);
      const itemFallbackPool =
        (b.block_type === "main_strength" && enforcementSnapshot?.main_strength?.usedFullPoolFallback === true) ||
        (b.block_type === "main_hypertrophy" && enforcementSnapshot?.main_hypertrophy?.usedFullPoolFallback === true) ||
        (b.block_type === "accessory" && enforcementSnapshot?.accessory?.usedFullPoolFallback === true);

      const q = computeSnowSportWithinPoolQualityScore(ex, {
        sessionSnowCategoryCounts: new Map(runningCategoryCounts),
        emphasisBucket,
        blockType: b.block_type,
      }, kind);
      addExerciseToSnowSessionCounts(ex, runningCategoryCounts);

      out.push({
        exercise_id: ex.id,
        block_type: b.block_type,
        categories_matched: cats as AlpineSkiingTransferItemDebug["categories_matched"],
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
          signature_alpine_movement: isSignatureSnowSportMovement(ex, kind),
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

export function findBestSnowSportReplacement(
  pool: Exercise[],
  categories: readonly string[],
  excludeIds: Set<string>,
  kind: SnowSportKind
): Exercise | undefined {
  const candidates = pool.filter((e) => !excludeIds.has(e.id) && exerciseMatchesAnySnowSportCategory(e, categories));
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => {
    const ca = getSnowSportPatternCategoriesForExercise(a);
    const cb = getSnowSportPatternCategoriesForExercise(b);
    const score = (s: Set<string>) => categories.filter((c) => s.has(c)).length;
    return score(cb) - score(ca);
  });
  return candidates[0];
}

function pickWeakestSnowMainForReplacement(lifts: Exercise[], blockType: string, kind: SnowSportKind): Exercise {
  let weakest = lifts[0]!;
  let weakestScore = Infinity;
  for (const m of lifts) {
    const q = computeSnowSportWithinPoolQualityScore(
      m,
      { sessionSnowCategoryCounts: new Map(), emphasisBucket: 0, blockType },
      kind
    );
    if (q.total < weakestScore) {
      weakestScore = q.total;
      weakest = m;
    }
  }
  return weakest;
}

export function applySnowUpstreamMainLiftsCoverage(
  kind: SnowSportKind,
  mainLifts: Exercise[],
  replacementCatalog: Exercise[],
  blockType: "main_strength" | "main_hypertrophy"
): boolean {
  if (mainLifts.length === 0) return false;
  let changed = false;
  const gatedMain = gatePoolForSnowSportSlot(replacementCatalog, blockType, kind, {
    applyMainWorkExclusions: true,
  }).poolForSelection;

  const mainEccentricCats =
    kind === "xc_skiing"
      ? (["nordic_poling_pull_endurance", "quad_dominant_endurance", "sustained_tension_lower_body", "eccentric_braking_control"] as const)
      : SNOW_ECCENTRIC_OR_DECEL;

  if (!mainLifts.some((m) => exerciseMatchesAnySnowSportCategory(m, [...mainEccentricCats]))) {
    const weakest = pickWeakestSnowMainForReplacement(mainLifts, blockType, kind);
    const repl = findBestSnowSportReplacement(
      gatedMain,
      [...mainEccentricCats],
      new Set(mainLifts.map((m) => m.id).filter((id) => id !== weakest.id)),
      kind
    );
    if (repl) {
      const idx = mainLifts.indexOf(weakest);
      if (idx >= 0) mainLifts[idx] = repl;
      changed = true;
    }
  }

  if (kind !== "xc_skiing") {
    if (!mainLifts.some((m) => exerciseMatchesAnySnowSportCategory(m, [...SNOW_ECCENTRIC_CONTROL_FAMILY]))) {
      for (let i = 0; i < mainLifts.length; i++) {
        const m = mainLifts[i];
        if (exerciseMatchesAnySnowSportCategory(m, [...SNOW_ECCENTRIC_CONTROL_FAMILY])) continue;
        const repl = findBestSnowSportReplacement(
          replacementCatalog,
          [...SNOW_ECCENTRIC_CONTROL_FAMILY],
          new Set(mainLifts.map((x) => x.id).filter((id) => id !== m.id)),
          kind
        );
        if (repl) {
          mainLifts[i] = repl;
          changed = true;
          break;
        }
      }
    }
  }

  if (!mainLifts.some((m) => exerciseMatchesAnySnowSportCategory(m, [...SNOW_QUAD_SUSTAINED]))) {
    for (let i = 0; i < mainLifts.length; i++) {
      const m = mainLifts[i];
      if (exerciseMatchesAnySnowSportCategory(m, [...SNOW_QUAD_SUSTAINED])) continue;
      const repl = findBestSnowSportReplacement(
        replacementCatalog,
        [...SNOW_QUAD_SUSTAINED],
        new Set(mainLifts.map((x) => x.id).filter((id) => id !== m.id)),
        kind
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

export function applySnowUpstreamAccessoryPairsCoverage(
  kind: SnowSportKind,
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
        const q = computeSnowSportWithinPoolQualityScore(
          ex,
          { sessionSnowCategoryCounts: new Map(), emphasisBucket: 0, blockType: pairRowBlockType },
          kind
        ).total;
        slots.push({ ex, pi, ei, q });
      }
    }
    if (slots.length === 0) return false;
    slots.sort((a, b) => a.q - b.q);
    const usedAll = new Set(cumulativeMainAndAccessoryPairs(mainLifts, pairRows).map((e) => e.id));
    for (const slot of slots) {
      const exclude = new Set(usedAll);
      exclude.delete(slot.ex.id);
      const repl = findBestSnowSportReplacement(replacementCatalog, categories, exclude, kind);
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
      exerciseMatchesAnySnowSportCategory(e, [...SNOW_LATERAL_TRUNK])
    );
  const tensionOk = () =>
    cumulativeMainAndAccessoryPairs(mainLifts, pairRows).some((e) =>
      exerciseMatchesAnySnowSportCategory(e, [...SNOW_QUAD_SUSTAINED])
    );

  if (!lateralOk() && replaceWorstPairSlot([...SNOW_LATERAL_TRUNK])) changed = true;
  if (!tensionOk() && replaceWorstPairSlot([...SNOW_QUAD_SUSTAINED])) changed = true;
  return changed;
}

export function findBestSnowSportMainWorkReplacement(
  pool: Exercise[],
  excludeIds: Set<string>,
  kind: SnowSportKind
): Exercise | undefined {
  const rule = getSnowSportSlotRule("main_strength", kind);
  if (!rule) return undefined;
  const strict = pool.filter(
    (e) =>
      !excludeIds.has(e.id) &&
      exerciseMatchesAnySnowSportCategory(e, rule.gateMatchAnyOf) &&
      !isExcludedFromSnowSportMainWorkSlot(e) &&
      (kind !== "snowboarding" || snowboardPassesSagittalRefine(e))
  );
  const pick = (candidates: Exercise[]) => {
    if (candidates.length === 0) return undefined;
    candidates.sort((a, b) => {
      const ca = getSnowSportPatternCategoriesForExercise(a);
      const cb = getSnowSportPatternCategoriesForExercise(b);
      const score = (s: Set<string>) => rule.gateMatchAnyOf.filter((c) => s.has(c)).length;
      return score(cb) - score(ca);
    });
    return candidates[0];
  };
  const bestStrict = pick(strict);
  if (bestStrict) return bestStrict;
  const loose = pool.filter(
    (e) => !excludeIds.has(e.id) && exerciseMatchesAnySnowSportCategory(e, rule.gateMatchAnyOf)
  );
  return pick(loose);
}