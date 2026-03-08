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

export { supersetCompatibility, pickSupersetPartner } from "./supersetPairing";

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
export type { GeneratedWorkout, GeneratedBlock, GeneratedExerciseSlot } from "./workoutTypes";

export type {
  SportTrainingDemandRow,
  SportTrainingDemandMap,
  GoalTrainingDemandRow,
  GoalTrainingDemandMap,
  ExerciseQualityScoreRow,
  ExerciseQualityScoreMap,
} from "./dataModels";
