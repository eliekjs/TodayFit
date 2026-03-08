/**
 * Phase 6: Adaptive weekly planning engine.
 * Resolves weekly priorities, allocates session intents, orders across the week,
 * and produces a plan compatible with the daily workout generator.
 */

export {
  generateAdaptiveWeeklyPlan,
  generateWeeklyPlanWithWorkouts,
} from "./weeklyPlanner";
export { resolveWeeklyDemand } from "./weeklyDemandResolution";
export { allocateWeeklySessions } from "./weeklyAllocation";
export {
  orderSessionsAcrossWeek,
  buildDownstreamInput,
} from "./weeklyOrdering";
export {
  createEmptyLoadState,
  applySessionToLoadState,
  wouldViolateLoadRule,
  satisfiesStimulusDistribution,
} from "./weeklyLoadBalancing";
export {
  generateSessionRationale,
  generateWeeklySummary,
} from "./weeklyRationale";
export { demandLevel, hasClimbingDemand, hasLowerEccentricDemand, isPrimaryHypertrophy } from "./weeklyDemandResolution";

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
} from "./weeklyTypes";
export { DEFAULT_WEEKLY_PLANNER_CONFIG } from "./weeklyTypes";
export {
  exampleClimbingHypertrophy5Days,
  exampleSkiingHypertrophy4Days,
  exampleGeneralHypertrophy4Days,
  exampleWithPreferredDaysAndEnergy,
} from "./weeklyPlanExamples";
