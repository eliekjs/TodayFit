/**
 * Workout intelligence — public API.
 * Goal modeling, sport demand, exercise capability, scoring, session composition.
 */

export { TRAINING_QUALITIES, TRAINING_QUALITY_SLUGS, getQualityBySlug, isTrainingQualitySlug } from "./trainingQualities";
export type { TrainingQualitySlug, TrainingQualityDef, TrainingQualityCategory } from "./trainingQualities";

export { getGoalQualityWeights } from "./goalQualityWeights";
export type { GoalSlug } from "./goalQualityWeights";

export { getSportQualityWeights } from "./sportQualityWeights";
export type { SportSlug } from "./sportQualityWeights";

export { mergeTargetVector, alignmentScore } from "./targetVector";
export type { MergeTargetInput } from "./targetVector";

export { qualitiesFromTags } from "./tagToQualityMap";

export { scoreExercise } from "./scoring/scoreExercise";
export type { ScoreExerciseInput } from "./scoring/scoreExercise";

export { SESSION_TEMPLATES, getTemplateForGoalAndDuration } from "./sessionTemplates";
export {
  SESSION_TEMPLATES_V2,
  getSessionTemplateV2,
  resolveSessionTemplateV2,
} from "./sessionTemplatesV2";

export {
  supersetCompatibility,
  pickSupersetPartner,
  getSupersetPairingScore,
  getEffectivePairingCategory,
  getEffectiveFatigueRegions,
  getEffectivePairingFamilies,
  pickBestSupersetPairs,
  hasGripDemand,
} from "./supersetPairing";
export type { PairingInput } from "./supersetPairing";

// Phase 3: Session architecture
export { STIMULUS_PROFILES, getStimulusProfile, getBlockSequenceForStimulus } from "./stimulusProfiles";
export { PRESCRIPTION_STYLES, getPrescriptionStyle } from "./prescriptionStyles";
export { SESSION_TYPES, getSessionType, resolveStimulusForSessionType } from "./sessionTypes";
export { getBlockTemplate, blockSpecsFromStimulus } from "./blockTemplates";
export {
  getDurationTier,
  getMaxBlocksForDuration,
  getMaxExercisesForDuration,
  canAddConditioningOrAccessory,
  preferSupersetsForEfficiency,
  shapeBlockSpecsForDuration,
  getFatigueBudgetForStimulus,
  getNumericFatigueBudget,
  adaptForEnergyLevel,
} from "./sessionShaping";

export { toExerciseWithQualities } from "./adapters";
export type { GeneratorExercise } from "./adapters";

export {
  buildPipelineContext,
  scoreAndRankCandidates,
  consumeExerciseInContext,
  wouldExceedPatternCap,
} from "./pipeline";
export type { PipelineInput, PipelineContext } from "./pipeline";

export type {
  QualityWeightMap,
  SessionTargetVector,
  ExerciseWithQualities,
  TargetVectorInput,
  BlockSpec,
  BlockType,
  BlockFormat,
  SessionTemplate,
  SessionTemplateV2,
  StimulusProfile,
  StimulusProfileSlug,
  SessionType,
  SessionTypeSlug,
  WorkoutBlockTemplate,
  PrescriptionStyle,
  PrescriptionStyleSlug,
  SessionFatigueBudget,
  FatigueBudgetLevel,
  DurationTier,
  EnergyLevel,
  ExerciseScoreBreakdown,
  SupersetCompatibility,
} from "./types";
export type {
  GeneratedWorkout,
  GeneratedBlock,
  GeneratedExerciseSlot,
  GeneratedExercisePrescription,
  ResolvedPrescription,
  WorkoutWithPrescriptions,
} from "./workoutTypes";

// Phase 5: Prescription layer
export { generateWorkoutWithPrescriptions } from "./prescription/generateWorkout";
export { applyPrescriptions } from "./prescription/prescriptionResolver";
export {
  resolveSets,
  resolveReps,
  resolveRest,
} from "./prescription/setRepResolver";
export { scaleSetsByDuration, reduceSetsToFitFatigue } from "./prescription/durationScaling";
export { assignSupersetGroups, formatSupersetRestInstruction } from "./prescription/supersetFormatter";
export { getIntentForStyle } from "./prescription/intentGuidance";
export type { ExerciseInfo, PrescriptionContext } from "./prescription/prescriptionResolver";
export type { ResolverContext } from "./prescription/setRepResolver";

// Phase 4: Selection + scoring engine
export {
  resolveSessionQualities,
  resolveBlockQualities,
  resolveSessionContext,
} from "./scoring/qualityResolution";
export {
  scoreExerciseForSelection,
  scoreAndRankCandidatesForSelection,
} from "./scoring/exerciseScoring";
export type { ScoreExerciseInput as ScoreExerciseForSelectionInput } from "./scoring/exerciseScoring";
export { pairingScore, assembleSupersetPairs } from "./scoring/pairing";
export { noveltyScore } from "./scoring/redundancy";
export {
  createSessionSelectionState,
  exerciseFatigueContribution,
  applyExerciseToState,
  wouldExceedSessionFatigue,
  wouldExceedBlockFatigue,
} from "./scoring/fatigueTracking";
export {
  wouldViolateGuardrail,
  guardrailApproachPenalty,
} from "./scoring/movementBalanceGuardrails";
export {
  filterCandidates,
  filterEquipment,
  filterMovementPattern,
  filterQualityRelevance,
  filterSkillForEnergy,
  filterInjury,
  filterBlockType,
  filterBodyRegion,
} from "./selection/candidateFilters";
export { fillBlock } from "./selection/blockFiller";
export type { FillBlockInput } from "./selection/blockFiller";
export { assembleSession } from "./selection/sessionAssembler";
export type { AssembleSessionInput } from "./selection/sessionAssembler";
export { DEFAULT_SELECTION_CONFIG, getFatigueCostNumber } from "./scoring/scoringConfig";
export type { SelectionConfig } from "./scoring/scoreTypes";
export type {
  WorkoutSelectionInput,
  ResolvedSessionContext,
  DesiredQualityProfile,
  ScoreBreakdown,
  ExerciseCandidateScore,
  SessionSelectionState,
  BlockSelectionResult,
  PairingScore,
} from "./scoring/scoreTypes";

export type {
  SportTrainingDemandRow,
  SportTrainingDemandMap,
  GoalTrainingDemandRow,
  GoalTrainingDemandMap,
  ExerciseQualityScoreRow,
  ExerciseQualityScoreMap,
} from "./dataModels";

// Phase 6: Adaptive weekly planning
export {
  generateAdaptiveWeeklyPlan,
  generateWeeklyPlanWithWorkouts,
  resolveWeeklyDemand,
  allocateWeeklySessions,
  orderSessionsAcrossWeek,
  buildDownstreamInput,
  createEmptyLoadState,
  applySessionToLoadState,
  wouldViolateLoadRule,
  satisfiesStimulusDistribution,
  generateSessionRationale,
  generateWeeklySummary,
  demandLevel,
  hasClimbingDemand,
  hasLowerEccentricDemand,
  isPrimaryHypertrophy,
} from "./weekly";
export type {
  WeeklyPlanningInput,
  WeeklyDemandProfile,
  WeeklySessionIntent,
  WeeklyLoadState,
  WeeklyPlan,
  WeeklyPlannedSession,
  DownstreamGenerationInput,
  WeeklyPlannerConfig,
  StructuralLoadCategory,
  FatigueTier,
} from "./weekly";
export { DEFAULT_WEEKLY_PLANNER_CONFIG } from "./weekly";
export {
  exampleClimbingHypertrophy5Days,
  exampleSkiingHypertrophy4Days,
  exampleGeneralHypertrophy4Days,
  exampleWithPreferredDaysAndEnergy,
} from "./weekly";

export { validateWorkoutAgainstConstraints } from "./validation/workoutValidator";
export type {
  ValidatableWorkout,
  ValidatableBlock,
  ValidatableItem,
  ValidationResult,
  ValidationIssue,
  ValidationIssueType,
} from "./validation/workoutValidator";
