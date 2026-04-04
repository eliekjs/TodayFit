/**
 * Alpine within-pool scoring — implemented in snow family (alpine kind).
 */

export {
  addExerciseToAlpineSessionCounts,
  addExerciseToSnowSessionCounts,
  computeAlpineSkiingEmphasisBucket,
  computeAlpineSkiingWithinPoolQualityScore,
  computeSnowSportEmphasisBucket,
  computeSnowSportWithinPoolQualityScore,
  isSignatureAlpineMovement,
  isSignatureSnowSportMovement,
  type AlpineSkiingQualityScoreContext,
  type SnowSportQualityScoreBreakdown,
  type SnowSportQualityScoreContext,
} from "./snowSportFamily/snowSportQualityScoring";
