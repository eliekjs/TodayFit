/**
 * Daily "Build My Workout" generation — public API.
 */

export {
  generateWorkoutSession,
  regenerateWorkoutSession,
  filterByHardConstraints,
  scoreExercise,
} from "./dailyGenerator";
export { STUB_EXERCISES } from "./exerciseStub";
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
