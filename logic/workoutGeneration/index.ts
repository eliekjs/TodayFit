/**
 * Session generation — public API. Used by both Build My Workout and Sports Prep.
 */

export {
  generateWorkoutSession,
  regenerateWorkoutSession,
  filterByHardConstraints,
  filterByConstraintsForPool,
  scoreExercise,
  buildSessionTargetVectorFromInput,
} from "./dailyGenerator";
export { collectWeekMainLiftExerciseIds } from "./collectWeekMainLiftExerciseIds";
export type { ScoreExerciseOptions } from "./dailyGenerator";
export type {
  SportPatternGateResult,
  SportPatternSlotRule,
  SportPatternPoolMode,
  SportPatternSlotScoreWeights,
} from "./sportPattern/framework/types";
export {
  gatePoolForSportSlot,
  computeSportPatternSlotScoreAdjustment,
  getSportPatternSlotRuleForBlockType,
  collectBlocksExerciseIdsByType,
  buildSportCoverageContext,
} from "./sportPattern/framework";
export {
  computeOntologyScoreComponents,
  getEffectiveFatigueRegions,
  getPreferredWarmupTargetsFromFocus,
  scoreRoleFit,
  scoreFatigueBalance,
  scoreMainLiftAnchor,
  scoreUnilateralVariety,
  scoreMovementPatternRedundancy,
} from "./ontologyScoring";
export type { OntologyScoreBreakdown, ExerciseForScoring } from "./ontologyScoring";
export {
  getCanonicalExerciseRole,
  getCanonicalMovementFamilies,
  getCanonicalMovementPatterns,
  getCanonicalFatigueRegions,
  getCanonicalJointStressTags,
  getCanonicalMobilityTargets,
  getCanonicalStretchTargets,
  isCanonicalCompound,
  isCanonicalIsolation,
  isCanonicalUnilateral,
  hasGripFatigueDemand,
} from "./ontologyNormalization";
export type { ExerciseForNormalization } from "./ontologyNormalization";
export { auditExerciseLibrary, formatAuditReport } from "./libraryAudit";
export type { LibraryAuditReport, AuditFinding } from "./libraryAudit";
export {
  buildHistoryContextFromLegacy,
  recentHistoryToRecentIds,
} from "./historyTypes";
export type {
  TrainingHistoryContext,
  RecentSessionRecord,
  ExerciseExposure,
  LastPerformedMap,
  ReadinessSignals,
} from "./historyTypes";
export {
  computeHistoryScoreComponents,
  getEffectiveRecentIds,
  getExerciseExposureCount,
  scoreRecentExposurePenalty,
  scoreAnchorRepeatBonus,
  scoreAccessoryRotationPenalty,
  HISTORY_WEIGHTS,
} from "./historyScoring";
export type { HistoryScoreBreakdown } from "./historyScoring";
export { getRecommendation } from "./recommendationLayer";
export type { Recommendation, RecommendationResult } from "./recommendationLayer";
export { applyRecommendationToPrescription } from "./prescriptionHistory";
export type { PrescriptionShape } from "./prescriptionHistory";
export {
  getExerciseRelations,
  pickRegressionInPool,
  pickProgressionOrAlternativeInPool,
} from "./exerciseRelations";
export type { ExerciseRelations } from "./exerciseRelations";
export { STUB_EXERCISES } from "./exerciseStub";
export {
  getSubstitutes,
  getBestSubstitute,
} from "../../lib/generation/exerciseSubstitution";
export type {
  ExerciseLike,
  RankedSubstitute,
  SubstituteReason,
  SubstitutionOptions,
} from "../../lib/generation/exerciseSubstitution";
export type {
  Exercise,
  ExerciseTags,
  GenerateWorkoutInput,
  WorkoutSession,
  WorkoutBlock,
  WorkoutItem,
  BlockType,
  BlockFormat,
  RegenerateMode,
  PrimaryGoal,
  FocusBodyPart,
  EnergyLevel,
  StylePrefs,
  RecentSessionSummary,
  ScoringDebug,
} from "./types";
