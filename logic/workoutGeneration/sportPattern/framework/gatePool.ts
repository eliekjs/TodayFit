import type { Exercise } from "../../types";
import type { SportPatternGateOptions, SportPatternGateResult, SportPatternSlotRule } from "./types";

const DEFAULT_MAIN_WORK_SLOTS = new Set(["main_strength", "main_hypertrophy"]);

export type SportPatternGateHooks = {
  /** True if exercise matches at least one gate category. */
  exerciseMatchesGate: (ex: Exercise, gateCategories: readonly string[]) => boolean;
  /**
   * Optional: narrow gated pool for main-work slots (e.g. drop skill-noise when simpler matches exist).
   * Return a non-empty subset when possible; otherwise callers may keep `gated` as-is.
   */
  refineGatedPoolForMainWork?: (args: {
    gated: Exercise[];
    rawCategoryMatches: Exercise[];
    blockType: string;
  }) => Exercise[];
  /** When set (e.g. alpine skiing), try prefer → quality → full pool instead of jumping straight to full pool. */
  progressiveLadder?: SportPatternProgressiveLadderHooks;
};

function applyMainWorkRefine(
  gated: Exercise[],
  rawCategoryMatches: Exercise[],
  blockType: string,
  options: SportPatternGateOptions | undefined,
  mainWorkSlotBlockTypes: Set<string>,
  refineGatedPoolForMainWork: SportPatternGateHooks["refineGatedPoolForMainWork"]
): Exercise[] {
  const bt = blockType.toLowerCase().replace(/\s/g, "_");
  if (
    options?.applyMainWorkExclusions &&
    mainWorkSlotBlockTypes.has(bt) &&
    gated.length > 0 &&
    refineGatedPoolForMainWork
  ) {
    const refined = refineGatedPoolForMainWork({
      gated,
      rawCategoryMatches,
      blockType: bt,
    });
    return refined.length > 0 ? refined : rawCategoryMatches;
  }
  return gated;
}

/**
 * Slot-level gating: if **any** candidate matches the gate, `poolForSelection` is **only** those matches.
 * With `hooks.progressiveLadder`, tries sport-prefer then quality-aligned pools before full pool.
 */
export function gatePoolForSportSlot(
  fullPool: Exercise[],
  blockType: string,
  rule: SportPatternSlotRule | undefined,
  options: SportPatternGateOptions | undefined,
  hooks: SportPatternGateHooks,
  mainWorkSlotBlockTypes: Set<string> = DEFAULT_MAIN_WORK_SLOTS
): SportPatternGateResult {
  const requiredCount = options?.requiredCount;
  const fullCount = fullPool.length;
  const ladder = hooks.progressiveLadder;

  if (!rule) {
    return {
      gated: fullPool,
      matchCount: fullPool.length,
      hasMatches: true,
      poolForSelection: fullPool,
      poolMode: "gated",
      usedFullPoolFallback: false,
      selectionTier: "strict_gate",
      requiredCount,
      telemetry: {
        full_pool_count: fullCount,
        raw_gate_match_count: fullCount,
        refined_gated_count: fullCount,
        selection_tier: "strict_gate",
      },
    };
  }

  const rawCategoryMatches = fullPool.filter((e) => hooks.exerciseMatchesGate(e, rule.gateMatchAnyOf));
  const rawMatchCount = rawCategoryMatches.length;
  let strictGated = applyMainWorkRefine(
    rawCategoryMatches,
    rawCategoryMatches,
    blockType,
    options,
    mainWorkSlotBlockTypes,
    hooks.refineGatedPoolForMainWork
  );

  const strictCount = strictGated.length;

  if (strictCount > 0) {
    return {
      gated: strictGated,
      matchCount: strictCount,
      hasMatches: true,
      poolForSelection: strictGated,
      poolMode: "gated",
      usedFullPoolFallback: false,
      selectionTier: "strict_gate",
      requiredCount,
      telemetry: {
        full_pool_count: fullCount,
        raw_gate_match_count: rawMatchCount,
        refined_gated_count: strictCount,
        selection_tier: "strict_gate",
      },
    };
  }

  if (ladder) {
    const rawPreferMatches = fullPool.filter((e) => ladder.exerciseMatchesPrefer(e, rule.preferMatchAnyOf));
    const preferRefined = applyMainWorkRefine(
      rawPreferMatches,
      rawPreferMatches,
      blockType,
      options,
      mainWorkSlotBlockTypes,
      hooks.refineGatedPoolForMainWork
    );
    const preferPool = preferRefined.length > 0 ? preferRefined : rawPreferMatches;

    if (preferPool.length > 0) {
      return {
        gated: [],
        matchCount: 0,
        hasMatches: false,
        poolForSelection: preferPool,
        poolMode: "sport_preferred_pool",
        usedFullPoolFallback: false,
        selectionTier: "sport_preferred",
        requiredCount,
        telemetry: {
          full_pool_count: fullCount,
          raw_gate_match_count: rawMatchCount,
          refined_gated_count: 0,
          prefer_match_count: preferPool.length,
          selection_tier: "sport_preferred",
        },
      };
    }

    const qualityPool = ladder.filterQualityAlignedPool({ fullPool, blockType, rule });
    if (qualityPool.length > 0) {
      return {
        gated: [],
        matchCount: 0,
        hasMatches: false,
        poolForSelection: qualityPool,
        poolMode: "sport_quality_pool",
        usedFullPoolFallback: false,
        selectionTier: "sport_quality_aligned",
        requiredCount,
        telemetry: {
          full_pool_count: fullCount,
          raw_gate_match_count: rawMatchCount,
          refined_gated_count: 0,
          prefer_match_count: 0,
          quality_aligned_count: qualityPool.length,
          selection_tier: "sport_quality_aligned",
        },
      };
    }

    return {
      gated: [],
      matchCount: 0,
      hasMatches: false,
      poolForSelection: fullPool,
      poolMode: "full_pool_fallback",
      usedFullPoolFallback: true,
      selectionTier: "full_pool_degraded",
      requiredCount,
      telemetry: {
        full_pool_count: fullCount,
        raw_gate_match_count: rawMatchCount,
        refined_gated_count: 0,
        prefer_match_count: 0,
        quality_aligned_count: 0,
        selection_tier: "full_pool_degraded",
      },
    };
  }

  return {
    gated: [],
    matchCount: 0,
    hasMatches: false,
    poolForSelection: fullPool,
    poolMode: "full_pool_fallback",
    usedFullPoolFallback: true,
    selectionTier: "full_pool_degraded",
    requiredCount,
    telemetry: {
      full_pool_count: fullCount,
      raw_gate_match_count: rawMatchCount,
      refined_gated_count: 0,
      selection_tier: "full_pool_degraded",
    },
  };
}
