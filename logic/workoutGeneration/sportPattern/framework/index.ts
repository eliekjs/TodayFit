/**
 * Reusable sport-pattern transfer mechanics (gating, slot scoring, session coverage context).
 * Sport-specific categories, rules bundles, and `getXxxPatternCategories` stay in `sportPatternTransfer/` per sport.
 */

export type {
  SportPatternGateResult,
  SportPatternGateOptions,
  SportPatternPoolMode,
  SportPatternSelectionTier,
  SportPatternSlotRule,
  SportPatternSlotScoreWeights,
} from "./types";
export { gatePoolForSportSlot, type SportPatternGateHooks } from "./gatePool";
export {
  computeSportPatternSlotScoreAdjustment,
  sportPatternScoreModeFromPoolMode,
} from "./slotScoreAdjustment";
export { getSportPatternSlotRuleForBlockType } from "./slotRules";
export { collectBlocksExerciseIdsByType, buildSportCoverageContext } from "./sessionContext";
