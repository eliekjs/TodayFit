/**
 * Session generation — public API. Used by both Build My Workout and Sports Prep.
 */

export {
  generateWorkoutSession,
  regenerateWorkoutSession,
  filterByHardConstraints,
  scoreExercise,
} from "./dailyGenerator";
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
