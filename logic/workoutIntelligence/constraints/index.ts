/**
 * Filter-to-workout rules engine.
 * Resolves input → constraints, provides eligibility helpers, validates final workout.
 */

export { resolveWorkoutConstraints } from "./resolveWorkoutConstraints";
export {
  isExerciseAllowedByInjuries,
  matchesBodyPartFocus,
  satisfiesBlockRequirement,
  canPairInSuperset,
  selectCooldownMobilityExercises,
  deriveMovementFamily,
} from "./eligibilityHelpers";
export { validateWorkoutAgainstConstraints } from "./validateWorkout";
export type { ValidationResult } from "./validateWorkout";

export type {
  ResolvedWorkoutConstraints,
  WorkoutConstraint,
  MovementFamily,
  JointStressTag,
  HardExcludeRule,
  SoftCautionRule,
  HardIncludeRule,
  RequiredFinishersRule,
  SupersetPairingRule,
  MovementDistributionRule,
} from "./constraintTypes";
