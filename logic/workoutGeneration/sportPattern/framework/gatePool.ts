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
};

/**
 * Slot-level gating: if **any** candidate matches the gate, `poolForSelection` is **only** those matches.
 * Full-pool fallback happens **only** when `matchCount === 0`.
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
  if (!rule) {
    return {
      gated: fullPool,
      matchCount: fullPool.length,
      hasMatches: true,
      poolForSelection: fullPool,
      poolMode: "gated",
      usedFullPoolFallback: false,
      requiredCount,
    };
  }

  const rawCategoryMatches = fullPool.filter((e) => hooks.exerciseMatchesGate(e, rule.gateMatchAnyOf));
  let gated = rawCategoryMatches;

  const bt = blockType.toLowerCase().replace(/\s/g, "_");
  if (
    options?.applyMainWorkExclusions &&
    mainWorkSlotBlockTypes.has(bt) &&
    gated.length > 0 &&
    hooks.refineGatedPoolForMainWork
  ) {
    const refined = hooks.refineGatedPoolForMainWork({
      gated,
      rawCategoryMatches,
      blockType: bt,
    });
    gated = refined.length > 0 ? refined : rawCategoryMatches;
  }

  const matchCount = gated.length;
  const hasMatches = matchCount > 0;

  if (!hasMatches) {
    return {
      gated: [],
      matchCount: 0,
      hasMatches: false,
      poolForSelection: fullPool,
      poolMode: "full_pool_fallback",
      usedFullPoolFallback: true,
      requiredCount,
    };
  }

  return {
    gated,
    matchCount,
    hasMatches: true,
    poolForSelection: gated,
    poolMode: "gated",
    usedFullPoolFallback: false,
    requiredCount,
  };
}
