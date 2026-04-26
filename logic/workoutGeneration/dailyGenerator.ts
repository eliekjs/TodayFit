/**
 * Session generation engine. Used by both Build My Workout and Sports Prep.
 * The difference between modes is the type of filters that supply the input
 * (session-focused vs sport/plan-focused); both can generate one day or a week.
 */

import type {
  Exercise,
  GenerateWorkoutInput,
  WorkoutSession,
  WorkoutBlock,
  WorkoutItem,
  ScoringDebug,
  RegenerateMode,
  BlockType,
  BlockFormat,
  PrimaryGoal,
  UserLevel,
} from "./types";
import {
  isWarmupEligibleEquipment,
  isCooldownEligibleEquipment,
  WARMUP_CARDIO_POSITION,
  WARMUP_ITEM_MAX_SECONDS,
  normalizeInjuryKey,
  MAX_SAME_PATTERN_PER_SESSION,
  MAX_CONSECUTIVE_SAME_CLUSTER,
  MIN_MOVEMENT_CATEGORIES,
  BALANCE_CATEGORY_PATTERNS,
  getSimilarExerciseClusterId,
  isBlockedExercise,
} from "../../lib/workoutRules";
import {
  balanceBonusForExercise,
  getBalanceState,
  getPatternsToPrefer,
} from "../../lib/generation/movementBalance";
import {
  getFatigueState,
  fatiguePenaltyForExercise,
  type FatigueState,
} from "../../lib/generation/fatigueRules";
import {
  getGoalRules,
  scaleSetsByEnergy,
  getConditioningDurationMinutes,
  getConditioningIntervalStructure,
  getNonZone2ConditioningIntervalStructure,
  getConditioningStructureByIntent,
  getExplosiveConditioningStructure,
  getHighIntensityConditioningStructure,
  getSprintBurstConditioningStructure,
  getRepBasedHighIntensityConditioningStructure,
  HIGH_INTENSITY_CONDITIONING_IDS,
  REP_BASED_HIGH_INTENSITY_CONDITIONING_IDS,
  type EnergyLevel,
} from "../../lib/generation/prescriptionRules";
import { getBestSubstitute } from "../../lib/generation/exerciseSubstitution";
import { resolveWorkoutConstraints } from "../workoutIntelligence/constraints/resolveWorkoutConstraints";
import type { ResolvedWorkoutConstraints } from "../workoutIntelligence/constraints/constraintTypes";
import {
  selectCooldownMobilityExercises as selectOntologyCooldown,
  getPreferredCooldownTargetsFromFamilies,
  isStretchOnlyEligible,
  MAIN_WORK_EXCLUDED_ROLES,
} from "./cooldownSelection";
import { pickBestSupersetPairs, supersetCompatibility } from "../workoutIntelligence/supersetPairing";
import {
  attachWorkoutLevelScoringContext,
  computeCreativeSelectionBonus,
  computeCreativeSelectionBonusBreakdown,
  computeWorkoutLevelPreferenceScore,
  computeWorkoutLevelPreferenceScoreBreakdown,
  exerciseBlockedByCreativePreference,
  exerciseMatchesWorkoutTier,
  exerciseToWorkoutLevelExtendedSource,
  getWorkoutLevelScoringContext,
  inferWorkoutLevelsWithExplanation,
  isComplexSkillLiftForNonAdvanced,
  isHardBlockedForBeginnerTier,
  isWorkoutLevelScoreDebugEnabled,
} from "../../lib/workoutLevel";
import {
  isExerciseAllowedByInjuries,
  matchesBodyPartFocus,
} from "../workoutIntelligence/constraints/eligibilityHelpers";
import { toExerciseWithQualities, type GeneratorExercise } from "../workoutIntelligence/adapters";
import { mergeTargetVector, alignmentScore } from "../workoutIntelligence/targetVector";
import type { SessionTargetVector } from "../workoutIntelligence/types";
import {
  validateWorkoutAgainstConstraints,
  type ValidationResult,
} from "../workoutIntelligence/validation/workoutValidator";
import {
  computeOntologyScoreComponents,
  getEffectiveFatigueRegions,
  getPreferredWarmupTargetsFromFocus,
  mergeSportBiasIntoWarmupFocusBodyParts,
  exerciseWarmupTargetsOverlap,
} from "./ontologyScoring";
import { buildHistoryContextFromLegacy, type TrainingHistoryContext } from "./historyTypes";
import {
  computeHistoryScoreComponents,
  getEffectiveRecentIds,
} from "./historyScoring";
import { getRecommendation } from "./recommendationLayer";
import { applyRecommendationToPrescription } from "./prescriptionHistory";
import { getLegacyMovementPattern } from "../../lib/ontology/legacyMapping";
import {
  getExerciseTagsForGoalSubFocuses,
  resolveSubFocusProfile,
  getStrengthIntentSlugs,
  STRENGTH_INTENT_SLUGS,
  STRENGTH_OVERLAY_SLUGS,
  exerciseHasStrengthSubFocusSlug,
  type SubFocusProfile,
} from "../../data/goalSubFocus";
import { CALISTHENICS_STYLE_STRENGTH_SUB_SLUGS } from "../../data/goalSubFocus/strengthSubFocus";
import {
  exerciseMatchesGoalSubFocusSlugUnified,
  exerciseMatchesHypertrophySubFocusSlug,
  subFocusSlugsForGuarantee,
} from "./subFocusSlugMatch";
import {
  getPrimaryConditioningIntent,
  getConditioningIntentSlugs,
  filterPoolByDirectSubFocus,
  filterPoolByOverlay,
  exerciseHasSubFocusSlug,
} from "../../data/goalSubFocus/conditioningSubFocus";
import {
  resolveConditioningIntentFormatFromIntent,
  type ConditioningIntentFormat,
} from "./conditioningFormatResolver";
import { blockFormatForCardioHint, buildBlockIntentProfile } from "./blockIntentProfile";
import {
  getCanonicalSportSlug,
  getExerciseTagsForSubFocuses,
} from "../../data/sportSubFocus";
import { hashString } from "../../lib/dailyGeneratorAdapter";
import {
  logPruningGateToConsole,
  mergePruningGateFlags,
  resolveGatedExercisePoolForGeneration,
} from "./pruningGatePool";
import {
  applyConditioningDurationScaleToBlocks,
  buildNormalizedSportProfile,
  buildSportProfileMappingDebug,
  computeSportProfileScoreComponents,
  formatStructureBiasLabel,
  getSportAdjustedExercisePool,
  loadSportProfileForSession,
  sportProfileBiasedTowardConditioning,
  sportProfileConditioningPickScore,
  type SportProfileAppliedSnapshot,
} from "./sportProfileEngine";
import type { HikingSessionEnforcementSnapshot, SportPatternSlotRule } from "./sportPatternTransfer/types";
import { HIKING_SUPPORT_COVERAGE_CATEGORIES } from "./sportPatternTransfer/hikingBackpackingRules";
import {
  buildHikingTransferDebug,
  computeHikingPatternScoreAdjustment,
  evaluateHikingCoverageForBlocks,
  findBestHikingMainWorkReplacement,
  findBestHikingReplacement,
  gatePoolForHikingSlot,
  getHikingSlotRuleForBlockType,
  hikingPatternTransferApplies,
  isValidHikingMainWorkExercise,
} from "./sportPatternTransfer/hikingSession";
import { isHikingConditioningExercise } from "./sportPatternTransfer/hikingExerciseCategories";
import {
  addExerciseToHikingSessionCounts,
  computeHikingEmphasisBucket,
  computeHikingWithinPoolQualityScore,
  type HikingQualityScoreContext,
} from "./sportPatternTransfer/hikingQualityScoring";
import {
  buildTrailRunningTransferDebug,
  computeTrailRunningPatternScoreAdjustment,
  evaluateTrailCoverageForBlocks,
  findBestTrailMainWorkReplacement,
  findBestTrailRunningReplacement,
  gatePoolForTrailRunningSlot,
  getTrailRunningSlotRuleForBlockType,
  trailRunningPatternTransferApplies,
  isValidTrailMainWorkExercise,
} from "./sportPatternTransfer/trailRunningSession";
import {
  addExerciseToRoadRunningSessionCounts,
  buildRoadRunningTransferDebug,
  computeRoadRunningEmphasisBucket,
  computeRoadRunningPatternScoreAdjustment,
  computeRoadRunningWithinPoolQualityScore,
  evaluateRoadCoverageForBlocks,
  findBestRoadMainWorkReplacement,
  findBestRoadRunningReplacement,
  gatePoolForRoadRunningSlot,
  getRoadRunningSlotRuleForBlockType,
  isRoadRunningConditioningExercise,
  isValidRoadMainWorkExercise,
  roadRunningPatternTransferApplies,
} from "./sportPatternTransfer/roadRunningSession";
import { ROAD_SUPPORT_COVERAGE_CATEGORIES } from "./sportPatternTransfer/runningFamily/roadRunningRules";
import { isTrailRunningConditioningExercise } from "./sportPatternTransfer/trailRunningExerciseCategories";
import {
  addExerciseToTrailRunningSessionCounts,
  computeTrailRunningEmphasisBucket,
  computeTrailRunningWithinPoolQualityScore,
  isTrailForwardSteppingLungePattern,
  type TrailRunningQualityScoreContext,
} from "./sportPatternTransfer/trailRunningQualityScoring";
import { TRAIL_SUPPORT_COVERAGE_CATEGORIES } from "./sportPatternTransfer/trailRunningRules";
import {
  addExerciseToSoccerSessionCounts,
  buildSoccerTransferDebug,
  computeSoccerEmphasisBucket,
  computeSoccerPatternScoreAdjustment,
  computeSoccerWithinPoolQualityScore,
  evaluateSoccerCoverageForBlocks,
  findBestSoccerMainWorkReplacement,
  findBestSoccerReplacement,
  gatePoolForSoccerSlot,
  getSoccerSlotRuleForBlockType,
  isSoccerConditioningExercise,
  isValidSoccerMainWorkExercise,
  soccerPatternTransferApplies,
} from "./sportPatternTransfer/fieldSportFamily/soccerSession";
import { SOCCER_SUPPORT_COVERAGE_CATEGORIES } from "./sportPatternTransfer/fieldSportFamily/soccerRules";
import {
  type SoccerQualityScoreContext,
} from "./sportPatternTransfer/fieldSportFamily/soccerQualityScoring";
import { computeAlpineSkiingPatternScoreAdjustment, primarySportIsAlpineSkiing } from "./sportPatternTransfer/alpineSkiingSession";
import {
  applySnowUpstreamAccessoryPairsCoverage,
  applySnowUpstreamMainLiftsCoverage,
  buildSnowSportTransferDebug,
  buildSportCoverageContext,
  evaluateSnowSportCoverageForBlocks,
  findBestSnowSportMainWorkReplacement,
  findBestSnowSportReplacement,
  gatePoolForSnowSportSlot,
  getSnowSportSlotRule,
  resolveSnowSportKind,
  snowSportBodyFocusAllows,
} from "./sportPatternTransfer/snowSportFamily/snowSportSession";
import {
  applyRockUpstreamAccessoryPairsCoverage,
  applyRockUpstreamMainLiftsCoverage,
  computeRockClimbingPatternScoreAdjustment,
  gatePoolForRockClimbingSlot,
  getRockClimbingSlotRule,
  primarySportIsRockClimbing,
  rockClimbingPatternTransferApplies,
} from "./sportPatternTransfer/rockClimbingSession";
import {
  addExerciseToRockSessionCounts,
  computeRockClimbingEmphasisBucket,
  computeRockClimbingWithinPoolQualityScore,
} from "./sportPatternTransfer/rockClimbingQualityScoring";
import {
  exerciseMatchesAnyAlpineSkiingCategory,
  exerciseMatchesAnySnowSportCategory,
  isAlpineSkiingConditioningExercise,
  isSnowSportConditioningExercise,
} from "./sportPatternTransfer/alpineSkiingExerciseCategories";
import {
  addExerciseToAlpineSessionCounts,
  computeAlpineSkiingWithinPoolQualityScore,
  computeSnowSportEmphasisBucket,
  type AlpineSkiingQualityScoreContext,
} from "./sportPatternTransfer/alpineSkiingQualityScoring";
import {
  ALPINE_ECCENTRIC_CONTROL_CATEGORIES,
  ALPINE_MAIN_ECCENTRIC_OR_DECEL_CATEGORIES,
  ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES,
  ALPINE_LATERAL_STABILITY_CATEGORIES,
} from "./sportPatternTransfer/alpineSkiingRules";
import {
  summarizeHikingSportPatternSession,
  summarizeRoadRunningSportPatternSession,
  summarizeSoccerSportPatternSession,
  summarizeRockClimbingSportPatternSession,
  summarizeSnowSportPatternSession,
  summarizeTrailRunningSportPatternSession,
} from "./sportPattern/sportPatternSessionAudit";
import {
  genericSelectHypertrophyChosen,
  genericSelectStrengthMainLifts,
  sportMainSelector,
} from "./mainSelectors";
import type { AlpinePickEnvironment, MainSelectorSessionTrace, ScoreExerciseLike } from "./mainSelectors/types";
import { sessionIntentContractForSportSlug } from "./sessionIntentContract";
import type { SportPatternGateResult } from "./sportPattern/framework/types";
import { sportPatternScoreModeFromPoolMode } from "./sportPattern/framework";
import {
  alpineRequiredCategoryHits,
  computeAlpineAnchorSnapshot,
  computeAlpineStrictVsFallbackShares,
  createIntentSurvivalCollector,
  gateResultToTierCounts,
  type IntentSurvivalCandidateBreakdown,
  type IntentSurvivalCollector,
  type IntentSurvivalRepairChange,
  type IntentSurvivalSelectionPass,
} from "./intentSurvivalDebug";

/** True when primary sport is any mountain snow family member and body-focus allows snow prep. */
function snowMountainSessionApplies(input: GenerateWorkoutInput): boolean {
  const k = resolveSnowSportKind(input);
  return k != null && snowSportBodyFocusAllows(input);
}

// --- Avoid tags that imply overhead / hanging / shoulder extension (safety) ---
const OVERHEAD_HANGING_PATTERNS = new Set([
  "overhead",
  "hanging",
  "shoulder_extension",
  "shoulder_overhead",
  "grip_hanging",
]);
const EXERCISE_IDS_OVERHEAD_OR_HANGING = new Set([
  "pullup",
  "oh_press",
  "db_shoulder_press",
  "dips",
]);

const STRENGTH_INTENT_SET = new Set<string>([...STRENGTH_INTENT_SLUGS]);
const STRENGTH_OVERLAY_SET = new Set<string>([...STRENGTH_OVERLAY_SLUGS]);
const CALISTHENICS_STRENGTH_INTENT_SET = new Set<string>([...CALISTHENICS_STYLE_STRENGTH_SUB_SLUGS]);
/** Region-only conditioning sub-focuses; ranked intents (intervals, hills, …) should dominate scoring and finishers. */
const CONDITIONING_SUB_FOCUS_OVERLAYS = new Set(["upper", "lower", "core", "full_body"]);

function normalizeWeekMainLiftId(id: string): string {
  return id.toLowerCase().replace(/\s/g, "_");
}

/** Exclude main compounds already used this week; fall back if the pool would become empty. */
function applyWeekMainLiftExclusion(pool: Exercise[], input: GenerateWorkoutInput): Exercise[] {
  const used = input.week_main_strength_lift_ids_used;
  if (!used?.length) return pool;
  const excludedIds = new Set(used.map(normalizeWeekMainLiftId));
  const filteredById = pool.filter((e) => !excludedIds.has(normalizeWeekMainLiftId(e.id)));
  if (filteredById.length === 0) return pool;

  // Cluster-level weekly diversity: avoid repeating mapped "similar family" lifts (e.g. deadlift family)
  // only when alternatives remain after exact ID exclusion.
  const excludedClusters = new Set(
    used
      .map((id) => {
        const idNorm = normalizeWeekMainLiftId(id);
        const cluster = normalizeWeekMainLiftId(getSimilarExerciseClusterId({ id }));
        return cluster !== idNorm ? cluster : null;
      })
      .filter((cluster): cluster is string => Boolean(cluster))
  );
  if (excludedClusters.size === 0) return filteredById;

  const filteredByCluster = filteredById.filter((e) => {
    const cluster = normalizeWeekMainLiftId(getSimilarExerciseClusterId(e));
    return !excludedClusters.has(cluster);
  });
  return filteredByCluster.length > 0 ? filteredByCluster : filteredById;
}

/** IDs from primary compound blocks: main_strength, main_hypertrophy, and power (rolling weekly diversity). */
function exerciseHasOverheadOrHanging(e: Exercise, avoidTags: string[]): boolean {
  if (!avoidTags.length) return false;
  const avoid = new Set(avoidTags.map((t) => t.toLowerCase().replace(/\s/g, "_")));
  const hasOverheadAvoid = [...OVERHEAD_HANGING_PATTERNS].some((p) => avoid.has(p));
  if (!hasOverheadAvoid) return false;
  if (EXERCISE_IDS_OVERHEAD_OR_HANGING.has(e.id)) return true;
  const jointStress = (e.joint_stress_tags?.length ? e.joint_stress_tags : e.tags.joint_stress) ?? [];
  if (jointStress.some((s) => s === "shoulder_overhead" || s === "grip_hanging")) return true;
  return false;
}

// --- Seeded RNG (deterministic) ---
function createSeededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function shuffleWithSeed<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Map generator input to WorkoutSelectionInput for resolveWorkoutConstraints (Phase 6). */
function inputToSelectionInput(input: GenerateWorkoutInput): Parameters<typeof resolveWorkoutConstraints>[0] {
  return {
    primary_goal: input.primary_goal,
    secondary_goals: input.secondary_goals?.map((g) => g.toLowerCase().replace(/\s/g, "_")) ?? [],
    sports: input.sport_slugs,
    available_equipment: input.available_equipment,
    duration_minutes: input.duration_minutes,
    energy_level: input.energy_level,
    injuries_or_limitations: input.injuries_or_constraints ?? [],
    body_region_focus: input.focus_body_parts?.map((f) => f.toLowerCase().replace(/\s/g, "_")) ?? [],
  };
}

/** Collect movement families from main-work blocks for ontology-aware cooldown targeting. */
function getMainWorkFamiliesFromBlocks(blocks: WorkoutBlock[], exercises: Exercise[]): string[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const mainTypes = new Set(["main_strength", "main_hypertrophy", "power", "accessory"]);
  const families = new Set<string>();
  for (const block of blocks) {
    if (!mainTypes.has(block.block_type)) continue;
    for (const item of block.items) {
      const ex = byId.get(item.exercise_id);
      if (!ex) continue;
      const fams = getEffectiveFamiliesForExercise(ex);
      fams.forEach((f) => families.add(f));
    }
  }
  return [...families];
}

/** Effective movement families for one exercise (ontology-first; fallback from pattern + muscles for generator Exercise). */
function getEffectiveFamiliesForExercise(e: Exercise): string[] {
  const primary = e.primary_movement_family?.toLowerCase().replace(/\s/g, "_");
  if (primary) {
    const secondaries = (e.secondary_movement_families ?? []).map((s) => s.toLowerCase().replace(/\s/g, "_"));
    return [primary, ...secondaries].filter((x, i, a) => a.indexOf(x) === i);
  }
  const pattern = (e.movement_pattern ?? "").toLowerCase();
  const muscles = new Set((e.muscle_groups ?? []).map((m) => m.toLowerCase()));
  if (pattern === "push" || muscles.has("chest") || muscles.has("triceps") || muscles.has("push") || muscles.has("shoulders")) return ["upper_push"];
  if (pattern === "pull" || muscles.has("back") || muscles.has("biceps") || muscles.has("pull") || muscles.has("lats")) return ["upper_pull"];
  if (pattern === "squat" || pattern === "hinge" || pattern === "locomotion") {
    if (muscles.has("legs") || muscles.has("quads") || muscles.has("glutes") || muscles.has("hamstrings")) return ["lower_body"];
    if (muscles.has("core")) return ["core"];
    return ["lower_body"];
  }
  if (pattern === "carry") return muscles.has("core") && !muscles.has("legs") ? ["core"] : ["lower_body"];
  if (pattern === "rotate") return ["core"];
  return ["lower_body"];
}

/**
 * When the user sets a body-part focus, mobility/recovery entries must match those movement
 * families or be core/trunk prep (common on upper/lower days). Conditioning stays unrestricted
 * so cardio/HIIT blocks still have options.
 */
function mobilityRecoveryPassesBodyFocus(
  families: string[],
  allowedFamilies: NonNullable<ResolvedWorkoutConstraints["allowed_movement_families"]>
): boolean {
  if (families.some((f) => allowedFamilies.some((af) => af === f))) return true;
  const hasNonCoreFocus = allowedFamilies.some((f) => f !== "core");
  return hasNonCoreFocus && families.includes("core");
}

/**
 * Adapter so eligibilityHelpers (which expect top-level joint_stress/contraindications) work with
 * generator Exercise (which may have only tags.joint_stress / tags.contraindications).
 */
function toConstraintEligibilityShape(e: Exercise): Exercise & { joint_stress?: string[]; contraindications?: string[] } {
  return {
    ...e,
    joint_stress: e.joint_stress_tags?.length ? e.joint_stress_tags : (e.tags?.joint_stress ?? []),
    contraindications: e.contraindication_tags?.length ? e.contraindication_tags : (e.tags?.contraindications ?? []),
  };
}

/**
 * Filter pool by resolved constraints (single source of truth with validator).
 * Injury/body-part rules come from constraints; equipment and energy stay in filterByHardConstraints.
 * Conditioning exercises stay in the pool on body-part days (main conditioning / cardio blocks).
 * Mobility and recovery must match the day's movement families or qualify as core prep on
 * upper/lower-focused sessions (activation aligns with the selected body region).
 */
export function filterByConstraintsForPool(
  exercises: Exercise[],
  constraints: ResolvedWorkoutConstraints
): Exercise[] {
  const allowedFamilies = constraints.allowed_movement_families;
  const hasBodyFocus = allowedFamilies != null && allowedFamilies.length > 0;

  return exercises.filter((e) => {
    const shape = toConstraintEligibilityShape(e);
    if (!isExerciseAllowedByInjuries(shape, constraints)) return false;
    if (!hasBodyFocus) return true;
    if (e.modality === "conditioning") return true;
    if (e.modality === "mobility" || e.modality === "recovery") {
      const families = getEffectiveFamiliesForExercise(e);
      return mobilityRecoveryPassesBodyFocus(families, allowedFamilies!);
    }
    return matchesBodyPartFocus(toExerciseWithQualities(e as GeneratorExercise), constraints);
  });
}

function isRingSpecificExercise(e: Exercise): boolean {
  const id = (e.id ?? "").toLowerCase();
  const name = (e.name ?? "").toLowerCase();
  return /(^|_)rings?(_|$)/.test(id) || /\brings?\b/.test(name);
}

function isRingStraddleExercise(e: Exercise): boolean {
  const id = (e.id ?? "").toLowerCase();
  const name = (e.name ?? "").toLowerCase();
  if (id.includes("ring_straddle")) return true;
  return isRingSpecificExercise(e) && (id.includes("straddle") || name.includes("straddle"));
}

function isComplexCatalogVariantForNonAdvanced(e: Exercise): boolean {
  const id = (e.id ?? "").toLowerCase();
  return id.startsWith("ff_") || id.startsWith("ota_");
}

function ringStraddleAllowedForInput(input: GenerateWorkoutInput): boolean {
  const userLevel = input.style_prefs?.user_level ?? "intermediate";
  const creativeOn = input.style_prefs?.include_creative_variations === true;
  const advancedCreative = userLevel === "advanced" && creativeOn;
  const goalSpecific = input.primary_goal === "calisthenics";
  const sportSpecific = (input.sport_slugs ?? []).some((s) => s === "rock_climbing");
  return advancedCreative || goalSpecific || sportSpecific;
}

// --- Hard constraints: equipment, style avoid_tags, energy. Injury and body-part are in resolveWorkoutConstraints + filterByConstraintsForPool (single source of truth with validator). ---
export function filterByHardConstraints(
  exercises: Exercise[],
  input: GenerateWorkoutInput
): Exercise[] {
  const equipmentSet = new Set(
    input.available_equipment.map((eq) => eq.toLowerCase().replace(/\s/g, "_"))
  );
  const avoidTags = input.style_prefs?.avoid_tags ?? [];
  const userWorkoutTier = input.style_prefs?.user_level ?? "intermediate";
  const includeCreativeVariations = input.style_prefs?.include_creative_variations === true;
  const nonAdvancedTier = userWorkoutTier !== "advanced";
  const jointStressFor = (e: Exercise) =>
    (e.joint_stress_tags?.length ? e.joint_stress_tags : e.tags?.joint_stress) ?? [];

  return exercises.filter((e) => {
    const hasRings = equipmentSet.has("rings");
    const ringStraddleAllowed = isRingStraddleExercise(e) && ringStraddleAllowedForInput(input);
    if (isBlockedExercise({ id: e.id, name: e.name })) return false;
    if (!exerciseMatchesWorkoutTier(e.workout_level_tags, userWorkoutTier)) return false;
    if (userWorkoutTier === "beginner" && isHardBlockedForBeginnerTier(e)) return false;
    if (
      nonAdvancedTier &&
      isComplexSkillLiftForNonAdvanced({
        id: e.id,
        name: e.name,
        tags: e.tags.attribute_tags,
        movementPattern: e.movement_pattern,
        modality: e.modality,
      })
    ) {
      return false;
    }
    if (nonAdvancedTier && isComplexCatalogVariantForNonAdvanced(e)) return false;
    if (exerciseBlockedByCreativePreference(e.creative_variation, includeCreativeVariations) && !ringStraddleAllowed)
      return false;
    if (isRingSpecificExercise(e) && !hasRings) return false;
    if (isRingStraddleExercise(e) && !ringStraddleAllowed) return false;
    // Equipment: every required piece must be available
    const required = e.equipment_required.map((eq) => eq.toLowerCase().replace(/\s/g, "_"));
    if (required.some((eq) => !equipmentSet.has(eq))) return false;

    // Style prefs: avoid certain joint-stress patterns (e.g. from upcoming events)
    const jointStress = jointStressFor(e);
    for (const avoid of avoidTags) {
      const a = avoid.toLowerCase().replace(/\s/g, "_");
      if (jointStress.some((t) => t.toLowerCase().replace(/\s/g, "_") === a)) return false;
    }
    if (exerciseHasOverheadOrHanging(e, avoidTags)) return false;

    // Energy: low energy → exclude exercises tagged only for high
    if (input.energy_level === "low") {
      const energyFit = e.tags.energy_fit ?? ["low", "medium", "high"];
      if (energyFit.length === 1 && energyFit[0] === "high") return false;
    }

    return true;
  });
}

/**
 * First hard-constraint violation for an exercise (audit / dev). Order matches `filterByHardConstraints`.
 */
export function getHardConstraintRejectReason(
  e: Exercise,
  input: GenerateWorkoutInput
): string | null {
  const equipmentSet = new Set(
    input.available_equipment.map((eq) => eq.toLowerCase().replace(/\s/g, "_"))
  );
  const avoidTags = input.style_prefs?.avoid_tags ?? [];
  const userWorkoutTier = input.style_prefs?.user_level ?? "intermediate";
  const includeCreativeVariations = input.style_prefs?.include_creative_variations === true;
  const nonAdvancedTier = userWorkoutTier !== "advanced";
  const hasRings = equipmentSet.has("rings");
  const ringStraddleAllowed = isRingStraddleExercise(e) && ringStraddleAllowedForInput(input);
  const jointStressFor = (ex: Exercise) =>
    (ex.joint_stress_tags?.length ? ex.joint_stress_tags : ex.tags?.joint_stress) ?? [];

  if (isBlockedExercise({ id: e.id, name: e.name })) return "blocked_exercise_id";
  if (!exerciseMatchesWorkoutTier(e.workout_level_tags, userWorkoutTier)) return "workout_tier_mismatch";
  if (userWorkoutTier === "beginner" && isHardBlockedForBeginnerTier(e)) return "beginner_tier_hard_gate";
  if (
    nonAdvancedTier &&
    isComplexSkillLiftForNonAdvanced({
      id: e.id,
      name: e.name,
      tags: e.tags.attribute_tags,
      movementPattern: e.movement_pattern,
      modality: e.modality,
    })
  ) {
    return "complex_skill_lift_non_advanced";
  }
  if (nonAdvancedTier && isComplexCatalogVariantForNonAdvanced(e)) {
    return "complex_catalog_variant_non_advanced";
  }
  if (exerciseBlockedByCreativePreference(e.creative_variation, includeCreativeVariations) && !ringStraddleAllowed)
    return "creative_variation_excluded";
  if (isRingSpecificExercise(e) && !hasRings) return "ring_equipment_required";
  if (isRingStraddleExercise(e) && !ringStraddleAllowed) return "ring_straddle_restricted";
  const required = e.equipment_required.map((eq) => eq.toLowerCase().replace(/\s/g, "_"));
  if (required.some((eq) => !equipmentSet.has(eq))) return "equipment_unavailable";
  const jointStress = jointStressFor(e);
  for (const avoid of avoidTags) {
    const a = avoid.toLowerCase().replace(/\s/g, "_");
    if (jointStress.some((t) => t.toLowerCase().replace(/\s/g, "_") === a)) return `avoid_tag_joint_stress:${a}`;
  }
  if (exerciseHasOverheadOrHanging(e, avoidTags)) return "overhead_or_hanging_avoided";
  if (input.energy_level === "low") {
    const energyFit = e.tags.energy_fit ?? ["low", "medium", "high"];
    if (energyFit.length === 1 && energyFit[0] === "high") return "energy_high_only_on_low_energy_day";
  }
  return null;
}

// --- Scoring weights ---
const WEIGHT_PRIMARY_GOAL = 3.0;
const WEIGHT_SECONDARY_GOAL = 1.5;
const WEIGHT_TERTIARY = 1.0;
const WEIGHT_BODY_PART = 1.5;
const WEIGHT_ENERGY_FIT = 1.0;
/** Max contribution when exercise qualities align with merged session target vector (0–1 alignment). */
const WEIGHT_QUALITY_ALIGNMENT = 6;

/** Generic scorer terms (goal, ontology, history, body-part nudges, …) multiply by this for alpine main slots when reduced surface is on. */
const ALPINE_MAIN_GENERIC_SCORING_SCALE = 0.12;
/** Bonus when `sport_tags` matches user's primary sport (was ~2; raised for sport-tied priority). */
const SPORT_TAG_MATCH_PRIMARY = 9;
const SPORT_TAG_MATCH_SECONDARY = 5;
/** When sports present: dampen pure goal-tag score so sport-tagged exercises can win (multiplier on goalScore). */
const GOAL_DAMPEN_MAX_WITH_SPORT = 0.28;

function shouldUseSessionTargetVector(input: GenerateWorkoutInput): boolean {
  if (input.sport_slugs?.length) return true;
  const sq = input.session_target_qualities;
  if (sq && Object.keys(sq).length > 0) return true;
  const gsf = input.goal_sub_focus;
  if (gsf && Object.keys(gsf).length > 0) {
    return Object.values(gsf).some((arr) => (arr?.length ?? 0) > 0);
  }
  return false;
}

/**
 * Merged goal + sport + sub-focus + optional weekly session qualities; used for alignment scoring.
 * When `sport_slugs` are set but `sport_sub_focus` is empty, `mergeTargetVector` still applies
 * per-sport quality curves via `getSportQualityWeights` (not only sub-focus tags).
 */
export function buildSessionTargetVectorFromInput(input: GenerateWorkoutInput): SessionTargetVector {
  return mergeTargetVector({
    primary_goal: input.primary_goal,
    secondary_goals: input.secondary_goals,
    sport_slugs: input.sport_slugs,
    sport_sub_focus: input.sport_sub_focus,
    goal_sub_focus: input.goal_sub_focus,
    goal_sub_focus_weights: input.goal_sub_focus_weights,
    goal_weights: input.goal_weights,
    sport_weight: input.sport_weight,
    session_target_qualities: input.session_target_qualities,
    session_target_qualities_weight: input.session_target_qualities_weight,
  });
}

function goalToTags(goal: string): string[] {
  const g = goal.toLowerCase().replace(/\s/g, "_");
  const map: Record<string, string[]> = {
    strength: ["strength"],
    power: ["power"],
    hypertrophy: ["hypertrophy"],
    body_recomp: ["hypertrophy", "strength"],
    endurance: ["endurance"],
    conditioning: ["conditioning"],
    mobility: ["mobility"],
    recovery: ["recovery"],
    athletic_performance: ["athleticism", "power"],
    calisthenics: ["calisthenics", "strength"],
  };
  return map[g] ?? [g];
}

/** Normalize tag or muscle string to slug for sub-focus tag matching (lowercase, spaces to underscore). */
function tagToSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s/g, "_");
}

function getSelectedHypertrophySubFocusRanked(input: GenerateWorkoutInput): { slugs: string[]; weights: number[] } {
  const ranked =
    input.goal_sub_focus?.muscle ??
    input.goal_sub_focus?.hypertrophy ??
    [];
  const weights =
    input.goal_sub_focus_weights?.muscle ??
    input.goal_sub_focus_weights?.hypertrophy ??
    [];
  const n = ranked.length || 1;
  return {
    slugs: ranked,
    weights: ranked.map((_, i) => weights[i] ?? 1 / n),
  };
}

function hasConditioningEnduranceIntentSubFocus(input: GenerateWorkoutInput): boolean {
  const gsf = input.goal_sub_focus;
  if (!gsf) return false;
  for (const key of ["conditioning", "endurance"] as const) {
    const slugs = gsf[key];
    if (slugs?.some((s) => !CONDITIONING_SUB_FOCUS_OVERLAYS.has(s))) return true;
  }
  return false;
}

/** Build preferred tag weights from goal_sub_focus and sport_sub_focus input. Used for sub-focus tag-based scoring. Uses rank-based weights when goal_sub_focus_weights provided. */
function buildPreferredTagWeightsFromSubFocus(input: GenerateWorkoutInput): Map<string, number> {
  const out = new Map<string, number>();
  const goalSubFocus = input.goal_sub_focus;
  const goalSubFocusWeights = input.goal_sub_focus_weights;
  if (goalSubFocus && Object.keys(goalSubFocus).length > 0) {
    for (const [goalSlug, subFocusSlugs] of Object.entries(goalSubFocus)) {
      if (!subFocusSlugs?.length) continue;
      const weights = goalSubFocusWeights?.[goalSlug];
      const entries = getExerciseTagsForGoalSubFocuses(goalSlug, subFocusSlugs, weights);
      for (const { tag_slug, weight } of entries) {
        const slug = tagToSlug(tag_slug);
        out.set(slug, (out.get(slug) ?? 0) + weight);
      }
    }
  }
  const sportSubFocus = input.sport_sub_focus;
  if (sportSubFocus && Object.keys(sportSubFocus).length > 0) {
    for (const [sportSlug, subFocusSlugs] of Object.entries(sportSubFocus)) {
      if (!subFocusSlugs?.length) continue;
      const entries = getExerciseTagsForSubFocuses(sportSlug, subFocusSlugs);
      for (const { tag_slug, weight } of entries) {
        const slug = tagToSlug(tag_slug);
        out.set(slug, (out.get(slug) ?? 0) + weight);
      }
    }
  }
  return out;
}

/** Collect all tag-like slugs from an exercise for sub-focus matching (goal_tags, sport_tags, stimulus, attribute_tags, muscles, pattern). */
function getExerciseTagSlugs(exercise: Exercise): Set<string> {
  const slugs = new Set<string>();
  const add = (s: string) => slugs.add(tagToSlug(s));
  for (const t of exercise.tags.goal_tags ?? []) add(t);
  for (const t of exercise.tags.sport_tags ?? []) add(t);
  for (const t of exercise.tags.stimulus ?? []) add(t);
  for (const t of exercise.tags.attribute_tags ?? []) add(t);
  for (const m of exercise.muscle_groups ?? []) add(m);
  if (exercise.movement_pattern) add(exercise.movement_pattern);
  const pairing = (exercise.pairing_category ?? "").trim();
  if (pairing) add(pairing);
  return slugs;
}

/** Map focus_body_parts to canonical muscle slugs (ExRx-style; for body-part scoring and primary-match bonus). */
function focusBodyPartToMuscles(focus: string): string[] {
  const f = focus.toLowerCase().replace(/\s/g, "_");
  if (f === "upper_push") return ["chest", "triceps", "shoulders"];
  if (f === "upper_pull") return ["lats", "biceps", "upper_back"];
  if (f === "upper_body") return ["chest", "triceps", "shoulders", "lats", "biceps", "upper_back"];
  if (f === "lower" || f === "lower_body") return ["legs", "quads", "glutes", "hamstrings", "calves"];
  if (f === "core") return ["core"];
  if (f === "full_body") return ["legs", "quads", "glutes", "hamstrings", "calves", "core", "chest", "triceps", "shoulders", "lats", "biceps", "upper_back"];
  return [];
}

export interface ScoreExerciseOptions {
  /** Block type for role-aware and main-lift scoring (e.g. main_strength, warmup). */
  blockType?: string;
  /** Session fatigue regions so far (region -> count) for balance penalty/bonus. */
  sessionFatigueRegions?: Map<string, number>;
  /** Preferred mobility/stretch targets for warmup/cooldown relevance. */
  preferredWarmupCooldownTargets?: string[];
  /** Phase 10: movement pattern counts in session so far (for pattern redundancy penalty). */
  sessionMovementPatternCounts?: Map<string, number>;
  /** Phase 10: session already has bilateral lower-body work (for unilateral variety bonus). */
  sessionHasBilateralLowerBody?: boolean;
  /** Phase 11: history context for exposure/anchor/rotation scoring. */
  historyContext?: TrainingHistoryContext;
  /** Precomputed merged target vector (goal + sport + session); avoids recomputing per exercise. */
  sessionTargetVector?: SessionTargetVector;
  /** Hiking/backpacking: slot rule for pattern transfer scoring (used with hikingPatternScoreMode). */
  hikingPatternSlotRule?: SportPatternSlotRule;
  /** `gated` = pool was pre-filtered to gate categories; `fallback` = full pool, boost gate matches. */
  hikingPatternScoreMode?: "gated" | "fallback";
  /** Within gated pool: extra score + session redundancy (hiking/backpacking only). */
  hikingQualityContext?: HikingQualityScoreContext;
  /** Trail running: slot rule + mode (mutually exclusive with hiking for a given session). */
  trailRunningPatternSlotRule?: SportPatternSlotRule;
  trailRunningPatternScoreMode?: "gated" | "fallback";
  trailRunningQualityContext?: TrailRunningQualityScoreContext;
  roadRunningPatternSlotRule?: SportPatternSlotRule;
  roadRunningPatternScoreMode?: "gated" | "fallback";
  roadRunningQualityContext?: TrailRunningQualityScoreContext;
  soccerPatternSlotRule?: SportPatternSlotRule;
  soccerPatternScoreMode?: "gated" | "fallback";
  soccerQualityContext?: SoccerQualityScoreContext;
  /** Alpine skiing: slot rule + mode (mutually exclusive with hiking/trail for a given session). */
  alpineSkiingPatternSlotRule?: SportPatternSlotRule;
  alpineSkiingPatternScoreMode?: "gated" | "fallback";
  alpineSkiingQualityContext?: AlpineSkiingQualityScoreContext;
  rockClimbingPatternSlotRule?: SportPatternSlotRule;
  rockClimbingPatternScoreMode?: "gated" | "fallback";
  rockClimbingQualityContext?: import("./sportPatternTransfer/rockClimbingQualityScoring").RockClimbingQualityScoreContext;
  /**
   * Alpine / rock / road running: shrink generic additive surface on main_strength / main_hypertrophy so slot validity + within-pool quality dominate.
   */
  sportMainScoringMode?:
    | "alpine_reduced_surface"
    | "rock_reduced_surface"
    | "road_reduced_surface"
    | "soccer_reduced_surface";
  /** When true, returns `breakdown` for intent-survival tracing (same score as when false). */
  include_scoring_breakdown?: boolean;
  /** Overrides `input.sport_profile_for_scoring` for this score call (tests / isolation). */
  sportProfile?: import("./sportProfileEngine").NormalizedSportProfile;
}

/** Scale numeric debug fields when generic scorer terms are demoted for sport-main selection. */
function scaleScoringDebugNumericFields<T extends Record<string, unknown>>(obj: T | undefined, scale: number): T | undefined {
  if (!obj || scale === 1) return obj;
  const out = { ...obj } as Record<string, unknown>;
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === "number") out[k] = v * scale;
  }
  return out as T;
}

/**
 * **Production session scorer** for `generateWorkoutSession` (Build My Workout & Sports Prep).
 * Not to be confused with `workoutIntelligence/scoring/scoreExercise.ts` (Phase 4 pipeline only).
 * @see `SCORING_RUNTIME.md` in this directory for the full scoring path map.
 */
export function scoreExercise(
  exercise: Exercise,
  input: GenerateWorkoutInput,
  recentExerciseIds: Set<string>,
  movementPatternCounts: Map<string, number>,
  fatigueState?: FatigueState,
  options?: ScoreExerciseOptions
): { score: number; breakdown?: ScoringDebug } {
  let total = 0;
  let userLevelPreferenceScore = 0;
  let creativeSelectionBonus = 0;
  let tierPreferenceComponents: Record<string, number> | undefined;
  let creativeBonusComponents: Record<string, number> | undefined;
  const opts = options ?? {};
  const cap = opts.include_scoring_breakdown === true;
  const blockTypeNorm = opts.blockType?.toLowerCase().replace(/\s/g, "_") ?? "";
  const alpineMainReducedSurface =
    opts.sportMainScoringMode === "alpine_reduced_surface" &&
    (blockTypeNorm === "main_strength" || blockTypeNorm === "main_hypertrophy");
  const rockMainReducedSurface =
    opts.sportMainScoringMode === "rock_reduced_surface" &&
    (blockTypeNorm === "main_strength" || blockTypeNorm === "main_hypertrophy");
  const roadMainReducedSurface =
    opts.sportMainScoringMode === "road_reduced_surface" &&
    (blockTypeNorm === "main_strength" || blockTypeNorm === "main_hypertrophy");
  const soccerMainReducedSurface =
    opts.sportMainScoringMode === "soccer_reduced_surface" &&
    (blockTypeNorm === "main_strength" || blockTypeNorm === "main_hypertrophy");
  const sportMainReducedSurface =
    alpineMainReducedSurface || rockMainReducedSurface || roadMainReducedSurface || soccerMainReducedSurface;
  const genericScale = sportMainReducedSurface ? ALPINE_MAIN_GENERIC_SCORING_SCALE : 1;
  const applyToTotal = (v: number, tier: "primary" | "generic") => {
    total += tier === "generic" ? v * genericScale : v;
  };
  const gc = (v: number) => v * genericScale;

  // Goal alignment (optionally scaled by goal_weights when provided)
  const goalTags = exercise.tags.goal_tags ?? [];
  const primaryTags = goalToTags(input.primary_goal);
  const secondaryGoal = input.secondary_goals?.[0];
  const tertiaryGoal = input.secondary_goals?.[1];
  const secondaryTags = secondaryGoal ? goalToTags(secondaryGoal) : [];
  const tertiaryTags = tertiaryGoal ? goalToTags(tertiaryGoal) : [];
  const gw = input.goal_weights;
  const w0 = gw?.[0] ?? 0.6;
  const w1 = gw?.[1] ?? 0.3;
  const w2 = gw?.[2] ?? 0.1;
  let goalScore = 0;
  for (const t of goalTags) {
    if (primaryTags.includes(t)) goalScore += gw ? WEIGHT_PRIMARY_GOAL * (w0 / 0.6) : WEIGHT_PRIMARY_GOAL;
    else if (secondaryTags.includes(t)) goalScore += gw ? WEIGHT_SECONDARY_GOAL * (w1 / 0.3) : WEIGHT_SECONDARY_GOAL;
    else if (tertiaryTags.includes(t)) goalScore += gw ? WEIGHT_TERTIARY * (w2 / 0.1) : WEIGHT_TERTIARY;
  }
  const goalScoreBeforeSportDampen = goalScore;
  if (input.sport_slugs?.length) {
    const sw = input.sport_weight ?? 0.5;
    goalScore *= 1 - sw * GOAL_DAMPEN_MAX_WITH_SPORT;
  }
  applyToTotal(goalScore, "generic");

  // Sport match: boost exercises whose sport_tags match user's ranked sport(s)
  const sportSlugs = input.sport_slugs;
  let sportTagMatchTotal = 0;
  if (sportSlugs?.length) {
    const exerciseSportTags = new Set(
      (exercise.tags.sport_tags ?? []).map((s) =>
        tagToSlug(getCanonicalSportSlug(s))
      )
    );
    for (let i = 0; i < sportSlugs.length; i++) {
      const slug = tagToSlug(getCanonicalSportSlug(sportSlugs[i]));
      if (exerciseSportTags.has(slug)) {
        const add = i === 0 ? SPORT_TAG_MATCH_PRIMARY : SPORT_TAG_MATCH_SECONDARY;
        sportTagMatchTotal += add;
        break;
      }
    }
  }
  applyToTotal(sportTagMatchTotal, "generic");

  // Training-quality alignment: exercise capability vector vs merged session target (goal + sport + weekly session).
  const stv = opts.sessionTargetVector;
  let sportQualityAlignment = 0;
  if (stv && stv.size > 0) {
    const eqWeights = toExerciseWithQualities(exercise as GeneratorExercise).training_quality_weights;
    const align = alignmentScore(eqWeights, stv);
    sportQualityAlignment = align * WEIGHT_QUALITY_ALIGNMENT;
    applyToTotal(sportQualityAlignment, "generic");
  }

  // Preferred exercise IDs (from sport/goal ranking): strong bonus when exercise is in the preferred list
  const preferredIds = input.style_prefs?.preferred_exercise_ids;
  let preferredExerciseBonus = 0;
  if (preferredIds?.length) {
    const exIdNorm = tagToSlug(exercise.id);
    const exNameNorm = exercise.name ? tagToSlug(exercise.name) : "";
    const aliasNorms = (exercise.aliases ?? []).map((a) => tagToSlug(a));
    const idx = preferredIds.findIndex((id) => {
      const idNorm = tagToSlug(id);
      if (idNorm === exIdNorm || id === exercise.id) return true;
      if (exNameNorm && (idNorm === exNameNorm || id === exercise.name)) return true;
      return aliasNorms.some((an) => an === idNorm);
    });
    if (idx >= 0) {
      preferredExerciseBonus = Math.max(0.5, 2 - idx * 0.25);
    }
  }
  applyToTotal(preferredExerciseBonus, "generic");

  // Body part focus (canonical muscles + ontology movement_family_fit below). Muscle priority: prefer exercises that primarily target focus.
  const focusParts = input.focus_body_parts ?? [];
  let bodyPartFocusScore = 0;
  let primaryMuscleMatchBonus = 0;
  let bodyPartEmphasisBonus = 0;
  if (focusParts.length) {
    const wantedMuscles = new Set(focusParts.flatMap(focusBodyPartToMuscles));
    const primaryMuscles = exercise.primary_muscle_groups ?? exercise.muscle_groups.filter((m) => !exercise.secondary_muscle_groups?.includes(m));
    const matchInPrimary = primaryMuscles.length > 0 && primaryMuscles.some((m) => wantedMuscles.has(m));
    const matchInAny = exercise.muscle_groups.some((m) => wantedMuscles.has(m));
    if (matchInAny) {
      bodyPartFocusScore += WEIGHT_BODY_PART;
    }
    // Primary muscle match bonus: exercise primarily targets the user's focus (ExRx primary movers)
    if (matchInPrimary) {
      primaryMuscleMatchBonus += 0.5;
    }
    // Quad/Posterior emphasis: when Lower is selected with modifier, prefer matching pattern/category
    const focusSet = new Set(focusParts.map((f) => f.toLowerCase().replace(/\s/g, "_")));
    const patternFocus = (exercise.movement_pattern ?? "").toLowerCase();
    const pairing = (exercise.pairing_category ?? "").toLowerCase().replace(/\s/g, "_");
    if (focusSet.has("quad") && (patternFocus === "squat" || pairing === "quads")) {
      bodyPartEmphasisBonus += 0.8;
    }
    if (focusSet.has("posterior") && (patternFocus === "hinge" || pairing === "posterior_chain")) {
      bodyPartEmphasisBonus += 0.8;
    }
    applyToTotal(bodyPartFocusScore, "generic");
    applyToTotal(primaryMuscleMatchBonus, "generic");
    applyToTotal(bodyPartEmphasisBonus, "generic");
  }

  // Calisthenics: ~90% bodyweight, prefer advanced progressions, upper = push-up/handstand/pull-up families
  if (input.primary_goal === "calisthenics") {
    const isBodyweight =
      exercise.equipment_required.some((eq) => eq.toLowerCase() === "bodyweight") ||
      exercise.tags.goal_tags?.includes("calisthenics");
    if (isBodyweight) {
      applyToTotal(1.5, "generic");
    } else {
      applyToTotal(-1.5, "generic");
    }
    const hasRegressions = (exercise.regressions?.length ?? 0) > 0;
    if (hasRegressions) {
      applyToTotal(0.5, "generic");
    }
    const focusPartsNorm = (input.focus_body_parts ?? []).map((f) => f.toLowerCase().replace(/\s/g, "_"));
    const focusUpper =
      (focusPartsNorm.includes("upper_push") || focusPartsNorm.includes("upper_pull")) &&
      !focusPartsNorm.includes("lower") &&
      !focusPartsNorm.includes("full_body");
    if (focusUpper) {
      const fine = getPrimaryFineMovementPattern(exercise);
      if (fine && CALISTHENICS_UPPER_PREFERRED_FINE_PATTERNS.has(fine)) {
        applyToTotal(0.8, "generic");
      }
    }
  }

  // Conditioning/endurance: direct sub-focus slug match is first-class (strong); legacy tag match is weaker.
  const primary = input.primary_goal;
  const goalSubFocus = input.goal_sub_focus;
  const conditioningIntentSlugs =
    (primary === "conditioning" || primary === "endurance") &&
    goalSubFocus?.[primary]?.length
      ? (goalSubFocus[primary] ?? []).filter((s) => !CONDITIONING_SUB_FOCUS_OVERLAYS.has(s))
      : [];
  if (conditioningIntentSlugs.length > 0) {
    const ranked = goalSubFocus[primary] ?? [];
    const weightsArr =
      input.goal_sub_focus_weights?.[primary] ?? ranked.map(() => 1 / (ranked.length || 1));
    let bestMatchW = 0;
    for (let i = 0; i < ranked.length; i++) {
      const slug = ranked[i]!;
      if (CONDITIONING_SUB_FOCUS_OVERLAYS.has(slug)) continue;
      if (exerciseHasSubFocusSlug(exercise, slug)) {
        const w = weightsArr[i] ?? 0;
        bestMatchW = Math.max(bestMatchW, w);
      }
    }
    if (bestMatchW > 0) {
      applyToTotal(3 + bestMatchW * 9, "generic");
    }
  }

  // Strength + Calisthenics: `goal_sub_focus` stores Calisthenics sub-goals under `strength` (shared tag map).
  // Calisthenics primary must read `goalSubFocus.strength`, not `goalSubFocus.calisthenics`.
  // Calisthenics-style slugs (handstand, pull-ups, …) get the same intent weight as barbell intents.
  const strengthKeyedSubFocus = goalSubFocus?.strength;
  if (
    (primary === "strength" || primary === "calisthenics") &&
    strengthKeyedSubFocus?.length
  ) {
    const ranked = strengthKeyedSubFocus;
    const weightsArr =
      input.goal_sub_focus_weights?.strength ?? ranked.map(() => 1 / (ranked.length || 1));
    const weightBySlug = new Map<string, number>();
    ranked.forEach((s, i) => weightBySlug.set(s, weightsArr[i] ?? 1 / (ranked.length || 1)));

    const intentParts: number[] = [];
    let overlayBonus = 0;
    for (const slug of ranked) {
      if (!exerciseHasStrengthSubFocusSlug(exercise, slug)) continue;
      const w = weightBySlug.get(slug) ?? 0;
      if (STRENGTH_INTENT_SET.has(slug)) intentParts.push(w * 5);
      else if (STRENGTH_OVERLAY_SET.has(slug)) overlayBonus += w * 2;
      else if (CALISTHENICS_STRENGTH_INTENT_SET.has(slug)) intentParts.push(w * 5);
    }
    intentParts.sort((a, b) => b - a);
    const intentBonus =
      intentParts.length === 0
        ? 0
        : intentParts[0]! + (intentParts[1] ?? 0) * 0.35 + (intentParts[2] ?? 0) * 0.15;
    applyToTotal(intentBonus + overlayBonus, "generic");
  }

  // Hypertrophy: direct selected hypertrophy sub-focus slug match is first-class (strong).
  if (primary === "hypertrophy") {
    const { slugs: ranked, weights } = getSelectedHypertrophySubFocusRanked(input);
    const directSlugs = ranked.filter((s) => tagToSlug(s) !== "balanced");
    for (let i = 0; i < ranked.length; i++) {
      const slug = ranked[i];
      if (tagToSlug(slug) === "balanced") continue;
      const w = weights[i] ?? (directSlugs.length ? 1 / directSlugs.length : 0);
      if (w <= 0) continue;
      if (exerciseMatchesHypertrophySubFocusSlug(exercise, slug)) {
        applyToTotal(w * 6, "generic");
      }
    }
  }

  // Sub-focus (tag-based): boost exercises whose tags match goal/sport sub-focus tag map. For conditioning, legacy tags (conditioning/compound/energy_high) are weaker than direct slug match above.
  const sportSubFocus = input.sport_sub_focus;
  const hasSubFocus =
    (goalSubFocus && Object.keys(goalSubFocus).length > 0) ||
    (sportSubFocus && Object.keys(sportSubFocus).length > 0);
  let subFocusTagMatchTotal = 0;
  if (hasSubFocus) {
    const preferredWeights = buildPreferredTagWeightsFromSubFocus(input);
    if (preferredWeights.size > 0) {
      const exerciseSlugs = getExerciseTagSlugs(exercise);
      let subFocusScore = 0;
      for (const [slug, weight] of preferredWeights) {
        if (exerciseSlugs.has(slug)) subFocusScore += weight;
      }
      const conditioningEnduranceSpecificity =
        hasConditioningEnduranceIntentSubFocus(input) &&
        (primary === "conditioning" || primary === "endurance");
      const subFocusCoeff =
        primary === "conditioning" || primary === "endurance"
          ? conditioningEnduranceSpecificity
            ? 0.55
            : 0.25
          : primary === "strength"
            ? 0.2
            : primary === "hypertrophy"
              ? 0.15
              : 0.5;
      const subFocusContribution = subFocusScore * subFocusCoeff;
      subFocusTagMatchTotal += subFocusContribution;
      applyToTotal(subFocusContribution, "generic");
    }
  }

  // Injury-aware: down-rank high-impact exercises when user has knee/lower_back/ankle limitations
  const injuries = input.injuries_or_constraints ?? [];
  const impactSensitiveKeys = new Set(injuries.map(normalizeInjuryKey).filter((k) => ["knee", "knee_pain", "lower_back", "low_back_sensitive", "ankle"].includes(k)));
  let impactPenaltyTotal = 0;
  if (impactSensitiveKeys.size > 0 && exercise.impact_level === "high") {
    impactPenaltyTotal -= 2;
    applyToTotal(-2, "primary");
  }

  // Contraindication priority: prefer exercises with fewer contraindications when otherwise equal
  // (tags are ordered most→least relevant; fewer tags = broader applicability / better match pool)
  const contraCount = (exercise.contraindication_tags?.length ?? exercise.tags.contraindications?.length ?? 0);
  let contraindicationPriorityBonus = 0;
  if (contraCount === 0) {
    contraindicationPriorityBonus += 0.3;
  } else if (contraCount === 1) {
    contraindicationPriorityBonus += 0.2;
  } else if (contraCount === 2) {
    contraindicationPriorityBonus += 0.1;
  }
  applyToTotal(contraindicationPriorityBonus, "generic");

  // Energy fit
  const energyFit = exercise.tags.energy_fit ?? ["low", "medium", "high"];
  let energyFitScore = 0;
  if (energyFit.includes(input.energy_level)) {
    energyFitScore += WEIGHT_ENERGY_FIT;
    applyToTotal(WEIGHT_ENERGY_FIT, "generic");
  }

  const userLevel = input.style_prefs?.user_level ?? "intermediate";
  const includeCreative = input.style_prefs?.include_creative_variations === true;
  const levelCtx = getWorkoutLevelScoringContext(input);
  const tierBr = computeWorkoutLevelPreferenceScoreBreakdown(exercise, userLevel, levelCtx);
  userLevelPreferenceScore = tierBr.total;
  applyToTotal(userLevelPreferenceScore, "generic");
  const creativeBr = computeCreativeSelectionBonusBreakdown(exercise, input.primary_goal, includeCreative);
  creativeSelectionBonus = creativeBr.total;
  applyToTotal(creativeSelectionBonus, "generic");
  if (cap) {
    tierPreferenceComponents = Object.fromEntries(
      Object.entries(tierBr.parts).map(([k, v]) => [k, gc(v)])
    );
    creativeBonusComponents = Object.fromEntries(
      Object.entries(creativeBr.parts).map(([k, v]) => [k, gc(v)])
    );
  }

  // Variety penalty: used recently
  let varietyPenalty = 0;
  if (recentExerciseIds.has(exercise.id)) varietyPenalty += 3;
  const pattern = exercise.movement_pattern;
  const samePatternCount = movementPatternCounts.get(pattern) ?? 0;
  if (samePatternCount >= 2) varietyPenalty += 1.5;
  if (samePatternCount >= 3) varietyPenalty += 2;
  applyToTotal(-varietyPenalty, "generic");
  const varietyPenaltyForBreakdown = varietyPenalty;

  // Weekly main-lift diversity: penalize exact repeats and same similarity cluster (e.g. deadlift family)
  // when the app passes prior-day main IDs from the same programmed week.
  const weekMainIds = input.week_main_strength_lift_ids_used;
  if (
    weekMainIds?.length &&
    (blockTypeNorm === "main_strength" ||
      blockTypeNorm === "main_hypertrophy" ||
      blockTypeNorm === "power")
  ) {
    const wk = new Set(weekMainIds.map(normalizeWeekMainLiftId));
    const idNorm = normalizeWeekMainLiftId(exercise.id);
    if (wk.has(idNorm)) applyToTotal(-5, "primary");
    const myCluster = getSimilarExerciseClusterId(exercise);
    if (myCluster !== idNorm) {
      for (const priorId of weekMainIds) {
        const pNorm = normalizeWeekMainLiftId(priorId);
        if (pNorm === idNorm) continue;
        if (getSimilarExerciseClusterId({ id: priorId }) === myCluster) {
          applyToTotal(-2.2, "primary");
          break;
        }
      }
    }
  }

  // Balance bonus: movement-pattern balancing engine (prefer missing categories, then underrepresented)
  const balanceBonus = balanceBonusForExercise(
    pattern,
    movementPatternCounts,
    MIN_MOVEMENT_CATEGORIES,
    [...BALANCE_CATEGORY_PATTERNS]
  );
  applyToTotal(balanceBonus, "generic");

  // Fatigue management: slight penalty for re-hitting same muscle groups as last session
  let fatiguePenaltyTotal = 0;
  if (fatigueState) {
    const fatiguePenalty = fatiguePenaltyForExercise(exercise.muscle_groups, fatigueState);
    fatiguePenaltyTotal += fatiguePenalty;
    applyToTotal(fatiguePenalty, "primary");
  }

  // Duration practicality: short sessions prefer low time_cost
  let durationPracticality = 0;
  if (input.duration_minutes <= 30 && exercise.time_cost === "high") {
    durationPracticality -= 1;
    applyToTotal(-1, "generic");
  } else if (input.duration_minutes <= 30 && exercise.time_cost === "low") {
    durationPracticality += 0.5;
    applyToTotal(0.5, "generic");
  }

  // Phase 11: history-aware scoring (no effect when history absent)
  let historyBreakdownPartial: Partial<ScoringDebug> | undefined;
  let historyTotal = 0;
  if (opts.historyContext) {
    const lastSuccess = opts.historyContext.recent_sessions?.[0]?.performance_by_exercise?.[exercise.id]
      ? undefined
      : undefined;
    const hist = computeHistoryScoreComponents(exercise, {
      recentIds: recentExerciseIds,
      blockType: opts.blockType,
      preferVariety: true,
      historyContext: opts.historyContext,
      lastCompletionSuccess: lastSuccess,
    });
    historyTotal = hist.total;
    historyBreakdownPartial = hist.breakdown as Partial<ScoringDebug>;
    applyToTotal(historyTotal, "generic");
  }

  // Phase 9/10: ontology-aware scoring (additive; fallback when ontology absent)
  const { total: ontologyTotal, breakdown: ontologyBreakdown } = computeOntologyScoreComponents(exercise, {
    blockType: opts.blockType,
    focusBodyParts: input.focus_body_parts,
    primaryGoal: input.primary_goal,
    sessionFatigueRegions: opts.sessionFatigueRegions,
    preferredWarmupCooldownTargets: opts.preferredWarmupCooldownTargets,
    sessionHasBilateralLowerBody: opts.sessionHasBilateralLowerBody,
    sessionMovementPatternCounts: opts.sessionMovementPatternCounts,
  });
  applyToTotal(ontologyTotal, "generic");

  let sportPatternSlotAdjustment = 0;
  if (opts.hikingPatternSlotRule) {
    const { delta } = computeHikingPatternScoreAdjustment(
      exercise,
      opts.hikingPatternSlotRule,
      opts.hikingPatternScoreMode
    );
    sportPatternSlotAdjustment += delta;
    applyToTotal(delta, "primary");
  }

  if (opts.trailRunningPatternSlotRule) {
    const { delta } = computeTrailRunningPatternScoreAdjustment(
      exercise,
      opts.trailRunningPatternSlotRule,
      opts.trailRunningPatternScoreMode
    );
    sportPatternSlotAdjustment += delta;
    applyToTotal(delta, "primary");
  }

  if (opts.roadRunningPatternSlotRule) {
    const { delta } = computeRoadRunningPatternScoreAdjustment(
      exercise,
      opts.roadRunningPatternSlotRule,
      opts.roadRunningPatternScoreMode
    );
    sportPatternSlotAdjustment += delta;
    applyToTotal(delta, "primary");
  }

  if (opts.soccerPatternSlotRule) {
    const { delta } = computeSoccerPatternScoreAdjustment(
      exercise,
      opts.soccerPatternSlotRule,
      opts.soccerPatternScoreMode
    );
    sportPatternSlotAdjustment += delta;
    applyToTotal(delta, "primary");
  }

  if (opts.alpineSkiingPatternSlotRule) {
    const { delta } = computeAlpineSkiingPatternScoreAdjustment(
      exercise,
      opts.alpineSkiingPatternSlotRule,
      opts.alpineSkiingPatternScoreMode
    );
    sportPatternSlotAdjustment += delta;
    applyToTotal(delta, "primary");
  }

  if (opts.rockClimbingPatternSlotRule) {
    const { delta } = computeRockClimbingPatternScoreAdjustment(
      exercise,
      opts.rockClimbingPatternSlotRule,
      opts.rockClimbingPatternScoreMode
    );
    sportPatternSlotAdjustment += delta;
    applyToTotal(delta, "primary");
  }

  let sportWithinPoolQuality = 0;
  if (opts.hikingQualityContext) {
    const q = computeHikingWithinPoolQualityScore(exercise, {
      ...opts.hikingQualityContext,
      blockType: opts.hikingQualityContext.blockType ?? opts.blockType,
    });
    sportWithinPoolQuality += q.total;
    applyToTotal(q.total, "primary");
  }

  if (opts.trailRunningQualityContext) {
    const q = computeTrailRunningWithinPoolQualityScore(exercise, {
      ...opts.trailRunningQualityContext,
      blockType: opts.trailRunningQualityContext.blockType ?? opts.blockType,
    });
    sportWithinPoolQuality += q.total;
    applyToTotal(q.total, "primary");
  }

  if (opts.roadRunningQualityContext) {
    const q = computeRoadRunningWithinPoolQualityScore(exercise, {
      ...opts.roadRunningQualityContext,
      blockType: opts.roadRunningQualityContext.blockType ?? opts.blockType,
    });
    sportWithinPoolQuality += q.total;
    applyToTotal(q.total, "primary");
  }

  if (opts.soccerQualityContext) {
    const q = computeSoccerWithinPoolQualityScore(exercise, {
      ...opts.soccerQualityContext,
      blockType: opts.soccerQualityContext.blockType ?? opts.blockType,
    });
    sportWithinPoolQuality += q.total;
    applyToTotal(q.total, "primary");
  }

  if (opts.alpineSkiingQualityContext) {
    const q = computeAlpineSkiingWithinPoolQualityScore(exercise, {
      ...opts.alpineSkiingQualityContext,
      blockType: opts.alpineSkiingQualityContext.blockType ?? opts.blockType,
    });
    sportWithinPoolQuality += q.total;
    applyToTotal(q.total, "primary");
  }

  if (opts.rockClimbingQualityContext) {
    const q = computeRockClimbingWithinPoolQualityScore(exercise, {
      ...opts.rockClimbingQualityContext,
      blockType: opts.rockClimbingQualityContext.blockType ?? opts.blockType,
    });
    sportWithinPoolQuality += q.total;
    applyToTotal(q.total, "primary");
  }

  const sportProf = opts.sportProfile ?? input.sport_profile_for_scoring;
  let sport_profile_movement_match = 0;
  let sport_profile_specificity = 0;
  let sport_profile_energy_alignment = 0;
  let sport_profile_penalty = 0;
  let sport_profile_penalty_flags: string[] | undefined;
  if (sportProf) {
    const spc = computeSportProfileScoreComponents(exercise, sportProf, blockTypeNorm);
    sport_profile_movement_match = spc.movement_pattern_match;
    sport_profile_specificity = spc.sport_specificity;
    sport_profile_energy_alignment = spc.energy_system_alignment;
    sport_profile_penalty = spc.penalty;
    sport_profile_penalty_flags = spc.penalty_flags.length ? spc.penalty_flags : undefined;
    applyToTotal(
      spc.movement_pattern_match + spc.sport_specificity + spc.energy_system_alignment,
      "generic"
    );
    applyToTotal(spc.penalty, "generic");
  }

  if (!cap) {
    return { score: total };
  }

  let workoutLevelAssignmentTrace: ScoringDebug["workout_level_assignment_trace"];
  let hardConstraintRejectReason: string | undefined;
  if (isWorkoutLevelScoreDebugEnabled()) {
    const explained = inferWorkoutLevelsWithExplanation(exerciseToWorkoutLevelExtendedSource(exercise));
    workoutLevelAssignmentTrace = {
      origin: explained.origin,
      reasons: explained.reasons.slice(0, 14),
      ...(explained.complexityScore != null ? { complexity_score: explained.complexityScore } : {}),
    };
    hardConstraintRejectReason = getHardConstraintRejectReason(exercise, input) ?? undefined;
  }

  const goalDampenDelta =
    input.sport_slugs?.length && goalScoreBeforeSportDampen !== goalScore
      ? goalScore - goalScoreBeforeSportDampen
      : undefined;

  const ontologyScaled = scaleScoringDebugNumericFields(
    ontologyBreakdown as unknown as Record<string, unknown>,
    sportMainReducedSurface ? genericScale : 1
  ) as Partial<ScoringDebug>;
  const historyScaled = scaleScoringDebugNumericFields(
    historyBreakdownPartial as unknown as Record<string, unknown> | undefined,
    sportMainReducedSurface ? genericScale : 1
  ) as Partial<ScoringDebug> | undefined;

  const breakdown: ScoringDebug = {
    ...ontologyScaled,
    ...historyScaled,
    exercise_id: exercise.id,
    total,
    goal_alignment: goalScore ? gc(goalScore) : undefined,
    goal_score_sport_dampening: goalDampenDelta,
    sport_tag_match: sportTagMatchTotal ? gc(sportTagMatchTotal) : undefined,
    sport_quality_alignment: sportQualityAlignment ? gc(sportQualityAlignment) : undefined,
    preferred_exercise_bonus: preferredExerciseBonus ? gc(preferredExerciseBonus) : undefined,
    body_part: bodyPartFocusScore ? gc(bodyPartFocusScore) : undefined,
    primary_muscle_match_bonus: primaryMuscleMatchBonus ? gc(primaryMuscleMatchBonus) : undefined,
    body_part_emphasis_bonus: bodyPartEmphasisBonus ? gc(bodyPartEmphasisBonus) : undefined,
    sub_focus_tag_match: subFocusTagMatchTotal ? gc(subFocusTagMatchTotal) : undefined,
    impact_penalty: impactPenaltyTotal || undefined,
    contraindication_priority_bonus: contraindicationPriorityBonus ? gc(contraindicationPriorityBonus) : undefined,
    energy_fit: energyFitScore ? gc(energyFitScore) : undefined,
    user_level_preference: userLevelPreferenceScore ? gc(userLevelPreferenceScore) : undefined,
    creative_selection_bonus: creativeSelectionBonus ? gc(creativeSelectionBonus) : undefined,
    tier_preference_components:
      tierPreferenceComponents && Object.keys(tierPreferenceComponents).length > 0
        ? tierPreferenceComponents
        : undefined,
    creative_bonus_components:
      creativeBonusComponents && Object.keys(creativeBonusComponents).length > 0
        ? creativeBonusComponents
        : undefined,
    variety_penalty: varietyPenaltyForBreakdown ? gc(varietyPenaltyForBreakdown) : undefined,
    balance_bonus: balanceBonus ? gc(balanceBonus) : undefined,
    fatigue_penalty: fatiguePenaltyTotal || undefined,
    duration_practicality: durationPracticality ? gc(durationPracticality) : undefined,
    sport_pattern_slot_adjustment: sportPatternSlotAdjustment || undefined,
    sport_within_pool_quality: sportWithinPoolQuality || undefined,
    ...(sportMainReducedSurface
      ? {
          sport_main_scoring_mode: alpineMainReducedSurface
            ? ("alpine_reduced_surface" as const)
            : rockMainReducedSurface
              ? ("rock_reduced_surface" as const)
              : roadMainReducedSurface
                ? ("road_reduced_surface" as const)
                : ("soccer_reduced_surface" as const),
          sport_main_generic_term_scale: genericScale,
        }
      : {}),
    ...(workoutLevelAssignmentTrace ? { workout_level_assignment_trace: workoutLevelAssignmentTrace } : {}),
    ...(hardConstraintRejectReason ? { hard_constraint_reject_reason: hardConstraintRejectReason } : {}),
    ...(sport_profile_movement_match || sport_profile_specificity || sport_profile_energy_alignment
      ? {
          sport_profile_movement_match: gc(sport_profile_movement_match),
          sport_profile_specificity: gc(sport_profile_specificity),
          sport_profile_energy_alignment: gc(sport_profile_energy_alignment),
        }
      : {}),
    ...(sport_profile_penalty ? { sport_profile_penalty: gc(sport_profile_penalty) } : {}),
    ...(sport_profile_penalty_flags?.length ? { sport_profile_penalty_flags: sport_profile_penalty_flags } : {}),
  };

  return { score: total, breakdown };
}

/** Equipment slugs that count as "only dumbbells/kettlebells" for rep-range override (no barbell, cable, machine). */
const DB_KB_ONLY_EQUIPMENT = new Set(["dumbbells", "kettlebells", "adjustable_bench"]);

/** True if exercise uses only dumbbells and/or kettlebells (and optionally bench). Goblet squats, DB RDLs, etc. → 8–12 reps unless max strength. */
function exerciseUsesOnlyDumbbellsOrKettlebells(exercise: Exercise): boolean {
  const req = (exercise.equipment_required ?? []).map((eq) => eq.toLowerCase().replace(/\s/g, "_"));
  if (req.length === 0) return false;
  const hasDbOrKb = req.some((e) => e === "dumbbells" || e === "kettlebells");
  if (!hasDbOrKb) return false;
  return req.every((e) => DB_KB_ONLY_EQUIPMENT.has(e));
}

/** Blend goal rep range with exercise-specific rep range when set (e.g. calves 15-25, isolation 10-20). */
function getEffectiveRepRange(
  exercise: Exercise,
  goalRange: { min: number; max: number }
): { min: number; max: number } {
  if ((exercise.id ?? "").toLowerCase().includes("kettlebell_swing")) {
    return {
      min: Math.max(goalRange.min, 10),
      max: Math.max(Math.min(goalRange.max, 20), 10),
    };
  }
  if (exercise.rep_range_min == null || exercise.rep_range_max == null) return goalRange;
  const effectiveMin = Math.max(goalRange.min, exercise.rep_range_min);
  const effectiveMax = Math.min(goalRange.max, exercise.rep_range_max);
  if (effectiveMin <= effectiveMax) return { min: effectiveMin, max: effectiveMax };
  return goalRange;
}

const ALLOWED_REP_TARGETS = [5, 6, 8, 10, 12, 15, 20] as const;

function snapRepsToAllowedBuckets(reps: number): number {
  let best: number = ALLOWED_REP_TARGETS[0];
  let bestDiff = Math.abs(reps - best);
  for (const bucket of ALLOWED_REP_TARGETS) {
    const diff = Math.abs(reps - bucket);
    if (diff < bestDiff) {
      best = bucket;
      bestDiff = diff;
    }
  }
  return best;
}

function normalizeRestSeconds(rest: number, intensity: "light" | "intense"): number {
  const allowed = intensity === "light" ? [20, 30] : [60, 90, 120];
  let best = allowed[0]!;
  let bestDiff = Math.abs(rest - best);
  for (const v of allowed) {
    const diff = Math.abs(rest - v);
    if (diff < bestDiff) {
      best = v;
      bestDiff = diff;
    }
  }
  return best;
}

// --- Rep/set prescription from goal rules (evidence-based) ---
function getPrescription(
  exercise: Exercise,
  blockType: BlockType,
  energyLevel: EnergyLevel,
  primaryGoal?: PrimaryGoal,
  isAccessory?: boolean,
  fatigueVolumeScale?: number,
  userLevel?: UserLevel
): { sets: number; reps?: number; time_seconds?: number; rest_seconds: number; coaching_cues: string } {
  const goal = primaryGoal ?? "hypertrophy";
  const rules = getGoalRules(goal);
  const strengthVolumeContext =
    goal === "strength" ||
    blockType === "main_strength" ||
    blockType === "main_hypertrophy" ||
    (isAccessory ?? false);
  const scaleSets = (s: number) => {
    const minSets = strengthVolumeContext ? 3 : 1;
    let n = fatigueVolumeScale != null && fatigueVolumeScale < 1
      ? Math.max(minSets, Math.round(s * fatigueVolumeScale))
      : s;
    n = Math.max(minSets, n);
    if (userLevel === "beginner") n = Math.min(n, 3);
    return n;
  };
  const beginnerCue = (fallback: string) =>
    userLevel === "beginner" ? "Focus on form and control. Quality over weight." : fallback;

  if (blockType === "warmup" || blockType === "cooldown" || exercise.modality === "mobility" || exercise.modality === "recovery") {
    // ~30 sec per stretch/mobility (or use reps); 1 min is too long for a single stretch.
    const timeSec = rules.mobilityTimePerMovement ?? 30;
    return {
      sets: rules.mobilitySets ?? 1,
      reps: 8,
      time_seconds: timeSec,
      rest_seconds: 0,
      coaching_cues: beginnerCue(rules.cueStyle.mobility ?? "Controlled, full range of motion. Breathe steadily."),
    };
  }

  // Power block: rep-based explosive prescription regardless of exercise modality (e.g. KB swing in power block).
  if (blockType === "power" && goal === "power" && rules.setRange && rules.repRange && rules.restRange) {
    const baseSets = Math.round((rules.setRange.min + rules.setRange.max) / 2);
    const sets = scaleSets(scaleSetsByEnergy(baseSets, energyLevel));
    const repRange = getEffectiveRepRange(exercise, rules.powerRepRange ?? rules.repRange);
    const reps = snapRepsToAllowedBuckets(Math.round((repRange.min + repRange.max) / 2));
    const rest = normalizeRestSeconds(rules.powerRestRange
      ? Math.round((rules.powerRestRange.min + rules.powerRestRange.max) / 2)
      : Math.round((rules.restRange.min + rules.restRange.max) / 2), "intense");
    return {
      sets,
      reps,
      rest_seconds: rest,
      coaching_cues: beginnerCue(rules.cueStyle.strength ?? "Explosive intent. Quality over volume."),
    };
  }

  if (exercise.modality === "conditioning") {
    const mins = getConditioningDurationMinutes(goal, energyLevel) ?? (energyLevel === "high" ? 8 : energyLevel === "low" ? 5 : 6);
    return {
      sets: 1,
      time_seconds: mins * 60,
      rest_seconds: 0,
      coaching_cues: beginnerCue(rules.cueStyle.cardio ?? "Steady effort. Keep heart rate in target zone."),
    };
  }

  // Accessory work (e.g. strength superset pairs): use accessory rules when present. DB/KB-only → 8–12 reps.
  if (isAccessory && rules.accessoryRepRange) {
    const setRange = rules.accessorySetRange ?? { min: 3, max: 4 };
    const sets = scaleSets(scaleSetsByEnergy(Math.round((setRange.min + setRange.max) / 2), energyLevel));
    const goalRepRange = exerciseUsesOnlyDumbbellsOrKettlebells(exercise) ? { min: 8, max: 12 } : rules.accessoryRepRange;
    const repRange = getEffectiveRepRange(exercise, goalRepRange);
    const reps = Math.round((repRange.min + repRange.max) / 2);
    const rest = normalizeRestSeconds(
      rules.accessoryRestRange ? Math.round((rules.accessoryRestRange.min + rules.accessoryRestRange.max) / 2) : 30,
      "light"
    );
    return {
      sets,
      reps: snapRepsToAllowedBuckets(reps),
      rest_seconds: rest,
      coaching_cues: beginnerCue(rules.cueStyle.strength ?? "Controlled tempo. Muscular balance."),
    };
  }

  // Power goal: use power rep/rest in main_strength block (evidence-based: low reps, high intent, long rest).
  if (blockType === "main_strength" && goal === "power" && rules.powerRepRange && rules.powerRestRange) {
    const baseSets = Math.round((rules.setRange.min + rules.setRange.max) / 2);
    const sets = scaleSets(scaleSetsByEnergy(baseSets, energyLevel));
    const repRange = getEffectiveRepRange(exercise, rules.powerRepRange);
    const reps = snapRepsToAllowedBuckets(Math.round((repRange.min + repRange.max) / 2));
    const rest = normalizeRestSeconds(Math.round((rules.powerRestRange.min + rules.powerRestRange.max) / 2), "intense");
    return {
      sets,
      reps,
      rest_seconds: rest,
      coaching_cues: beginnerCue(rules.cueStyle.strength ?? "Explosive intent. Quality over volume."),
    };
  }

  // Main strength: DB/KB-only (e.g. goblet squat) → 8–12 reps unless truly max strength; barbell stays low-rep.
  if (blockType === "main_strength" || exercise.tags.goal_tags?.includes("strength")) {
    const baseSets = Math.round((rules.setRange.min + rules.setRange.max) / 2);
    const sets = scaleSets(scaleSetsByEnergy(baseSets, energyLevel));
    const goalRepRange = exerciseUsesOnlyDumbbellsOrKettlebells(exercise) ? { min: 8, max: 12 } : rules.repRange;
    const repRange = getEffectiveRepRange(exercise, goalRepRange);
    const reps = snapRepsToAllowedBuckets(Math.round((repRange.min + repRange.max) / 2));
    const rest = normalizeRestSeconds(Math.round((rules.restRange.min + rules.restRange.max) / 2), "intense");
    return {
      sets,
      reps,
      rest_seconds: rest,
      coaching_cues: beginnerCue(rules.cueStyle.strength ?? "Heavy, controlled. Full lockout."),
    };
  }

  if (blockType === "main_hypertrophy" || exercise.tags.goal_tags?.includes("hypertrophy")) {
    const baseSets = Math.round((rules.setRange.min + rules.setRange.max) / 2);
    const sets = scaleSets(scaleSetsByEnergy(baseSets, energyLevel));
    const goalRepRange = exerciseUsesOnlyDumbbellsOrKettlebells(exercise) ? { min: 8, max: 12 } : rules.repRange;
    const repRange = getEffectiveRepRange(exercise, goalRepRange);
    const reps = snapRepsToAllowedBuckets(Math.round((repRange.min + repRange.max) / 2));
    const rest = normalizeRestSeconds(Math.round((rules.restRange.min + rules.restRange.max) / 2), "light");
    return {
      sets,
      reps,
      rest_seconds: rest,
      coaching_cues: beginnerCue(rules.cueStyle.strength ?? "Moderate load. Squeeze at peak contraction."),
    };
  }

  // Default: DB/KB-only → 8–12
  const baseSets = Math.round((rules.setRange.min + rules.setRange.max) / 2);
  const sets = scaleSets(scaleSetsByEnergy(baseSets, energyLevel));
  const goalRepRange = exerciseUsesOnlyDumbbellsOrKettlebells(exercise) ? { min: 8, max: 12 } : rules.repRange;
  const repRange = getEffectiveRepRange(exercise, goalRepRange);
  const reps = snapRepsToAllowedBuckets(Math.round((repRange.min + repRange.max) / 2));
  const rest = normalizeRestSeconds(Math.round((rules.restRange.min + rules.restRange.max) / 2), "light");
  return {
    sets,
    reps,
    rest_seconds: rest,
    coaching_cues: beginnerCue(rules.cueStyle.strength ?? "Controlled tempo."),
  };
}

/** Add exercise's fatigue regions to session map (mutates map). */
function addExerciseFatigueRegionsToSession(
  sessionFatigueRegions: Map<string, number>,
  exercise: Exercise
): void {
  const regions = getEffectiveFatigueRegions({
    id: exercise.id,
    fatigue_regions: exercise.fatigue_regions,
    pairing_category: exercise.pairing_category,
    muscle_groups: exercise.muscle_groups,
    movement_pattern: exercise.movement_pattern,
  });
  for (const r of regions) {
    sessionFatigueRegions.set(r, (sessionFatigueRegions.get(r) ?? 0) + 1);
  }
}

/** Phase 11: Attach recommendation and prescription influence to each item (mutates blocks). */
function attachRecommendationsToSession(
  blocks: WorkoutBlock[],
  exercisePool: Exercise[],
  historyContext: TrainingHistoryContext | undefined,
  recentIds: Set<string>
): void {
  const byId = new Map(exercisePool.map((e) => [e.id, e]));
  const preferLighter = historyContext?.readiness?.prefer_lighter ?? false;
  for (const block of blocks) {
    for (let i = 0; i < block.items.length; i++) {
      const item = block.items[i];
      const exercise = byId.get(item.exercise_id);
      if (!exercise) continue;
      const rec = getRecommendation(exercise, block.block_type, historyContext, {
        wasRecentlyUsed: recentIds.has(exercise.id),
        preferLighter,
      });
      const adjusted = applyRecommendationToPrescription(
        {
          sets: item.sets,
          reps: item.reps,
          time_seconds: item.time_seconds,
          rest_seconds: item.rest_seconds,
          coaching_cues: item.coaching_cues,
        },
        rec.recommendation
      );
      block.items[i] = {
        ...item,
        sets: adjusted.sets,
        reps: adjusted.reps,
        time_seconds: adjusted.time_seconds,
        rest_seconds: adjusted.rest_seconds,
        coaching_cues: adjusted.coaching_cues,
        recommendation: rec.recommendation,
        recommendation_reason: rec.reason,
      };
    }
  }
}

/** True if adding candidate would create 3+ consecutive exercises from the same similar cluster (e.g. deadlift family). */
function wouldBeThreeSameClusterInARow(chosen: Exercise[], candidate: Exercise): boolean {
  if (chosen.length < MAX_CONSECUTIVE_SAME_CLUSTER) return false;
  const cluster = getSimilarExerciseClusterId(candidate);
  const last = getSimilarExerciseClusterId(chosen[chosen.length - 1]);
  const prev = getSimilarExerciseClusterId(chosen[chosen.length - 2]);
  return last === cluster && prev === cluster;
}

function isCardioAlignedExercise(exercise: Exercise): boolean {
  if (exercise.modality === "conditioning") return true;
  const goalTags = (exercise.tags.goal_tags ?? []).map((tag) => tag.toLowerCase());
  if (goalTags.includes("conditioning") || goalTags.includes("endurance")) return true;
  const stimulus = (exercise.tags.stimulus ?? []).map((tag) => tag.toLowerCase().replace(/\s/g, "_"));
  return stimulus.includes("aerobic_zone2") || stimulus.includes("anaerobic");
}

function enforceCardioSelectionShare(
  chosen: Exercise[],
  rankedByScore: Exercise[],
  requestedCount: number,
  targetShare: number
): Exercise[] {
  if (targetShare <= 0 || chosen.length === 0) return chosen;
  const required = Math.max(0, Math.min(requestedCount, Math.ceil(requestedCount * targetShare)));
  if (required <= 0) return chosen;

  const selected = [...chosen];
  let current = selected.filter(isCardioAlignedExercise).length;
  if (current >= required) return selected;

  const chosenIds = new Set(selected.map((e) => e.id));
  const cardioCandidates = rankedByScore.filter((e) => isCardioAlignedExercise(e) && !chosenIds.has(e.id));
  const replaceableIndices = selected
    .map((exercise, idx) => ({ idx, exercise }))
    .filter((x) => !isCardioAlignedExercise(x.exercise))
    .map((x) => x.idx);

  let candidateIdx = 0;
  for (const replaceIdx of replaceableIndices) {
    if (current >= required) break;
    const replacement = cardioCandidates[candidateIdx++];
    if (!replacement) break;
    selected[replaceIdx] = replacement;
    current++;
  }

  return selected;
}

type IntentSurvivalSelectionOpts = {
  collector: IntentSurvivalCollector;
  pass_id: string;
  block_label: string;
  slot_type: string;
  sport_gate_applied: boolean;
  slot_rule_id?: string;
  gate_snapshot?: SportPatternGateResult;
};

function buildTopIntentCandidateBreakdowns(
  topOverall: { exercise: Exercise; score: number }[],
  max: number,
  input: GenerateWorkoutInput,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  fatigueState: FatigueState | undefined,
  scoreOpts: ScoreExerciseOptions
): IntentSurvivalCandidateBreakdown[] {
  return topOverall.slice(0, max).map((row) => {
    const r = scoreExercise(row.exercise, input, recentIds, movementCounts, fatigueState, {
      ...scoreOpts,
      include_scoring_breakdown: true,
    });
    const b = r.breakdown;
    return {
      exercise_id: row.exercise.id,
      total_score: r.score,
      scoring_debug: b,
      sport_pattern_slot_adjustment: b?.sport_pattern_slot_adjustment,
      sport_within_pool_quality_total: b?.sport_within_pool_quality,
    };
  });
}

// --- Select top exercises by score (and by movement pattern for balance) ---
/** Re-score each pick so sport-pattern redundancy / emphasis applies (hiking or trail running main/hypertrophy). */
function selectExercisesSportPatternIterative(
  pool: Exercise[],
  input: GenerateWorkoutInput,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  count: number,
  rng: () => number,
  fatigueState: FatigueState | undefined,
  opts: {
    blockType?: string;
    sessionFatigueRegions?: Map<string, number>;
    preferredWarmupCooldownTargets?: string[];
    sessionMovementPatternCounts?: Map<string, number>;
    sessionHasBilateralLowerBody?: boolean;
    historyContext?: TrainingHistoryContext;
    hikingPatternSlotRule?: SportPatternSlotRule;
    hikingPatternScoreMode?: "gated" | "fallback";
    hikingQualityContext?: HikingQualityScoreContext;
    trailRunningPatternSlotRule?: SportPatternSlotRule;
    trailRunningPatternScoreMode?: "gated" | "fallback";
    trailRunningQualityContext?: TrailRunningQualityScoreContext;
    roadRunningPatternSlotRule?: SportPatternSlotRule;
    roadRunningPatternScoreMode?: "gated" | "fallback";
    roadRunningQualityContext?: TrailRunningQualityScoreContext;
    soccerPatternSlotRule?: SportPatternSlotRule;
    soccerPatternScoreMode?: "gated" | "fallback";
    soccerQualityContext?: SoccerQualityScoreContext;
    alpineSkiingPatternSlotRule?: SportPatternSlotRule;
    alpineSkiingPatternScoreMode?: "gated" | "fallback";
    alpineSkiingQualityContext?: AlpineSkiingQualityScoreContext;
    rockClimbingPatternSlotRule?: SportPatternSlotRule;
    rockClimbingPatternScoreMode?: "gated" | "fallback";
    rockClimbingQualityContext?: import("./sportPatternTransfer/rockClimbingQualityScoring").RockClimbingQualityScoreContext;
    sportMainScoringMode?: ScoreExerciseOptions["sportMainScoringMode"];
    targetCardioExerciseShare?: number;
    intent_survival?: IntentSurvivalSelectionOpts;
  },
  sessionTargetVector: SessionTargetVector | undefined
): { exercises: Exercise[] } {
  const chosen: Exercise[] = [];
  const iterative_rounds: NonNullable<IntentSurvivalSelectionPass["iterative_rounds"]> = [];
  const tierBand = 5.5;
  const hq = opts.hikingQualityContext;
  const roadQ = opts.roadRunningQualityContext;
  const tq = opts.trailRunningQualityContext;
  const soccerQ = opts.soccerQualityContext;
  const aq = opts.alpineSkiingQualityContext;
  const rq = opts.rockClimbingQualityContext;
  const addSessionSportCounts = (ex: Exercise) => {
    if (hq) addExerciseToHikingSessionCounts(ex, hq.sessionHikingCategoryCounts);
    else if (roadQ) addExerciseToRoadRunningSessionCounts(ex, roadQ.sessionTrailCategoryCounts);
    else if (tq) addExerciseToTrailRunningSessionCounts(ex, tq.sessionTrailCategoryCounts);
    else if (soccerQ) addExerciseToSoccerSessionCounts(ex, soccerQ.sessionSoccerCategoryCounts);
    else if (aq)
      addExerciseToAlpineSessionCounts(
        ex,
        aq.sessionAlpineCategoryCounts ?? aq.sessionSnowCategoryCounts ?? new Map()
      );
    else if (rq) addExerciseToRockSessionCounts(ex, rq.sessionRockCategoryCounts);
  };
  for (let round = 0; chosen.length < count && round < Math.max(pool.length * 4, 24); round++) {
    const remaining = pool.filter((e) => !chosen.some((c) => c.id === e.id));
    if (remaining.length === 0) break;
    const scoreOpts: ScoreExerciseOptions = {
      blockType: opts.blockType,
      sessionFatigueRegions: opts.sessionFatigueRegions,
      preferredWarmupCooldownTargets: opts.preferredWarmupCooldownTargets,
      sessionMovementPatternCounts: opts.sessionMovementPatternCounts,
      sessionHasBilateralLowerBody: opts.sessionHasBilateralLowerBody,
      historyContext: opts.historyContext,
      sessionTargetVector,
      hikingPatternSlotRule: opts.hikingPatternSlotRule,
      hikingPatternScoreMode: opts.hikingPatternScoreMode,
      hikingQualityContext: hq,
      trailRunningPatternSlotRule: opts.trailRunningPatternSlotRule,
      trailRunningPatternScoreMode: opts.trailRunningPatternScoreMode,
      trailRunningQualityContext: tq,
      roadRunningPatternSlotRule: opts.roadRunningPatternSlotRule,
      roadRunningPatternScoreMode: opts.roadRunningPatternScoreMode,
      roadRunningQualityContext: roadQ,
      soccerPatternSlotRule: opts.soccerPatternSlotRule,
      soccerPatternScoreMode: opts.soccerPatternScoreMode,
      soccerQualityContext: soccerQ,
      alpineSkiingPatternSlotRule: opts.alpineSkiingPatternSlotRule,
      alpineSkiingPatternScoreMode: opts.alpineSkiingPatternScoreMode,
      alpineSkiingQualityContext: aq,
      rockClimbingPatternSlotRule: opts.rockClimbingPatternSlotRule,
      rockClimbingPatternScoreMode: opts.rockClimbingPatternScoreMode,
      rockClimbingQualityContext: rq,
      sportMainScoringMode: opts.sportMainScoringMode,
    };
    const scored = remaining.map((e) => ({
      exercise: e,
      ...scoreExercise(e, input, recentIds, movementCounts, fatigueState, scoreOpts),
    }));
    scored.sort((a, b) => b.score - a.score);
    const topOverall = scored.slice(0, Math.min(60, scored.length));
    const bestScore = topOverall[0]?.score ?? 0;
    const tierThreshold = Math.max(0, bestScore - tierBand);
    const topTier = topOverall.filter((x) => x.score >= tierThreshold);
    const randomPoolSize = Math.min(50, Math.max(25, topTier.length));
    const randomPool = topTier.slice(0, randomPoolSize);
    let picked = false;
    for (let i = 0; i < Math.max(100, randomPool.length * 5) && !picked; i++) {
      const idx = Math.floor(rng() * Math.max(1, randomPool.length));
      const item = randomPool[idx];
      if (!item || chosen.some((c) => c.id === item.exercise.id)) continue;
      const nextCount = (movementCounts.get(item.exercise.movement_pattern) ?? 0) + 1;
      if (nextCount > MAX_SAME_PATTERN_PER_SESSION) continue;
      if (wouldBeThreeSameClusterInARow(chosen, item.exercise)) continue;
      if (tq && isTrailForwardSteppingLungePattern(item.exercise)) {
        const fwd = tq.sessionTrailCategoryCounts.get("_session_trail_forward_lunge_family") ?? 0;
        if (fwd >= 2) continue;
      }
      chosen.push(item.exercise);
      movementCounts.set(item.exercise.movement_pattern, nextCount);
      addSessionSportCounts(item.exercise);
      if (opts.sessionFatigueRegions) addExerciseFatigueRegionsToSession(opts.sessionFatigueRegions, item.exercise);
      if (opts.intent_survival) {
        iterative_rounds.push({
          round_index: chosen.length - 1,
          chosen_exercise_id: item.exercise.id,
          top_candidate_breakdowns: buildTopIntentCandidateBreakdowns(
            topOverall,
            5,
            input,
            recentIds,
            movementCounts,
            fatigueState,
            scoreOpts
          ),
        });
      }
      picked = true;
    }
    if (!picked) {
      for (const { exercise } of topOverall) {
        if (chosen.some((c) => c.id === exercise.id)) continue;
        const nextCount = (movementCounts.get(exercise.movement_pattern) ?? 0) + 1;
        if (nextCount > MAX_SAME_PATTERN_PER_SESSION) continue;
        if (wouldBeThreeSameClusterInARow(chosen, exercise)) continue;
        if (tq && isTrailForwardSteppingLungePattern(exercise)) {
          const fwd = tq.sessionTrailCategoryCounts.get("_session_trail_forward_lunge_family") ?? 0;
          if (fwd >= 2) continue;
        }
        chosen.push(exercise);
        movementCounts.set(exercise.movement_pattern, nextCount);
        addSessionSportCounts(exercise);
        if (opts.sessionFatigueRegions) addExerciseFatigueRegionsToSession(opts.sessionFatigueRegions, exercise);
        if (opts.intent_survival) {
          iterative_rounds.push({
            round_index: chosen.length - 1,
            chosen_exercise_id: exercise.id,
            top_candidate_breakdowns: buildTopIntentCandidateBreakdowns(
              topOverall,
              5,
              input,
              recentIds,
              movementCounts,
              fatigueState,
              scoreOpts
            ),
          });
        }
        picked = true;
        break;
      }
    }
    if (!picked) break;
  }
  const rankedForCardioEnforcement = [...pool];
  const finalChosen = enforceCardioSelectionShare(
    chosen.slice(0, count),
    rankedForCardioEnforcement,
    count,
    opts.targetCardioExerciseShare ?? 0
  );

  if (opts.intent_survival) {
    const isv = opts.intent_survival;
    const gate = isv.gate_snapshot;
    const lastTop =
      iterative_rounds.length > 0
        ? iterative_rounds[iterative_rounds.length - 1]!.top_candidate_breakdowns
        : [];
    isv.collector.pushSelectionPass({
      pass_id: isv.pass_id,
      block_label: isv.block_label,
      slot_type: isv.slot_type,
      sport_gate_applied: isv.sport_gate_applied,
      slot_rule_id: isv.slot_rule_id,
      gate_tier_counts: gate ? gateResultToTierCounts(gate) : undefined,
      pool_mode: gate?.poolMode,
      fallback_occurred: gate?.usedFullPoolFallback === true,
      sport_pattern_selection_tier: gate?.selectionTier,
      fallback_tier_reached: gate?.usedFullPoolFallback ? "full_pool_fallback" : gate ? "gated" : undefined,
      candidate_count_in_pool: pool.length,
      selection_mode: "iterative_sport_pattern",
      top_candidate_breakdowns: lastTop,
      chosen_exercise_ids: finalChosen.map((c) => c.id),
      chosen_why: finalChosen.map(
        (_, i) =>
          `iterative_round_${i + 1}: rescored_remaining_pool_each_round; sport_pattern_quality_context_active`
      ),
      iterative_rounds,
    });
  }
  return { exercises: finalChosen };
}

function selectExercises(
  pool: Exercise[],
  input: GenerateWorkoutInput,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  count: number,
  rng: () => number,
  fatigueState?: FatigueState,
  selectionOptions?: {
    blockType?: string;
    sessionFatigueRegions?: Map<string, number>;
    preferredWarmupCooldownTargets?: string[];
    sessionMovementPatternCounts?: Map<string, number>;
    sessionHasBilateralLowerBody?: boolean;
    historyContext?: TrainingHistoryContext;
    hikingPatternSlotRule?: SportPatternSlotRule;
    hikingPatternScoreMode?: "gated" | "fallback";
    hikingQualityContext?: HikingQualityScoreContext;
    trailRunningPatternSlotRule?: SportPatternSlotRule;
    trailRunningPatternScoreMode?: "gated" | "fallback";
    trailRunningQualityContext?: TrailRunningQualityScoreContext;
    roadRunningPatternSlotRule?: SportPatternSlotRule;
    roadRunningPatternScoreMode?: "gated" | "fallback";
    roadRunningQualityContext?: TrailRunningQualityScoreContext;
    soccerPatternSlotRule?: SportPatternSlotRule;
    soccerPatternScoreMode?: "gated" | "fallback";
    soccerQualityContext?: SoccerQualityScoreContext;
    alpineSkiingPatternSlotRule?: SportPatternSlotRule;
    alpineSkiingPatternScoreMode?: "gated" | "fallback";
    alpineSkiingQualityContext?: AlpineSkiingQualityScoreContext;
    rockClimbingPatternSlotRule?: SportPatternSlotRule;
    rockClimbingPatternScoreMode?: "gated" | "fallback";
    rockClimbingQualityContext?: import("./sportPatternTransfer/rockClimbingQualityScoring").RockClimbingQualityScoreContext;
    sportMainScoringMode?: ScoreExerciseOptions["sportMainScoringMode"];
    targetCardioExerciseShare?: number;
    intent_survival?: IntentSurvivalSelectionOpts;
  }
): { exercises: Exercise[] } {
  const opts = selectionOptions ?? {};
  const sessionTargetVector = shouldUseSessionTargetVector(input)
    ? buildSessionTargetVectorFromInput(input)
    : undefined;

  const useIterativeSportPattern =
    ((opts.hikingQualityContext && opts.hikingPatternSlotRule) ||
      (opts.roadRunningQualityContext && opts.roadRunningPatternSlotRule) ||
      (opts.trailRunningQualityContext && opts.trailRunningPatternSlotRule) ||
      (opts.soccerQualityContext && opts.soccerPatternSlotRule) ||
      (opts.alpineSkiingQualityContext && opts.alpineSkiingPatternSlotRule) ||
      (opts.rockClimbingQualityContext && opts.rockClimbingPatternSlotRule)) &&
    (opts.blockType === "main_strength" || opts.blockType === "main_hypertrophy");

  if (useIterativeSportPattern) {
    return selectExercisesSportPatternIterative(
      pool,
      input,
      recentIds,
      movementCounts,
      count,
      rng,
      fatigueState,
      opts,
      sessionTargetVector
    );
  }

  const scoreOpts: ScoreExerciseOptions = {
    blockType: opts.blockType,
    sessionFatigueRegions: opts.sessionFatigueRegions,
    preferredWarmupCooldownTargets: opts.preferredWarmupCooldownTargets,
    sessionMovementPatternCounts: opts.sessionMovementPatternCounts,
    sessionHasBilateralLowerBody: opts.sessionHasBilateralLowerBody,
    historyContext: opts.historyContext,
    sessionTargetVector,
    hikingPatternSlotRule: opts.hikingPatternSlotRule,
    hikingPatternScoreMode: opts.hikingPatternScoreMode,
    hikingQualityContext: opts.hikingQualityContext,
    trailRunningPatternSlotRule: opts.trailRunningPatternSlotRule,
    trailRunningPatternScoreMode: opts.trailRunningPatternScoreMode,
    trailRunningQualityContext: opts.trailRunningQualityContext,
    roadRunningPatternSlotRule: opts.roadRunningPatternSlotRule,
    roadRunningPatternScoreMode: opts.roadRunningPatternScoreMode,
    roadRunningQualityContext: opts.roadRunningQualityContext,
    soccerPatternSlotRule: opts.soccerPatternSlotRule,
    soccerPatternScoreMode: opts.soccerPatternScoreMode,
    soccerQualityContext: opts.soccerQualityContext,
    alpineSkiingPatternSlotRule: opts.alpineSkiingPatternSlotRule,
    alpineSkiingPatternScoreMode: opts.alpineSkiingPatternScoreMode,
    alpineSkiingQualityContext: opts.alpineSkiingQualityContext,
    rockClimbingPatternSlotRule: opts.rockClimbingPatternSlotRule,
    rockClimbingPatternScoreMode: opts.rockClimbingPatternScoreMode,
    rockClimbingQualityContext: opts.rockClimbingQualityContext,
    sportMainScoringMode: opts.sportMainScoringMode,
  };

  const scored = pool.map((e) => ({
    exercise: e,
    ...scoreExercise(e, input, recentIds, movementCounts, fatigueState, scoreOpts),
  }));
  scored.sort((a, b) => b.score - a.score);
  const topOverall = scored.slice(0, Math.min(60, scored.length));
  // Main compounds: widen the competitive band so scoring ties don't collapse to the same hub every session.
  const tierBand =
    opts.blockType === "main_strength" ||
    opts.blockType === "main_hypertrophy" ||
    opts.blockType === "power"
      ? 5.5
      : 2.5;
  const bestScore = topOverall[0]?.score ?? 0;
  const tierThreshold = Math.max(0, bestScore - tierBand);
  const topTier = topOverall.filter((x) => x.score >= tierThreshold);
  const randomPoolSize = Math.min(50, Math.max(25, topTier.length));
  const randomPool = topTier.slice(0, randomPoolSize);
  const chosen: Exercise[] = [];

  // Category-fill pass: ensure we hit MIN_MOVEMENT_CATEGORIES when possible (movement-pattern balancing engine)
  let patternsToPrefer = getPatternsToPrefer(movementCounts, MIN_MOVEMENT_CATEGORIES, [...BALANCE_CATEGORY_PATTERNS]);
  const spProf = input.sport_profile_for_scoring;
  if (
    spProf &&
    (opts.blockType === "main_strength" || opts.blockType === "main_hypertrophy")
  ) {
    const inject = [...spProf.topPatterns, ...spProf.secondaryPatterns].filter(
      (p) => !patternsToPrefer.includes(p)
    );
    patternsToPrefer = [...inject, ...patternsToPrefer];
  }
  const state = getBalanceState(movementCounts, [...BALANCE_CATEGORY_PATTERNS]);
  // Warmup/cooldown are prep and mobility — not mini strength sessions. The main-work
  // category pre-pass (squat/hinge/push/pull) forces the same top-scored exercise per
  // pattern whenever the pool includes those patterns, ignoring goal and wasting RNG.
  const sportPatternGatedMainWorkLock =
    ((opts.hikingPatternSlotRule && opts.hikingPatternScoreMode === "gated") ||
      (opts.roadRunningPatternSlotRule && opts.roadRunningPatternScoreMode === "gated") ||
      (opts.trailRunningPatternSlotRule && opts.trailRunningPatternScoreMode === "gated") ||
      (opts.soccerPatternSlotRule && opts.soccerPatternScoreMode === "gated") ||
      (opts.alpineSkiingPatternSlotRule && opts.alpineSkiingPatternScoreMode === "gated") ||
      (opts.rockClimbingPatternSlotRule && opts.rockClimbingPatternScoreMode === "gated")) &&
    (opts.blockType === "main_strength" || opts.blockType === "main_hypertrophy");
  const skipCategoryBalancePreface =
    opts.blockType === "warmup" || opts.blockType === "cooldown" || sportPatternGatedMainWorkLock;
  const needCategories = skipCategoryBalancePreface
    ? 0
    : Math.min(MIN_MOVEMENT_CATEGORIES - state.categoryCount, patternsToPrefer.length);

  for (let k = 0; k < needCategories && chosen.length < count; k++) {
    const targetPattern = patternsToPrefer[k];
    if (!targetPattern) break;
    const candidates = topOverall.filter(
      (x) =>
        x.exercise.movement_pattern === targetPattern &&
        !chosen.some((c) => c.id === x.exercise.id) &&
        !wouldBeThreeSameClusterInARow(chosen, x.exercise)
    );
    // Pattern priority: prefer exercises whose primary (first) fine pattern maps to target legacy
    const best = candidates.length === 0 ? undefined : candidates.sort((a, b) => {
      const aPrimary = a.exercise.movement_patterns?.[0]
        ? getLegacyMovementPattern({ movement_patterns: [a.exercise.movement_patterns[0]], movement_pattern: undefined })
        : a.exercise.movement_pattern;
      const bPrimary = b.exercise.movement_patterns?.[0]
        ? getLegacyMovementPattern({ movement_patterns: [b.exercise.movement_patterns[0]], movement_pattern: undefined })
        : b.exercise.movement_pattern;
      const aMatch = aPrimary === targetPattern ? 1 : 0;
      const bMatch = bPrimary === targetPattern ? 1 : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;
      return b.score - a.score;
    })[0];
    if (!best) continue;
    chosen.push(best.exercise);
    movementCounts.set(best.exercise.movement_pattern, (movementCounts.get(best.exercise.movement_pattern) ?? 0) + 1);
    if (opts.sessionFatigueRegions) addExerciseFatigueRegionsToSession(opts.sessionFatigueRegions, best.exercise);
  }

  // Random selection from score-tier pool (no single exercise weighted more than others in same tier)
  for (let i = 0; chosen.length < count && i < topOverall.length * 2; i++) {
    const idx = Math.floor(rng() * Math.max(1, randomPool.length));
    const item = randomPool[idx];
    if (!item || chosen.some((c) => c.id === item.exercise.id)) continue;
    const nextCount = (movementCounts.get(item.exercise.movement_pattern) ?? 0) + 1;
    if (nextCount > MAX_SAME_PATTERN_PER_SESSION) continue;
    if (wouldBeThreeSameClusterInARow(chosen, item.exercise)) continue;
    chosen.push(item.exercise);
    movementCounts.set(item.exercise.movement_pattern, nextCount);
    if (opts.sessionFatigueRegions) addExerciseFatigueRegionsToSession(opts.sessionFatigueRegions, item.exercise);
  }

  // If we didn't fill, add from top in order (respecting pattern cap and consecutive-cluster cap)
  for (const { exercise } of topOverall) {
    if (chosen.length >= count) break;
    if (chosen.some((c) => c.id === exercise.id)) continue;
    const nextCount = (movementCounts.get(exercise.movement_pattern) ?? 0) + 1;
    if (nextCount > MAX_SAME_PATTERN_PER_SESSION) continue;
    if (wouldBeThreeSameClusterInARow(chosen, exercise)) continue;
    chosen.push(exercise);
    movementCounts.set(exercise.movement_pattern, nextCount);
    if (opts.sessionFatigueRegions) addExerciseFatigueRegionsToSession(opts.sessionFatigueRegions, exercise);
  }

  const finalChosen = enforceCardioSelectionShare(
    chosen.slice(0, count),
    topOverall.map((row) => row.exercise),
    count,
    opts.targetCardioExerciseShare ?? 0
  );

  const isv = opts.intent_survival;
  if (isv) {
    const gate = isv.gate_snapshot;
    const topBreakdowns = buildTopIntentCandidateBreakdowns(
      topOverall,
      5,
      input,
      recentIds,
      movementCounts,
      fatigueState,
      scoreOpts
    );
    isv.collector.pushSelectionPass({
      pass_id: isv.pass_id,
      block_label: isv.block_label,
      slot_type: isv.slot_type,
      sport_gate_applied: isv.sport_gate_applied,
      slot_rule_id: isv.slot_rule_id,
      gate_tier_counts: gate ? gateResultToTierCounts(gate) : undefined,
      pool_mode: gate?.poolMode,
      fallback_occurred: gate?.usedFullPoolFallback === true,
      sport_pattern_selection_tier: gate?.selectionTier,
      fallback_tier_reached: gate?.usedFullPoolFallback ? "full_pool_fallback" : gate ? "gated" : undefined,
      candidate_count_in_pool: pool.length,
      selection_mode: "standard",
      top_candidate_breakdowns: topBreakdowns,
      chosen_exercise_ids: finalChosen.map((c) => c.id),
      chosen_why: finalChosen.map(
        (_, i) =>
          `pick_${i + 1}: random_within_top_score_tier (band=${tierBand}); best_in_view≈${bestScore.toFixed(3)}`
      ),
    });
  }

  return { exercises: finalChosen };
}

// --- Build warmup block: activation for the specific body parts that are the focus of today's workout ---
// Activation: easy bodyweight or band prep only (no weights, cables, or machines). Targets the day's focus when set.
// Phase 9: prefers prep/activation/mobility roles and targets relevant to focus; when focus is set we restrict pool to focus-relevant exercises.
function buildWarmup(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  fatigueState?: FatigueState,
  historyContext?: TrainingHistoryContext,
  strengthProfile?: SubFocusProfile | null,
  preferredTargetsFromIntent: string[] = []
): WorkoutBlock {
  // Activation and joint prep only (no conditioning in warmup).
  const basePool = exercises.filter(
    (e) =>
      (e.modality === "mobility" || e.modality === "recovery") &&
      !used.has(e.id) &&
      e.id !== "breathing_cooldown"
  );
  const pool = basePool.filter((e) => isWarmupEligibleEquipment(e.equipment_required));
  const equipmentPool = pool.length ? pool : basePool;

  const hasKneeResilienceSubFocus = Object.values(input.sport_sub_focus ?? {}).some((subs) =>
    subs?.some((s) => s.toLowerCase().replace(/\s/g, "_") === "knee_resilience")
  );
  const effectiveBodyPartsForWarmup = mergeSportBiasIntoWarmupFocusBodyParts(input.focus_body_parts, {
    alpineSkiingApplies: snowMountainSessionApplies(input),
    hasKneeResilienceSubFocus,
  });

  // When building strength workouts with an intent sub-focus, align warm-up selection
  // to the primary movement pattern and trunk stability requirements.
  const basePreferredWarmupTargets = getPreferredWarmupTargetsFromFocus(
    effectiveBodyPartsForWarmup.length > 0 ? effectiveBodyPartsForWarmup : input.focus_body_parts
  );
  const strengthIntentSlugs = strengthProfile ? getStrengthIntentSlugs(strengthProfile) : [];
  const primaryStrengthIntent = strengthIntentSlugs[0];

  // Focus body parts -> canonical warmup targets (mobility_targets/stretch_targets).
  const primaryWarmupFocusBodyParts: string[] = [];
  if (primaryStrengthIntent === "deadlift_hinge") primaryWarmupFocusBodyParts.push("lower", "core");
  if (primaryStrengthIntent === "squat") primaryWarmupFocusBodyParts.push("lower", "core");
  if (primaryStrengthIntent === "bench_press") primaryWarmupFocusBodyParts.push("upper_push");
  if (primaryStrengthIntent === "overhead_press") primaryWarmupFocusBodyParts.push("upper_push", "core");
  if (primaryStrengthIntent === "pull") primaryWarmupFocusBodyParts.push("upper_pull");

  const overlayWarmupFocusBodyParts: string[] = [];
  const ov = (strengthProfile?.overlayFilter ?? "").toLowerCase();
  if (ov === "upper") overlayWarmupFocusBodyParts.push("upper_push", "upper_pull");
  if (ov === "lower") overlayWarmupFocusBodyParts.push("lower");
  if (ov === "core") overlayWarmupFocusBodyParts.push("core");
  const strengthPreferredWarmupTargets = [...primaryWarmupFocusBodyParts, ...overlayWarmupFocusBodyParts].length
    ? getPreferredWarmupTargetsFromFocus([...primaryWarmupFocusBodyParts, ...overlayWarmupFocusBodyParts])
    : [];

  const preferredWarmupTargets = [
    ...new Set([...basePreferredWarmupTargets, ...strengthPreferredWarmupTargets, ...preferredTargetsFromIntent]),
  ];

  const primaryPreferredWarmupTargets =
    primaryWarmupFocusBodyParts.length > 0
      ? getPreferredWarmupTargetsFromFocus(primaryWarmupFocusBodyParts)
      : [];

  const primaryMatchPool =
    primaryPreferredWarmupTargets.length > 0
      ? equipmentPool.filter((e) => exerciseWarmupTargetsOverlap(e, primaryPreferredWarmupTargets))
      : [];

  // Restrict to exercises that target the day's focus (activation for those body parts). Fall back to full pool if none match.
  const focusRelevantPool =
    preferredWarmupTargets.length > 0
      ? equipmentPool.filter((e) => exerciseWarmupTargetsOverlap(e, preferredWarmupTargets))
      : equipmentPool;
  const finalPool = focusRelevantPool.length > 0 ? focusRelevantPool : equipmentPool;

  const count = input.duration_minutes <= 25 ? 1 : input.duration_minutes <= 40 ? 2 : 3;
  const movementCounts = new Map<string, number>();
  const recentIds = new Set(input.recent_history?.flatMap((h) => h.exercise_ids) ?? []);
  const warmupTargetCount = Math.min(count, finalPool.length || 2);
  const candidatePoolForWarmup =
    primaryMatchPool.length >= warmupTargetCount ? primaryMatchPool : finalPool;

  const { exercises: chosen } = selectExercises(
    candidatePoolForWarmup,
    input,
    recentIds,
    movementCounts,
    warmupTargetCount,
    rng,
    fatigueState,
    {
      blockType: "warmup",
      preferredWarmupCooldownTargets: preferredWarmupTargets,
      sessionMovementPatternCounts: movementCounts,
      sessionHasBilateralLowerBody: (movementCounts.get("squat") ?? 0) + (movementCounts.get("hinge") ?? 0) > 0,
      historyContext,
    }
  );

  const items: WorkoutItem[] = chosen.map((e) => {
    used.add(e.id);
    let p = getPrescription(e, "warmup", input.energy_level, input.primary_goal, undefined, undefined, input.style_prefs?.user_level);
    let timeSec = p.time_seconds;
    if (timeSec != null && timeSec > WARMUP_ITEM_MAX_SECONDS) {
      timeSec = WARMUP_ITEM_MAX_SECONDS;
    }
    return {
      exercise_id: e.id,
      exercise_name: e.name,
      sets: p.sets,
      reps: p.reps,
      time_seconds: timeSec,
      rest_seconds: p.rest_seconds,
      coaching_cues: p.coaching_cues,
      reasoning_tags: ["warmup", "mobility", ...(e.tags.goal_tags ?? [])],
      unilateral: e.unilateral ?? false,
    };
  });

  const totalMinutes = input.duration_minutes ?? 60;
  const warmupCap = Math.max(1, Math.floor(totalMinutes / 10));
  const partsForWarmupTitle =
    effectiveBodyPartsForWarmup.length > 0
      ? effectiveBodyPartsForWarmup
      : (input.focus_body_parts ?? []);
  const hasFocus =
    partsForWarmupTitle.length > 0 &&
    !partsForWarmupTitle.some((f) => f.toLowerCase().replace(/\s/g, "_") === "full_body");
  const focusLabel = hasFocus
    ? partsForWarmupTitle.map((f) => f.replace(/_/g, " ")).join(" / ")
    : null;
  return {
    block_type: "warmup",
    format: "circuit",
    title: focusLabel ? `Activation (${focusLabel})` : "Activation",
    reasoning: focusLabel
      ? `Movement prep for today's focus: ${focusLabel}. Prepares those muscles and joints for the main work.`
      : "Movement prep and joint mobility for the muscles and joints used in today's work.",
    items,
    estimated_minutes: Math.min(10, 5 + items.length * 2, warmupCap),
  };
}

// --- Build cooldown block (3–6 min): ontology-aware when constraints require mobility; else legacy ---
function buildCooldown(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  options: {
    constraints: ResolvedWorkoutConstraints;
    mainWorkFamilies: string[];
    preferredTargets?: string[];
  }
): WorkoutBlock {
  const minMobility = options.constraints.min_cooldown_mobility_exercises ?? 0;
  const useOntologyCooldown = minMobility > 0 || options.mainWorkFamilies.length > 0;
  const recoveryEmphasis =
    (input.secondary_goals ?? []).some(
      (g) => g.toLowerCase().replace(/\s/g, "_").includes("recovery") || g.toLowerCase().includes("recovery")
    ) || input.primary_goal === "recovery";
  const preferredTargets = [
    ...new Set([
      ...getPreferredCooldownTargetsFromFamilies(options.mainWorkFamilies),
      ...(options.preferredTargets ?? []),
    ]),
  ];

  // Cooldown = stretching only (body-part and workout-type aware via preferredTargets); no cables or weights.
  const equipmentOk = exercises.filter((e) => isCooldownEligibleEquipment(e.equipment_required ?? []));
  const cooldownPool = equipmentOk.filter((e) => isStretchOnlyEligible(e));

  let chosen: Exercise[];
  if (useOntologyCooldown) {
    const maxItems = recoveryEmphasis
      ? (input.duration_minutes <= 30 ? Math.max(minMobility, 4) : Math.max(minMobility, 6))
      : (input.duration_minutes <= 30 ? Math.max(minMobility, 3) : Math.max(minMobility, 4));
    chosen = selectOntologyCooldown(cooldownPool, {
      minMobilityCount: minMobility,
      preferredTargets,
      alreadyUsedIds: used,
      rng,
      maxItems,
    });
    chosen.forEach((e) => used.add(e.id));
  } else {
    const pool = cooldownPool.filter((e) => !used.has(e.id));
    const count =
      input.duration_minutes <= 30
        ? (recoveryEmphasis ? 3 : 2)
        : (recoveryEmphasis ? 5 : 3);
    chosen = [];
    const ids = shuffleWithSeed([...pool], rng);
    for (const e of ids) {
      if (chosen.length >= count) break;
      chosen.push(e);
      used.add(e.id);
    }
  }

  // Breathing only when recovery was chosen (sometimes include breathing).
  if (recoveryEmphasis && chosen.length > 0 && !used.has("breathing_cooldown")) {
    const breath = equipmentOk.find((e) => e.id === "breathing_cooldown") ?? exercises.find((e) => e.id === "breathing_cooldown");
    if (breath && isCooldownEligibleEquipment(breath.equipment_required ?? []) && chosen.length < (useOntologyCooldown ? 5 : 4)) {
      chosen.push(breath);
      used.add(breath.id);
    }
  }

  const items: WorkoutItem[] = chosen.map((e) => {
    const p = getPrescription(e, "cooldown", input.energy_level, input.primary_goal, undefined, undefined, input.style_prefs?.user_level);
    return {
      exercise_id: e.id,
      exercise_name: e.name,
      sets: p.sets,
      reps: p.reps,
      time_seconds: p.time_seconds ?? 30,
      rest_seconds: p.rest_seconds,
      coaching_cues: p.coaching_cues,
      reasoning_tags: ["cooldown", "recovery", ...(e.tags.goal_tags ?? [])],
      unilateral: e.unilateral ?? false,
    };
  });

  const totalMinutes = input.duration_minutes ?? 60;
  const cooldownCap = Math.max(1, Math.floor(totalMinutes / 10));
  const mobilitySecondary = minMobility > 0;
  const title = mobilitySecondary
    ? "Cooldown / Mobility (secondary goal)"
    : useOntologyCooldown
      ? "Cooldown (stretch)"
      : undefined;
  const reasoning = useOntologyCooldown
    ? "Stretching for the body parts and movement patterns you used today. Supports recovery and range of motion."
    : undefined;

  return {
    block_type: "cooldown",
    format: "circuit",
    ...(title ? { title } : {}),
    ...(reasoning ? { reasoning } : {}),
    items,
    estimated_minutes: Math.min(8, 2 + items.length * 2, cooldownCap),
  };
}

// --- Main block: strength (2 compound lifts when goal=strength, then optional supersets) ---
function buildMainStrength(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  rng: () => number,
  wantsSupersets: boolean,
  fatigueVolumeScale?: number,
  fatigueState?: FatigueState,
  sessionFatigueRegions?: Map<string, number>,
  historyContext?: TrainingHistoryContext,
  strengthProfile?: SubFocusProfile | null,
  hikingEnforcement?: HikingSessionEnforcementSnapshot,
  trailRunningEnforcement?: HikingSessionEnforcementSnapshot,
  roadRunningEnforcement?: HikingSessionEnforcementSnapshot,
  soccerEnforcement?: HikingSessionEnforcementSnapshot,
  alpineSkiingEnforcement?: HikingSessionEnforcementSnapshot,
  rockClimbingEnforcement?: HikingSessionEnforcementSnapshot,
  sessionSportPatternCategoryCounts?: Map<string, number>,
  sportPatternHikingEmphasis?: number,
  sportPatternTrailEmphasis?: number,
  sportPatternRoadEmphasis?: number,
  sportPatternSoccerEmphasis?: number,
  sportPatternAlpineEmphasis?: number,
  sportPatternRockClimbingEmphasis?: number,
  intentTrace?: IntentSurvivalCollector,
  mainSelectorTrace?: MainSelectorSessionTrace,
  cardioTargetExerciseShare?: number
): WorkoutBlock[] {
  const normalizeFocus = (value: string) => value.toLowerCase().trim().replace(/\s+/g, "_");
  const isFullBodyStrengthSession =
    input.primary_goal === "strength" &&
    (input.focus_body_parts ?? []).map(normalizeFocus).includes("full_body");
  const isHipThrustVariant = (exercise: Exercise) => /hip[\s_-]*thrust/i.test(exercise.name);
  const classifyUpperLowerBucket = (exercise: Exercise): "upper" | "lower" | "other" => {
    const pattern = (exercise.movement_pattern ?? "").toLowerCase();
    if (pattern === "push" || pattern === "pull") return "upper";
    if (pattern === "squat" || pattern === "hinge" || pattern === "lunge") return "lower";
    const muscles = new Set((exercise.prime_muscles ?? []).map((m) => m.toLowerCase()));
    if (
      muscles.has("chest") ||
      muscles.has("triceps") ||
      muscles.has("shoulders") ||
      muscles.has("lats") ||
      muscles.has("biceps") ||
      muscles.has("upper_back")
    ) {
      return "upper";
    }
    if (
      muscles.has("legs") ||
      muscles.has("quads") ||
      muscles.has("glutes") ||
      muscles.has("hamstrings") ||
      muscles.has("calves")
    ) {
      return "lower";
    }
    return "other";
  };
  const sportPatCounts = sessionSportPatternCategoryCounts ?? new Map<string, number>();
  const hikingEmphasis = sportPatternHikingEmphasis ?? 0;
  const trailEmphasis = sportPatternTrailEmphasis ?? 0;
  const roadEmphasis = sportPatternRoadEmphasis ?? 0;
  const soccerEmphasis = sportPatternSoccerEmphasis ?? 0;
  const alpineEmphasis = sportPatternAlpineEmphasis ?? 0;
  const rockClimbingEmphasis = sportPatternRockClimbingEmphasis ?? 0;
  const snowKind = resolveSnowSportKind(input);
  const snowSportApplies = snowKind != null && snowSportBodyFocusAllows(input);
  const blocks: WorkoutBlock[] = [];
  const goalRules = getGoalRules(input.primary_goal);
  let compoundMin = goalRules.compoundLiftMin ?? 1;
  if (input.duration_minutes <= 30) compoundMin = Math.min(compoundMin, 1);
  if (input.energy_level === "low") compoundMin = Math.min(compoundMin, 1);

  const intentSlugs = strengthProfile ? getStrengthIntentSlugs(strengthProfile) : [];
  const overlayFilter = strengthProfile?.overlayFilter;

  const mainStrengthPatterns = new Set(["squat", "hinge", "push", "pull"]);
  let mainPool = exercises.filter(
    (e) =>
      (e.modality === "strength" || e.modality === "power") &&
      !used.has(e.id) &&
      mainStrengthPatterns.has(effectiveMainWorkPattern(e)) &&
      !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
  );

  let accessoryPool = exercises.filter(
    (e) =>
      (e.modality === "strength" || e.modality === "hypertrophy") &&
      !used.has(e.id) &&
      !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
  );

  // Overlay filtering: only constrain when the overlay resolves to an explicit region.
  // Rock climbing prep keeps main compounds pull-capable even when strength overlay is lower/posterior-only.
  if (overlayFilter && overlayFilter !== "full_body") {
    if (!rockClimbingPatternTransferApplies(input)) {
      mainPool = filterPoolByOverlay(mainPool, overlayFilter);
    }
    accessoryPool = filterPoolByOverlay(accessoryPool, overlayFilter);
  }

  mainPool = applyWeekMainLiftExclusion(mainPool, input);

  const hikingMainRule = hikingPatternTransferApplies(input)
    ? getHikingSlotRuleForBlockType("main_strength")
    : undefined;
  const roadMainRule = roadRunningPatternTransferApplies(input)
    ? getRoadRunningSlotRuleForBlockType("main_strength")
    : undefined;
  const trailMainRule = trailRunningPatternTransferApplies(input)
    ? getTrailRunningSlotRuleForBlockType("main_strength")
    : undefined;
  const soccerMainRule = soccerPatternTransferApplies(input) ? getSoccerSlotRuleForBlockType("main_strength") : undefined;
  const rockMainRule = rockClimbingPatternTransferApplies(input) ? getRockClimbingSlotRule("main_strength") : undefined;
  const snowMainRule = snowSportApplies && snowKind ? getSnowSportSlotRule("main_strength", snowKind) : undefined;
  let hikingMainStrengthMode: "gated" | "fallback" | undefined;
  let roadMainStrengthMode: "gated" | "fallback" | undefined;
  let trailMainStrengthMode: "gated" | "fallback" | undefined;
  let soccerMainStrengthMode: "gated" | "fallback" | undefined;
  let rockMainStrengthMode: "gated" | "fallback" | undefined;
  let snowMainStrengthMode: "gated" | "fallback" | undefined;
  if (hikingMainRule) {
    const gate = gatePoolForHikingSlot(mainPool, "main_strength", {
      applyMainWorkExclusions: true,
      requiredCount: Math.min(compoundMin, 2),
    });
    if (hikingEnforcement) {
      hikingEnforcement.main_strength = { ...gate, planned_main_lift_count: 0 };
    }
    mainPool = gate.poolForSelection;
    hikingMainStrengthMode = sportPatternScoreModeFromPoolMode(gate.poolMode);
  } else if (roadMainRule) {
    const gate = gatePoolForRoadRunningSlot(mainPool, "main_strength", {
      applyMainWorkExclusions: true,
      requiredCount: Math.min(compoundMin, 2),
    });
    if (roadRunningEnforcement) {
      roadRunningEnforcement.main_strength = { ...gate, planned_main_lift_count: 0 };
    }
    mainPool = gate.poolForSelection;
    roadMainStrengthMode = sportPatternScoreModeFromPoolMode(gate.poolMode);
  } else if (trailMainRule) {
    const gate = gatePoolForTrailRunningSlot(mainPool, "main_strength", {
      applyMainWorkExclusions: true,
      requiredCount: Math.min(compoundMin, 2),
    });
    if (trailRunningEnforcement) {
      trailRunningEnforcement.main_strength = { ...gate, planned_main_lift_count: 0 };
    }
    mainPool = gate.poolForSelection;
    trailMainStrengthMode = sportPatternScoreModeFromPoolMode(gate.poolMode);
  } else if (soccerMainRule) {
    const gate = gatePoolForSoccerSlot(mainPool, "main_strength", {
      applyMainWorkExclusions: true,
      requiredCount: Math.min(compoundMin, 2),
    });
    if (soccerEnforcement) {
      soccerEnforcement.main_strength = { ...gate, planned_main_lift_count: 0 };
    }
    mainPool = gate.poolForSelection;
    soccerMainStrengthMode = sportPatternScoreModeFromPoolMode(gate.poolMode);
  } else if (rockMainRule) {
    const gate = gatePoolForRockClimbingSlot(mainPool, "main_strength", {
      applyMainWorkExclusions: true,
      requiredCount: Math.min(compoundMin, 2),
    });
    if (rockClimbingEnforcement) {
      rockClimbingEnforcement.main_strength = { ...gate, planned_main_lift_count: 0 };
    }
    mainPool = gate.poolForSelection;
    rockMainStrengthMode = sportPatternScoreModeFromPoolMode(gate.poolMode);
  } else if (snowMainRule && snowKind) {
    const gate = gatePoolForSnowSportSlot(mainPool, "main_strength", snowKind, {
      applyMainWorkExclusions: true,
      requiredCount: Math.min(compoundMin, 2),
    });
    if (alpineSkiingEnforcement) {
      alpineSkiingEnforcement.main_strength = { ...gate, planned_main_lift_count: 0 };
    }
    mainPool = gate.poolForSelection;
    snowMainStrengthMode = sportPatternScoreModeFromPoolMode(gate.poolMode);
  }

  const targetMainLiftCountByDuration = input.duration_minutes >= 75 ? 4 : input.duration_minutes >= 45 ? 3 : 2;
  const mainLiftCount = Math.min(Math.max(compoundMin, targetMainLiftCountByDuration), mainPool.length);
  if (hikingEnforcement?.main_strength) {
    hikingEnforcement.main_strength.planned_main_lift_count = mainLiftCount;
  }
  if (trailRunningEnforcement?.main_strength) {
    trailRunningEnforcement.main_strength.planned_main_lift_count = mainLiftCount;
  }
  if (roadRunningEnforcement?.main_strength) {
    roadRunningEnforcement.main_strength.planned_main_lift_count = mainLiftCount;
  }
  if (soccerEnforcement?.main_strength) {
    soccerEnforcement.main_strength.planned_main_lift_count = mainLiftCount;
  }
  if (alpineSkiingEnforcement?.main_strength) {
    alpineSkiingEnforcement.main_strength.planned_main_lift_count = mainLiftCount;
  }
  if (rockClimbingEnforcement?.main_strength) {
    rockClimbingEnforcement.main_strength.planned_main_lift_count = mainLiftCount;
  }

  const primaryIntent = intentSlugs[0];
  const surfPopUpPowerSession = hasSurfingPopUpPowerSubFocus(input);
  const getComplementaryStrengthIntents = (intent?: string): string[] => {
    if (!intent) return [];
    if (intent === "deadlift_hinge") return ["squat"];
    if (intent === "squat") return ["deadlift_hinge"];
    if (intent === "bench_press") return surfPopUpPowerSession ? ["overhead_press"] : ["overhead_press", "pull"];
    if (intent === "overhead_press") return surfPopUpPowerSession ? ["bench_press"] : ["bench_press", "pull"];
    if (intent === "pull") return ["bench_press", "overhead_press"];
    return [];
  };

  const templateHint = strengthProfile?.templateHints?.[0];
  const mainReasoning =
    templateHint === "strength_emphasis_lower"
      ? "Compound lifts with lower-body emphasis (squat intent)."
      : templateHint === "strength_emphasis_posterior"
        ? "Compound lifts with posterior-chain emphasis (hinge intent)."
        : templateHint === "strength_emphasis_push"
          ? "Compound lifts with upper-push emphasis (bench/press intent)."
          : templateHint === "strength_emphasis_overhead_push"
            ? "Compound lifts with overhead-push emphasis (overhead intent)."
            : templateHint === "strength_emphasis_pull"
              ? "Compound lifts with pull emphasis (pull intent)."
              : primaryIntent
                ? "Compound lifts with intent-driven selection."
                : "Compound lifts for strength.";

  // Sub-focus anchoring (critical): at least one main lift must match the primary intent slug,
  // and it should be the primary main lift when present.
  const mainStrengthGateSnapshot =
    alpineSkiingEnforcement?.main_strength ??
    rockClimbingEnforcement?.main_strength ??
    hikingEnforcement?.main_strength ??
    roadRunningEnforcement?.main_strength ??
    trailRunningEnforcement?.main_strength ??
    soccerEnforcement?.main_strength;
  const makeMainSelectOpts = (pass_id: string) => ({
    blockType: "main_strength",
    sessionFatigueRegions,
    sessionMovementPatternCounts: movementCounts,
    sessionHasBilateralLowerBody: (movementCounts.get("squat") ?? 0) + (movementCounts.get("hinge") ?? 0) > 0,
    historyContext,
    hikingPatternSlotRule: hikingMainRule,
    hikingPatternScoreMode: hikingMainStrengthMode,
    roadRunningPatternSlotRule: roadMainRule,
    roadRunningPatternScoreMode: roadMainStrengthMode,
    trailRunningPatternSlotRule: trailMainRule,
    trailRunningPatternScoreMode: trailMainStrengthMode,
    soccerPatternSlotRule: soccerMainRule,
    soccerPatternScoreMode: soccerMainStrengthMode,
    rockClimbingPatternSlotRule: rockMainRule,
    rockClimbingPatternScoreMode: rockMainStrengthMode,
    alpineSkiingPatternSlotRule: snowMainRule,
    alpineSkiingPatternScoreMode: snowMainStrengthMode,
    ...(hikingMainRule && hikingPatternTransferApplies(input)
      ? {
          hikingQualityContext: {
            sessionHikingCategoryCounts: sportPatCounts,
            emphasisBucket: hikingEmphasis,
            blockType: "main_strength",
          },
        }
      : {}),
    ...(roadMainRule && roadRunningPatternTransferApplies(input)
      ? {
          roadRunningQualityContext: {
            sessionTrailCategoryCounts: sportPatCounts,
            emphasisBucket: roadEmphasis,
            blockType: "main_strength",
          },
        }
      : {}),
    ...(trailMainRule && trailRunningPatternTransferApplies(input)
      ? {
          trailRunningQualityContext: {
            sessionTrailCategoryCounts: sportPatCounts,
            emphasisBucket: trailEmphasis,
            blockType: "main_strength",
          },
        }
      : {}),
    ...(soccerMainRule && soccerPatternTransferApplies(input)
      ? {
          soccerQualityContext: {
            sessionSoccerCategoryCounts: sportPatCounts,
            emphasisBucket: soccerEmphasis,
            blockType: "main_strength",
          },
        }
      : {}),
    ...(snowMainRule && snowSportApplies
      ? {
          alpineSkiingQualityContext: {
            sessionAlpineCategoryCounts: sportPatCounts,
            emphasisBucket: alpineEmphasis,
            blockType: "main_strength",
            snowSportKind: snowKind ?? undefined,
          },
        }
      : {}),
    ...(rockMainRule && rockClimbingPatternTransferApplies(input)
      ? {
          rockClimbingQualityContext: {
            sessionRockCategoryCounts: sportPatCounts,
            emphasisBucket: rockClimbingEmphasis,
            blockType: "main_strength",
          },
        }
      : {}),
    ...(snowMainRule &&
    snowSportApplies &&
    input.use_reduced_surface_for_alpine_main_scoring !== false
      ? { sportMainScoringMode: "alpine_reduced_surface" as const }
      : {}),
    ...(rockMainRule &&
    rockClimbingPatternTransferApplies(input) &&
    input.use_reduced_surface_for_rock_climbing_main_scoring !== false
      ? { sportMainScoringMode: "rock_reduced_surface" as const }
      : {}),
    ...(roadMainRule &&
    roadRunningPatternTransferApplies(input) &&
    input.use_reduced_surface_for_road_running_main_scoring !== false
      ? { sportMainScoringMode: "road_reduced_surface" as const }
      : {}),
    ...(soccerMainRule &&
    soccerPatternTransferApplies(input) &&
    input.use_reduced_surface_for_soccer_main_scoring !== false
      ? { sportMainScoringMode: "soccer_reduced_surface" as const }
      : {}),
    ...(intentTrace
      ? {
          intent_survival: {
            collector: intentTrace,
            pass_id,
            block_label: "Main strength",
            slot_type: "main_strength",
            sport_gate_applied: !!(
              hikingMainRule ||
              roadMainRule ||
              trailMainRule ||
              soccerMainRule ||
              rockMainRule ||
              snowMainRule
            ),
            slot_rule_id:
              snowMainRule?.slotRuleId ??
              rockMainRule?.slotRuleId ??
              hikingMainRule?.slotRuleId ??
              roadMainRule?.slotRuleId ??
              trailMainRule?.slotRuleId ??
              soccerMainRule?.slotRuleId,
            gate_snapshot: mainStrengthGateSnapshot,
          },
        }
      : {}),
    ...(cardioTargetExerciseShare != null && cardioTargetExerciseShare > 0
      ? { targetCardioExerciseShare: cardioTargetExerciseShare }
      : {}),
  });

  const sportHandles = sportMainSelector(input.sport_slugs?.[0], input, {
    scoreExercise: scoreExercise as ScoreExerciseLike,
    sessionTargetVector: shouldUseSessionTargetVector(input) ? buildSessionTargetVectorFromInput(input) : undefined,
  });

  const pickStrengthMain = (pool: Exercise[], count: number, pass_id: string) =>
    selectExercises(pool, input, recentIds, movementCounts, count, rng, fatigueState, makeMainSelectOpts(pass_id))
      .exercises;

  const intentContractForSportMain =
    input.session_intent_contract ??
    sessionIntentContractForSportSlug(getCanonicalSportSlug(input.sport_slugs?.[0] ?? ""));

  const alpinePickEnv: AlpinePickEnvironment = {
    validateCandidate: () => true,
    onMovementCountCommit: (ex) => {
      movementCounts.set(ex.movement_pattern, (movementCounts.get(ex.movement_pattern) ?? 0) + 1);
    },
    onFatigueRegionCommit: (ex) => {
      if (sessionFatigueRegions) {
        addExerciseFatigueRegionsToSession(sessionFatigueRegions, ex);
      }
    },
  };

  let mainLifts: Exercise[] = [];
  if (sportHandles && snowMainRule && intentContractForSportMain && primarySportIsAlpineSkiing(input)) {
    mainSelectorTrace?.entries.push({
      phase: "main_strength",
      selector: "sport_owned",
      sport_slug: sportHandles.sportSlug,
      notes: [],
    });
    const traceSlot =
      mainSelectorTrace && mainSelectorTrace.entries.length > 0
        ? mainSelectorTrace.entries[mainSelectorTrace.entries.length - 1]
        : undefined;
    mainLifts = sportHandles.selectStrengthMainLifts({
      contract: intentContractForSportMain,
      mainPool,
      mainLiftCount,
      intentSlugs,
      primaryIntent,
      input,
      recentIds,
      movementCounts,
      rng,
      fatigueState,
      sessionFatigueRegions,
      historyContext,
      alpineMainRule: snowMainRule,
      alpineMainStrengthMode: snowMainStrengthMode ?? "fallback",
      sportPatCounts,
      alpineEmphasis,
      replacementCatalog: exercises.filter((e) => !used.has(e.id)),
      pickEnv: alpinePickEnv,
      intentTrace,
      gateSnapshot: alpineSkiingEnforcement?.main_strength,
      traceNotes: traceSlot?.notes,
    });
  } else if (sportHandles && rockMainRule && intentContractForSportMain && primarySportIsRockClimbing(input)) {
    mainSelectorTrace?.entries.push({
      phase: "main_strength",
      selector: "sport_owned",
      sport_slug: sportHandles.sportSlug,
      notes: [],
    });
    const traceSlotRock =
      mainSelectorTrace && mainSelectorTrace.entries.length > 0
        ? mainSelectorTrace.entries[mainSelectorTrace.entries.length - 1]
        : undefined;
    mainLifts = sportHandles.selectStrengthMainLifts({
      contract: intentContractForSportMain,
      mainPool,
      mainLiftCount,
      intentSlugs,
      primaryIntent,
      input,
      recentIds,
      movementCounts,
      rng,
      fatigueState,
      sessionFatigueRegions,
      historyContext,
      alpineMainRule: rockMainRule,
      alpineMainStrengthMode: rockMainStrengthMode ?? "fallback",
      sportPatCounts,
      alpineEmphasis: rockClimbingEmphasis,
      replacementCatalog: exercises.filter((e) => !used.has(e.id)),
      pickEnv: alpinePickEnv,
      intentTrace,
      gateSnapshot: rockClimbingEnforcement?.main_strength,
      traceNotes: traceSlotRock?.notes,
    });
  } else {
    mainSelectorTrace?.entries.push({ phase: "main_strength", selector: "generic", notes: ["generic_main_selector"] });
    mainLifts = genericSelectStrengthMainLifts({
      mainPool,
      mainLiftCount,
      intentSlugs,
      primaryIntent,
      getComplementaryStrengthIntents,
      pick: pickStrengthMain,
    });
    if (snowMainRule && snowSportApplies && snowKind && mainLifts.length > 0) {
      const alpineCatalog = exercises.filter((e) => !used.has(e.id));
      applySnowUpstreamMainLiftsCoverage(snowKind, mainLifts, alpineCatalog, "main_strength");
    }
    if (rockMainRule && rockClimbingPatternTransferApplies(input) && mainLifts.length > 0) {
      const rockCatalog = exercises.filter((e) => !used.has(e.id));
      applyRockUpstreamMainLiftsCoverage(mainLifts, rockCatalog, "main_strength");
    }
  }

  if (isFullBodyStrengthSession && mainLifts.length > 1) {
    let adjusted = [...mainLifts];
    const replaceAt = (idx: number, preferredBucket?: "upper" | "lower") => {
      const occupiedIds = new Set(adjusted.map((e) => e.id));
      const hipThrustAlreadySelected = adjusted.some((e, i) => i !== idx && isHipThrustVariant(e));
      const replacement = mainPool.find((candidate) => {
        if (occupiedIds.has(candidate.id)) return false;
        if (preferredBucket && classifyUpperLowerBucket(candidate) !== preferredBucket) return false;
        if (hipThrustAlreadySelected && isHipThrustVariant(candidate)) return false;
        return true;
      });
      if (replacement) adjusted[idx] = replacement;
    };

    // Keep only one hip thrust variant in broad full-body strength sessions.
    let seenHipThrust = false;
    adjusted.forEach((exercise, idx) => {
      if (!isHipThrustVariant(exercise)) return;
      if (!seenHipThrust) {
        seenHipThrust = true;
        return;
      }
      replaceAt(idx);
    });

    // Bias toward an even upper/lower split for full-body strength.
    const countBucket = (bucket: "upper" | "lower") =>
      adjusted.filter((exercise) => classifyUpperLowerBucket(exercise) === bucket).length;
    let upperCount = countBucket("upper");
    let lowerCount = countBucket("lower");
    while (Math.abs(upperCount - lowerCount) > 1) {
      if (upperCount > lowerCount) {
        const idx = adjusted.findIndex((exercise) => classifyUpperLowerBucket(exercise) === "upper");
        if (idx < 0) break;
        replaceAt(idx, "lower");
      } else {
        const idx = adjusted.findIndex((exercise) => classifyUpperLowerBucket(exercise) === "lower");
        if (idx < 0) break;
        replaceAt(idx, "upper");
      }
      const nextUpper = countBucket("upper");
      const nextLower = countBucket("lower");
      if (nextUpper === upperCount && nextLower === lowerCount) break;
      upperCount = nextUpper;
      lowerCount = nextLower;
    }
    mainLifts = adjusted;
  }

  // When we have exactly 2 main lifts and supersets are wanted, pair them if they're a good superset (push+pull, squat+hinge, etc.)
  const pairMainLifts =
    wantsSupersets &&
    mainLifts.length === 2 &&
    supersetCompatibility(mainLifts[0], mainLifts[1]) !== "bad";

  if (pairMainLifts) {
    const [a, b] = mainLifts;
    used.add(a.id);
    used.add(b.id);
    movementCounts.set(a.movement_pattern, (movementCounts.get(a.movement_pattern) ?? 0) + 1);
    movementCounts.set(b.movement_pattern, (movementCounts.get(b.movement_pattern) ?? 0) + 1);
    const pA = getPrescription(a, "main_strength", input.energy_level, input.primary_goal, false, fatigueVolumeScale, input.style_prefs?.user_level);
    const pB = getPrescription(b, "main_strength", input.energy_level, input.primary_goal, false, fatigueVolumeScale, input.style_prefs?.user_level);
    const itemA: WorkoutItem = {
      exercise_id: a.id,
      exercise_name: a.name,
      sets: pA.sets,
      reps: pA.reps,
      rest_seconds: pA.rest_seconds,
      coaching_cues: pA.coaching_cues,
      reasoning_tags: ["main_lift", "strength", ...(a.tags.goal_tags ?? [])],
      unilateral: a.unilateral ?? false,
    };
    const itemB: WorkoutItem = {
      exercise_id: b.id,
      exercise_name: b.name,
      sets: pB.sets,
      reps: pB.reps,
      rest_seconds: pB.rest_seconds,
      coaching_cues: pB.coaching_cues,
      reasoning_tags: ["main_lift", "strength", ...(b.tags.goal_tags ?? [])],
      unilateral: b.unilateral ?? false,
    };
    // Superset: one rest per round (after the pair A→B). Realistic ~15–20 min for two 5x5 exercises (not full straight-set rest).
    const restPerRoundSec = Math.max(pA.rest_seconds ?? 0, pB.rest_seconds ?? 0);
    const workMinPerRound = 1.5; // both exercises per round; superset is faster than straight sets
    const restForEstimateSec = Math.min(restPerRoundSec, 120); // cap rest in estimate (superset rest typically 1–2 min)
    blocks.push({
      block_type: "main_strength",
      format: "superset",
      title: "Main strength",
      reasoning: mainReasoning + " Superset for time efficiency.",
      items: [itemA, itemB],
      supersetPairs: [[itemA, itemB]],
      estimated_minutes: Math.max(pA.sets, pB.sets) * (workMinPerRound + restForEstimateSec / 60),
    });
  } else {
    for (const mainLift of mainLifts) {
      used.add(mainLift.id);
      movementCounts.set(mainLift.movement_pattern, (movementCounts.get(mainLift.movement_pattern) ?? 0) + 1);
      const p = getPrescription(mainLift, "main_strength", input.energy_level, input.primary_goal, false, fatigueVolumeScale, input.style_prefs?.user_level);
      blocks.push({
        block_type: "main_strength",
        format: "straight_sets",
        title: "Main strength",
          reasoning: mainReasoning,
        items: [
          {
            exercise_id: mainLift.id,
            exercise_name: mainLift.name,
            sets: p.sets,
            reps: p.reps,
            rest_seconds: p.rest_seconds,
            coaching_cues: p.coaching_cues,
            reasoning_tags: ["main_lift", "strength", ...(mainLift.tags.goal_tags ?? [])],
            unilateral: mainLift.unilateral ?? false,
          },
        ],
        estimated_minutes: p.sets * (2 + (p.rest_seconds || 0) / 60),
      });
    }
  }

  // Accessory block control:
  // - cap to 1–2 accessory supersets (instead of letting accessories dominate)
  // - keep accessory exercise sets lighter than the main lift sets
  const mainItemSets = blocks.flatMap((b) => b.items.map((i) => i.sets ?? 0));
  const mainItemSetsMax = Math.max(1, ...mainItemSets);
  const accessoryItemSetsCapByDuration = input.duration_minutes <= 30 ? 3 : 4;
  const accessoryItemSetsCap = Math.max(3, Math.min(accessoryItemSetsCapByDuration, mainItemSetsMax));

  const accessoryPairCountTarget = input.duration_minutes <= 30 ? 1 : input.duration_minutes >= 75 ? 3 : 2;
  let pairCount = accessoryPairCountTarget;
  if (input.energy_level === "low") pairCount = Math.min(pairCount, 1);
  if (pairCount && wantsSupersets) {
    let available = accessoryPool.filter((e) => !used.has(e.id));
    const pairNeededItems = pairCount * 2;

    const hikingAccessoryRule = hikingPatternTransferApplies(input)
      ? getHikingSlotRuleForBlockType("accessory")
      : undefined;
    const roadAccessoryRule = roadRunningPatternTransferApplies(input)
      ? getRoadRunningSlotRuleForBlockType("accessory")
      : undefined;
    const trailAccessoryRule = trailRunningPatternTransferApplies(input)
      ? getTrailRunningSlotRuleForBlockType("accessory")
      : undefined;
    const soccerAccessoryRule = soccerPatternTransferApplies(input) ? getSoccerSlotRuleForBlockType("accessory") : undefined;
    const rockAccessoryRule = rockClimbingPatternTransferApplies(input) ? getRockClimbingSlotRule("accessory") : undefined;
    const snowAccessoryRule = snowSportApplies && snowKind ? getSnowSportSlotRule("accessory", snowKind) : undefined;
    let hikingAccessoryMode: "gated" | "fallback" | undefined;
    let roadAccessoryMode: "gated" | "fallback" | undefined;
    let trailAccessoryMode: "gated" | "fallback" | undefined;
    let soccerAccessoryMode: "gated" | "fallback" | undefined;
    let rockAccessoryMode: "gated" | "fallback" | undefined;
    let snowAccessoryMode: "gated" | "fallback" | undefined;
    if (hikingAccessoryRule) {
      const accGate = gatePoolForHikingSlot(available, "accessory", {
        requiredCount: pairNeededItems,
      });
      if (hikingEnforcement) hikingEnforcement.accessory = accGate;
      available = accGate.poolForSelection;
      hikingAccessoryMode = sportPatternScoreModeFromPoolMode(accGate.poolMode);
    } else if (roadAccessoryRule) {
      const accGate = gatePoolForRoadRunningSlot(available, "accessory", {
        requiredCount: pairNeededItems,
      });
      if (roadRunningEnforcement) roadRunningEnforcement.accessory = accGate;
      available = accGate.poolForSelection;
      roadAccessoryMode = sportPatternScoreModeFromPoolMode(accGate.poolMode);
    } else if (trailAccessoryRule) {
      const accGate = gatePoolForTrailRunningSlot(available, "accessory", {
        requiredCount: pairNeededItems,
      });
      if (trailRunningEnforcement) trailRunningEnforcement.accessory = accGate;
      available = accGate.poolForSelection;
      trailAccessoryMode = sportPatternScoreModeFromPoolMode(accGate.poolMode);
    } else if (soccerAccessoryRule) {
      const accGate = gatePoolForSoccerSlot(available, "accessory", {
        requiredCount: pairNeededItems,
      });
      if (soccerEnforcement) soccerEnforcement.accessory = accGate;
      available = accGate.poolForSelection;
      soccerAccessoryMode = sportPatternScoreModeFromPoolMode(accGate.poolMode);
    } else if (rockAccessoryRule) {
      const accGate = gatePoolForRockClimbingSlot(available, "accessory", {
        requiredCount: pairNeededItems,
      });
      if (rockClimbingEnforcement) rockClimbingEnforcement.accessory = accGate;
      available = accGate.poolForSelection;
      rockAccessoryMode = sportPatternScoreModeFromPoolMode(accGate.poolMode);
    } else if (snowAccessoryRule && snowKind) {
      const accGate = gatePoolForSnowSportSlot(available, "accessory", snowKind, {
        requiredCount: pairNeededItems,
      });
      if (alpineSkiingEnforcement) alpineSkiingEnforcement.accessory = accGate;
      available = accGate.poolForSelection;
      snowAccessoryMode = sportPatternScoreModeFromPoolMode(accGate.poolMode);
    }

    const primaryIntentAccessoryMatches = primaryIntent
      ? available.filter((e) => exerciseHasStrengthSubFocusSlug(e, primaryIntent))
      : [];
    const complementaryIntents = getComplementaryStrengthIntents(primaryIntent);
    const complementaryIntentMatches =
      primaryIntent && complementaryIntents.length
        ? available.filter((e) => complementaryIntents.some((slug) => exerciseHasStrengthSubFocusSlug(e, slug)))
        : [];
    const anyIntentMatches =
      intentSlugs.length > 0
        ? available.filter((e) => intentSlugs.some((slug) => exerciseHasStrengthSubFocusSlug(e, slug)))
        : [];

    const poolForPairsCandidates =
      primaryIntentAccessoryMatches.length >= pairNeededItems
        ? primaryIntentAccessoryMatches
        : primaryIntentAccessoryMatches.length > 0 &&
            primaryIntentAccessoryMatches.length + complementaryIntentMatches.length >= pairNeededItems
          ? [...primaryIntentAccessoryMatches, ...complementaryIntentMatches]
          : anyIntentMatches.length >= pairNeededItems
            ? anyIntentMatches
            : available;

    let poolForPairs = poolForPairsCandidates.slice(0, Math.min(poolForPairsCandidates.length, pairNeededItems * 2));

    if (
      hikingAccessoryMode === "gated" &&
      hikingPatternTransferApplies(input) &&
      poolForPairs.length > 1
    ) {
      poolForPairs = [...poolForPairs].sort((a, b) => {
        const qa = computeHikingWithinPoolQualityScore(a, {
          sessionHikingCategoryCounts: sportPatCounts,
          emphasisBucket: hikingEmphasis,
          blockType: "accessory",
        }).total;
        const qb = computeHikingWithinPoolQualityScore(b, {
          sessionHikingCategoryCounts: sportPatCounts,
          emphasisBucket: hikingEmphasis,
          blockType: "accessory",
        }).total;
        return qb - qa;
      });
      poolForPairs = poolForPairs.slice(0, Math.min(poolForPairs.length, pairNeededItems * 2));
    } else if (
      roadAccessoryMode === "gated" &&
      roadRunningPatternTransferApplies(input) &&
      poolForPairs.length > 1
    ) {
      poolForPairs = [...poolForPairs].sort((a, b) => {
        const qa = computeRoadRunningWithinPoolQualityScore(a, {
          sessionTrailCategoryCounts: sportPatCounts,
          emphasisBucket: roadEmphasis,
          blockType: "accessory",
        }).total;
        const qb = computeRoadRunningWithinPoolQualityScore(b, {
          sessionTrailCategoryCounts: sportPatCounts,
          emphasisBucket: roadEmphasis,
          blockType: "accessory",
        }).total;
        return qb - qa;
      });
      poolForPairs = poolForPairs.slice(0, Math.min(poolForPairs.length, pairNeededItems * 2));
    } else if (
      trailAccessoryMode === "gated" &&
      trailRunningPatternTransferApplies(input) &&
      poolForPairs.length > 1
    ) {
      poolForPairs = [...poolForPairs].sort((a, b) => {
        const qa = computeTrailRunningWithinPoolQualityScore(a, {
          sessionTrailCategoryCounts: sportPatCounts,
          emphasisBucket: trailEmphasis,
          blockType: "accessory",
        }).total;
        const qb = computeTrailRunningWithinPoolQualityScore(b, {
          sessionTrailCategoryCounts: sportPatCounts,
          emphasisBucket: trailEmphasis,
          blockType: "accessory",
        }).total;
        return qb - qa;
      });
      poolForPairs = poolForPairs.slice(0, Math.min(poolForPairs.length, pairNeededItems * 2));
    } else if (
      soccerAccessoryMode === "gated" &&
      soccerPatternTransferApplies(input) &&
      poolForPairs.length > 1
    ) {
      poolForPairs = [...poolForPairs].sort((a, b) => {
        const qa = computeSoccerWithinPoolQualityScore(a, {
          sessionSoccerCategoryCounts: sportPatCounts,
          emphasisBucket: soccerEmphasis,
          blockType: "accessory",
        }).total;
        const qb = computeSoccerWithinPoolQualityScore(b, {
          sessionSoccerCategoryCounts: sportPatCounts,
          emphasisBucket: soccerEmphasis,
          blockType: "accessory",
        }).total;
        return qb - qa;
      });
      poolForPairs = poolForPairs.slice(0, Math.min(poolForPairs.length, pairNeededItems * 2));
    } else if (
      rockAccessoryRule &&
      rockClimbingPatternTransferApplies(input) &&
      poolForPairs.length > 1
    ) {
      poolForPairs = [...poolForPairs].sort((a, b) => {
        const qa = computeRockClimbingWithinPoolQualityScore(a, {
          sessionRockCategoryCounts: sportPatCounts,
          emphasisBucket: rockClimbingEmphasis,
          blockType: "accessory",
        }).total;
        const qb = computeRockClimbingWithinPoolQualityScore(b, {
          sessionRockCategoryCounts: sportPatCounts,
          emphasisBucket: rockClimbingEmphasis,
          blockType: "accessory",
        }).total;
        return qb - qa;
      });
      poolForPairs = poolForPairs.slice(0, Math.min(poolForPairs.length, pairNeededItems * 2));
    } else if (
      snowAccessoryRule &&
      snowSportApplies &&
      poolForPairs.length > 1
    ) {
      poolForPairs = [...poolForPairs].sort((a, b) => {
        const qa = computeAlpineSkiingWithinPoolQualityScore(a, {
          sessionAlpineCategoryCounts: sportPatCounts,
          emphasisBucket: alpineEmphasis,
          blockType: "accessory",
          snowSportKind: snowKind ?? undefined,
        }).total;
        const qb = computeAlpineSkiingWithinPoolQualityScore(b, {
          sessionAlpineCategoryCounts: sportPatCounts,
          emphasisBucket: alpineEmphasis,
          blockType: "accessory",
          snowSportKind: snowKind ?? undefined,
        }).total;
        return qb - qa;
      });
      poolForPairs = poolForPairs.slice(0, Math.min(poolForPairs.length, pairNeededItems * 2));
    }

    if (trailRunningPatternTransferApplies(input)) {
      const fwd = sportPatCounts.get("_session_trail_forward_lunge_family") ?? 0;
      if (fwd >= 2 && poolForPairs.length > pairNeededItems) {
        const noMoreForward = poolForPairs.filter((e) => !isTrailForwardSteppingLungePattern(e));
        if (noMoreForward.length >= pairNeededItems) {
          poolForPairs = noMoreForward;
        }
      }
    }

    let pairs = pickBestSupersetPairs(poolForPairs, pairCount, used) as [Exercise, Exercise][];
    if (sportHandles?.sportSlug === "rock_climbing" && rockAccessoryRule && pairs.length > 0 && mainLifts.length > 0) {
      mainSelectorTrace?.entries.push({
        phase: "accessory",
        selector: "sport_owned",
        sport_slug: sportHandles.sportSlug,
        notes: ["rock_climbing_sport_owned:accessory_coverage"],
      });
      const rockAccCatalog = exercises.filter((e) => !used.has(e.id));
      sportHandles.applyStrengthAccessoryCoverage({
        mainLifts,
        pairs: pairs as Exercise[][],
        replacementCatalog: rockAccCatalog,
      });
    } else if (sportHandles && snowAccessoryRule && pairs.length > 0 && mainLifts.length > 0) {
      mainSelectorTrace?.entries.push({
        phase: "accessory",
        selector: "sport_owned",
        sport_slug: sportHandles.sportSlug,
        notes: ["alpine_sport_owned:accessory_coverage"],
      });
      const alpineAccCatalog = exercises.filter((e) => !used.has(e.id));
      sportHandles.applyStrengthAccessoryCoverage({
        mainLifts,
        pairs: pairs as Exercise[][],
        replacementCatalog: alpineAccCatalog,
      });
    } else if (
      rockAccessoryRule &&
      rockClimbingPatternTransferApplies(input) &&
      pairs.length > 0 &&
      mainLifts.length > 0
    ) {
      mainSelectorTrace?.entries.push({ phase: "accessory", selector: "generic", notes: ["rock_accessory_coverage"] });
      const rockAccCatalog = exercises.filter((e) => !used.has(e.id));
      applyRockUpstreamAccessoryPairsCoverage(mainLifts, pairs as Exercise[][], rockAccCatalog, "accessory");
    } else if (
      snowAccessoryRule &&
      snowSportApplies &&
      snowKind &&
      pairs.length > 0 &&
      mainLifts.length > 0
    ) {
      mainSelectorTrace?.entries.push({ phase: "accessory", selector: "generic", notes: ["accessory_coverage"] });
      const alpineAccCatalog = exercises.filter((e) => !used.has(e.id));
      applySnowUpstreamAccessoryPairsCoverage(snowKind, mainLifts, pairs as Exercise[][], alpineAccCatalog, "accessory");
    }
    for (const [exA, exB] of pairs) {
      used.add(exA.id);
      used.add(exB.id);
      if (hikingPatternTransferApplies(input)) {
        addExerciseToHikingSessionCounts(exA, sportPatCounts);
        addExerciseToHikingSessionCounts(exB, sportPatCounts);
      } else if (roadRunningPatternTransferApplies(input)) {
        addExerciseToRoadRunningSessionCounts(exA, sportPatCounts);
        addExerciseToRoadRunningSessionCounts(exB, sportPatCounts);
      } else if (soccerPatternTransferApplies(input)) {
        addExerciseToSoccerSessionCounts(exA, sportPatCounts);
        addExerciseToSoccerSessionCounts(exB, sportPatCounts);
      } else if (trailRunningPatternTransferApplies(input)) {
        addExerciseToTrailRunningSessionCounts(exA, sportPatCounts);
        addExerciseToTrailRunningSessionCounts(exB, sportPatCounts);
      } else if (rockClimbingPatternTransferApplies(input)) {
        addExerciseToRockSessionCounts(exA, sportPatCounts);
        addExerciseToRockSessionCounts(exB, sportPatCounts);
      } else if (snowSportApplies) {
        addExerciseToAlpineSessionCounts(exA, sportPatCounts);
        addExerciseToAlpineSessionCounts(exB, sportPatCounts);
      }
      if (sessionFatigueRegions) {
        addExerciseFatigueRegionsToSession(sessionFatigueRegions, exA);
        addExerciseFatigueRegionsToSession(sessionFatigueRegions, exB);
      }
    }
    const items: WorkoutItem[] = pairs.flatMap(([exA, exB]) => {
      const pA = getPrescription(exA, "main_strength", input.energy_level, input.primary_goal, true, fatigueVolumeScale, input.style_prefs?.user_level);
      const pB = getPrescription(exB, "main_strength", input.energy_level, input.primary_goal, true, fatigueVolumeScale, input.style_prefs?.user_level);
      return [
        {
          exercise_id: exA.id,
          exercise_name: exA.name,
          sets: Math.max(3, Math.min(pA.sets ?? 3, accessoryItemSetsCap)),
          reps: pA.reps,
          rest_seconds: pA.rest_seconds,
          coaching_cues: pA.coaching_cues,
          reasoning_tags: ["superset", "secondary_strength", "accessory", ...(exA.tags.goal_tags ?? [])],
          unilateral: exA.unilateral ?? false,
        },
        {
          exercise_id: exB.id,
          exercise_name: exB.name,
          sets: Math.max(3, Math.min(pB.sets ?? 3, accessoryItemSetsCap)),
          reps: pB.reps,
          rest_seconds: pB.rest_seconds,
          coaching_cues: pB.coaching_cues,
          reasoning_tags: ["superset", "secondary_strength", "accessory", ...(exB.tags.goal_tags ?? [])],
          unilateral: exB.unilateral ?? false,
        },
      ];
    });
    if (items.length) {
      const supersetPairs: [WorkoutItem, WorkoutItem][] = [];
      for (let i = 0; i < pairs.length; i++) {
        supersetPairs.push([items[2 * i], items[2 * i + 1]]);
      }
      // When high energy, add core to the accessory section.
      const accessoryItems = [...items];
      if (input.energy_level === "high" && pairCount === 1) {
        const coreFamily = (e: Exercise) =>
          e.primary_movement_family?.toLowerCase().replace(/\s/g, "_") === "core" ||
          e.movement_pattern === "rotate";
        const coreCandidate = accessoryPool.find((e) => !used.has(e.id) && coreFamily(e));
        if (coreCandidate) {
          used.add(coreCandidate.id);
          const pCore = getPrescription(coreCandidate, "main_strength", input.energy_level, input.primary_goal, true, fatigueVolumeScale, input.style_prefs?.user_level);
          accessoryItems.push({
            exercise_id: coreCandidate.id,
            exercise_name: coreCandidate.name,
            sets: Math.max(3, Math.min(pCore.sets ?? 3, accessoryItemSetsCap)),
            reps: pCore.reps,
            rest_seconds: pCore.rest_seconds,
            coaching_cues: pCore.coaching_cues,
            reasoning_tags: ["secondary_strength", "accessory", "core", ...(coreCandidate.tags.goal_tags ?? [])],
            unilateral: coreCandidate.unilateral ?? false,
          });
        }
      }
      // ~15 min per superset (take or remove based on warmup/cooldown).
      const supersetCount = supersetPairs.length;
      blocks.push({
        block_type: "accessory",
        format: "superset",
        title: "Secondary strength",
        reasoning: "Supporting strength work aligned to the selected intent.",
        items: accessoryItems,
        supersetPairs,
        estimated_minutes: supersetCount * 15,
      });
    }
  }

  return blocks;
}

/** Power goal: build a dedicated Power block with 2–4 explosive/power exercises (lower body when focus is lower). */
function buildPowerBlock(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  rng: () => number,
  fatigueVolumeScale?: number,
  fatigueState?: FatigueState,
  sessionFatigueRegions?: Map<string, number>,
  historyContext?: TrainingHistoryContext
): WorkoutBlock[] {
  const focus = input.focus_body_parts ?? [];
  const isLower = focus.length === 0 || focus.some((f) => f.toLowerCase().replace(/\s/g, "_") === "lower" || f.toLowerCase() === "lower_body");
  const lowerPatterns = new Set(["squat", "hinge", "locomotion"]);
  const lowerMuscles = new Set(["legs", "quads", "glutes", "hamstrings", "calves"]);

  const powerPool = exercises.filter((e) => {
    if (used.has(e.id)) return false;
    const hasPower = e.modality === "power" || (e.tags?.goal_tags ?? []).includes("power");
    const isExplosiveConditioning =
      e.modality === "conditioning" && (e.tags?.goal_tags ?? []).includes("power") && (e.tags?.stimulus ?? []).some((s) => String(s).toLowerCase().includes("plyometric"));
    if (!hasPower && !isExplosiveConditioning) return false;
    if (e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_"))) return false;
    if (e.fatigue_cost === "high") return false;
    if (isLower) {
      const pattern = effectiveMainWorkPattern(e);
      const muscles = new Set((e.muscle_groups ?? []).map((m) => m.toLowerCase()));
      const family = (e.primary_movement_family ?? "").toLowerCase().replace(/\s/g, "_");
      const isLowerBody =
        lowerPatterns.has(pattern) ||
        family === "lower_body" ||
        muscles.has("legs") ||
        muscles.has("quads") ||
        muscles.has("glutes") ||
        muscles.has("hamstrings");
      if (!isLowerBody) return false;
    }
    return true;
  });

  const wantCount = input.duration_minutes <= 30 ? 2 : input.duration_minutes <= 45 ? 3 : 4;
  const count = Math.min(wantCount, Math.max(2, powerPool.length));
  if (count < 1 || powerPool.length < 1) return [];

  const { exercises: chosen } = selectExercises(
    powerPool,
    input,
    recentIds,
    movementCounts,
    count,
    rng,
    fatigueState,
    {
      blockType: "power",
      sessionFatigueRegions,
      sessionMovementPatternCounts: movementCounts,
      historyContext,
    }
  );

  if (chosen.length === 0) return [];

  const items: WorkoutItem[] = [];
  let estMinutes = 0;
  for (const e of chosen) {
    used.add(e.id);
    movementCounts.set(e.movement_pattern ?? "other", (movementCounts.get(e.movement_pattern ?? "other") ?? 0) + 1);
    const p = getPrescription(e, "power", input.energy_level, "power", false, fatigueVolumeScale, input.style_prefs?.user_level);
    items.push({
      exercise_id: e.id,
      exercise_name: e.name,
      sets: p.sets,
      reps: p.reps,
      rest_seconds: p.rest_seconds,
      coaching_cues: p.coaching_cues,
      reasoning_tags: ["power", "explosive", ...(e.tags?.goal_tags ?? [])],
      unilateral: e.unilateral ?? false,
    });
    estMinutes += (p.sets ?? 3) * (2 + (p.rest_seconds ?? 90) / 60);
  }

  return [
    {
      block_type: "power",
      format: "straight_sets",
      title: "Power",
      reasoning: "Explosive intent; rate of force development. Full recovery between sets.",
      items,
      estimated_minutes: Math.min(Math.ceil(estMinutes), 35),
    },
  ];
}

/** Effective legacy movement pattern for main-work pool (ontology movement_patterns or legacy movement_pattern). */
function effectiveMainWorkPattern(e: Exercise): string {
  return getLegacyMovementPattern({
    movement_patterns: e.movement_patterns,
    movement_pattern: e.movement_pattern,
  });
}

/** Primary fine movement pattern (horizontal_push, vertical_pull, etc.) when set; undefined otherwise. */
function getPrimaryFineMovementPattern(e: Exercise): string | undefined {
  const first = e.movement_patterns?.[0];
  if (!first) return undefined;
  return first.toLowerCase().replace(/\s/g, "_");
}

/** Upper-body calisthenics: push-up, handstand, pull-up families only (horizontal_push, vertical_push, vertical_pull). */
const CALISTHENICS_UPPER_PREFERRED_FINE_PATTERNS = new Set([
  "horizontal_push",
  "vertical_push",
  "vertical_pull",
]);

function isCalisthenicsUpperPreferredPattern(e: Exercise): boolean {
  const fine = getPrimaryFineMovementPattern(e);
  if (fine && CALISTHENICS_UPPER_PREFERRED_FINE_PATTERNS.has(fine)) return true;
  const legacy = effectiveMainWorkPattern(e);
  return legacy === "push" || legacy === "pull";
}

function isButtKickRunConditioning(e: Exercise): boolean {
  const id = (e.id ?? "").toLowerCase();
  const name = (e.name ?? "").toLowerCase();
  return id.includes("butt_kick") || name.includes("butt kick");
}

/** Pick conditioning exercise: prefer direct sub-focus slug match (intent), then preferred_zone2_cardio modalities, else random. */
function pickConditioningExercise(
  pool: Exercise[],
  preferredModalities: string[] | undefined,
  rng: () => number,
  preferredSubFocusSlugs?: string[]
): Exercise | undefined {
  if (!pool.length) return undefined;
  let candidatePool = pool;
  if (preferredSubFocusSlugs?.length) {
    const directMatch = pool.filter((e) =>
      preferredSubFocusSlugs.some((slug) => exerciseHasSubFocusSlug(e, slug))
    );
    if (directMatch.length > 0) candidatePool = directMatch;
  }

  // Butt-kick run variants are useful occasionally but should be rare when other conditioning options exist.
  if (candidatePool.length > 1) {
    const nonButtKick = candidatePool.filter((e) => !isButtKickRunConditioning(e));
    if (nonButtKick.length > 0 && rng() < 0.9) {
      candidatePool = nonButtKick;
    }
  }

  if (preferredModalities?.length) {
    const normalized = preferredModalities.map((m) => m.toLowerCase().replace(/\s/g, "_"));
    const preferred = candidatePool.filter((e) => {
      const id = e.id.toLowerCase();
      const name = e.name.toLowerCase();
      return normalized.some((n) => id.includes(n) || name.includes(n));
    });
    if (preferred.length) {
      return preferred[Math.floor(rng() * preferred.length)];
    }
  }
  return candidatePool[Math.floor(rng() * candidatePool.length)];
}

/**
 * Conditioning + endurance ranked intents from manual goal_sub_focus (excludes region overlays).
 * Used to bias session finishers when primary work is strength/hypertrophy/etc.
 */
function getCardioFinisherIntentSlugs(input: GenerateWorkoutInput): string[] | undefined {
  const gsf = input.goal_sub_focus ?? {};
  const gw = input.goal_sub_focus_weights ?? {};
  const scored: { slug: string; w: number }[] = [];
  for (const goalSlug of ["conditioning", "endurance"] as const) {
    const slugs = gsf[goalSlug];
    if (!slugs?.length) continue;
    const wArr = gw[goalSlug] ?? slugs.map(() => 1 / slugs.length);
    for (let i = 0; i < slugs.length; i++) {
      const s = slugs[i]!;
      if (CONDITIONING_SUB_FOCUS_OVERLAYS.has(s)) continue;
      scored.push({ slug: s, w: wArr[i] ?? 0 });
    }
  }
  scored.sort((a, b) => b.w - a.w);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const { slug } of scored) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out.length ? out : undefined;
}

function narrowCardioPoolByConditioningIntents(pool: Exercise[], intentSlugs: string[]): Exercise[] {
  if (!pool.length || !intentSlugs.length) return pool;
  const top = intentSlugs[0];
  if (!top) return pool;
  if (top === "durability") {
    const z = pool.filter((e) => exerciseHasSubFocusSlug(e, "zone2_aerobic_base"));
    return z.length ? z : pool;
  }
  if (top === "hills") {
    const hillPref = pool.filter((e) => exerciseHasSubFocusSlug(e, "hills") || isHillBiasExercise(e));
    return hillPref.length ? hillPref : pool;
  }
  if (top === "intervals" || top === "intervals_hiit") {
    const ip = pool.filter(
      (e) => exerciseHasSubFocusSlug(e, "intervals_hiit") || exerciseHasSubFocusSlug(e, "intervals")
    );
    return ip.length ? ip : pool;
  }
  if (top === "zone2_aerobic_base" || top === "zone2_long_steady") {
    const z = pool.filter((e) => exerciseHasSubFocusSlug(e, "zone2_aerobic_base"));
    return z.length ? z : pool;
  }
  if (top === "threshold_tempo") {
    const t = pool.filter((e) => exerciseHasSubFocusSlug(e, "threshold_tempo"));
    return t.length ? t : pool;
  }
  const direct = pool.filter((e) => intentSlugs.some((s) => exerciseHasSubFocusSlug(e, s)));
  return direct.length ? direct : pool;
}

/** True when conditioning exercise is explosive/plyometric (box jumps, jump squats) — prescribe as sets of reps or short time, not one long block. */
function isExplosiveConditioning(exercise: Exercise): boolean {
  const stimulus = exercise.tags?.stimulus ?? [];
  if (stimulus.some((s) => s.toLowerCase().replace(/\s/g, "_") === "plyometric")) return true;
  if (exercise.impact_level === "high" && exercise.modality === "conditioning") return true;
  return false;
}

/** True when conditioning cannot be sustained for 8+ min straight — use rounds of max 1 min work with rest (burpees, KB swings, high knees, etc.). */
function isHighIntensityConditioning(exercise: Exercise): boolean {
  if (exercise.modality !== "conditioning") return false;
  if (HIGH_INTENSITY_CONDITIONING_IDS.has(exercise.id)) return true;
  const stimulus = exercise.tags?.stimulus ?? [];
  if (stimulus.some((s) => ["plyometric", "anaerobic"].includes(s.toLowerCase().replace(/\s/g, "_")))) return true;
  if (exercise.impact_level === "high") return true;
  return false;
}

/**
 * Sprint/burst locomotion conditioning must be programmed as short repeated efforts
 * (e.g. piston runs, sprint-in-place, shuttle bursts), not long continuous minutes.
 */
function isSprintBurstConditioning(exercise: Exercise): boolean {
  if (exercise.modality !== "conditioning") return false;
  const id = exercise.id.toLowerCase();
  const name = exercise.name.toLowerCase();
  const tags = [
    ...(exercise.tags?.stimulus ?? []),
    ...(exercise.tags?.attribute_tags ?? []),
    ...(exercise.tags?.goal_tags ?? []),
    ...(exercise.tags?.sport_tags ?? []),
  ]
    .map((t) => String(t).toLowerCase().replace(/\s/g, "_"));
  const hasBurstTag = tags.some((t) =>
    ["speed", "acceleration", "anaerobic", "sprint", "athleticism"].includes(t)
  );
  const sprintLikeName = /\b(piston|sprint|shuttle|high[_\s-]?knee|butt[_\s-]?kick)\b/.test(`${id} ${name}`);
  const explicitlySteady = tags.some((t) => t.includes("zone2") || t.includes("aerobic_base") || t.includes("tempo"));
  return (hasBurstTag || sprintLikeName) && !explicitlySteady;
}

type ConditioningProtocolKind =
  | "sprint_burst"
  | "high_intensity_reps"
  | "high_intensity_timed"
  | "explosive"
  | "intent_driven"
  | "default_interval";

function getConditioningProtocolKind(
  exercise: Exercise,
  primaryIntent?: string
): ConditioningProtocolKind {
  if (isSprintBurstConditioning(exercise)) return "sprint_burst";
  if (isHighIntensityConditioning(exercise)) {
    return REP_BASED_HIGH_INTENSITY_CONDITIONING_IDS.has(exercise.id)
      ? "high_intensity_reps"
      : "high_intensity_timed";
  }
  if (isExplosiveConditioning(exercise)) return "explosive";
  if (primaryIntent != null) return "intent_driven";
  return "default_interval";
}

function conditioningProtocolReasonTag(kind: ConditioningProtocolKind): string {
  switch (kind) {
    case "sprint_burst":
      return "conditioning_protocol_sprint_burst";
    case "high_intensity_reps":
      return "conditioning_protocol_hi_reps";
    case "high_intensity_timed":
      return "conditioning_protocol_hi_timed";
    case "explosive":
      return "conditioning_protocol_explosive";
    case "intent_driven":
      return "conditioning_protocol_intent";
    default:
      return "conditioning_protocol_default_interval";
  }
}

function getConditioningStructureForExercise(
  exercise: Exercise,
  conditioningMinutes: number,
  primaryGoal: PrimaryGoal,
  primaryIntent?: string
) {
  const normalizedIntent = primaryIntent?.toLowerCase().replace(/\s/g, "_");
  const zone2Intent =
    normalizedIntent === "zone2_aerobic_base" ||
    normalizedIntent === "zone2_long_steady" ||
    normalizedIntent === "zone2_block";
  const kind = getConditioningProtocolKind(exercise, primaryIntent);
  if (kind === "sprint_burst") return getSprintBurstConditioningStructure(conditioningMinutes);
  if (kind === "high_intensity_reps") return getRepBasedHighIntensityConditioningStructure(conditioningMinutes);
  if (kind === "high_intensity_timed") return getHighIntensityConditioningStructure(conditioningMinutes);
  if (kind === "explosive") return getExplosiveConditioningStructure();
  if (kind === "intent_driven") {
    if (zone2Intent && !isZone2Conditioning(exercise)) {
      return getNonZone2ConditioningIntervalStructure(conditioningMinutes);
    }
    return getConditioningStructureByIntent(
      conditioningMinutes,
      primaryIntent ?? undefined,
      exercise.equipment_required ?? [],
      primaryGoal
    );
  }
  if (!isZone2Conditioning(exercise)) {
    return getNonZone2ConditioningIntervalStructure(conditioningMinutes);
  }
  return getConditioningIntervalStructure(
    conditioningMinutes,
    primaryGoal,
    exercise.equipment_required ?? []
  );
}

// --- Main block: hypertrophy / body recomp / calisthenics (2–4 supersets) ---
function buildMainHypertrophy(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  rng: () => number,
  wantsSupersets: boolean,
  fatigueVolumeScale?: number,
  fatigueState?: FatigueState,
  sessionFatigueRegions?: Map<string, number>,
  historyContext?: TrainingHistoryContext,
  hikingEnforcement?: HikingSessionEnforcementSnapshot,
  trailRunningEnforcement?: HikingSessionEnforcementSnapshot,
  roadRunningEnforcement?: HikingSessionEnforcementSnapshot,
  soccerEnforcement?: HikingSessionEnforcementSnapshot,
  alpineSkiingEnforcement?: HikingSessionEnforcementSnapshot,
  rockClimbingEnforcement?: HikingSessionEnforcementSnapshot,
  sessionSportPatternCategoryCounts?: Map<string, number>,
  sportPatternHikingEmphasis?: number,
  sportPatternTrailEmphasis?: number,
  sportPatternRoadEmphasis?: number,
  sportPatternSoccerEmphasis?: number,
  sportPatternAlpineEmphasis?: number,
  sportPatternRockClimbingEmphasis?: number,
  intentTrace?: IntentSurvivalCollector,
  mainSelectorTrace?: MainSelectorSessionTrace,
  cardioTargetExerciseShare?: number
): WorkoutBlock[] {
  const sportPatCounts = sessionSportPatternCategoryCounts ?? new Map<string, number>();
  const hikingEmphasis = sportPatternHikingEmphasis ?? 0;
  const trailEmphasis = sportPatternTrailEmphasis ?? 0;
  const roadEmphasisH = sportPatternRoadEmphasis ?? 0;
  const soccerEmphasisH = sportPatternSoccerEmphasis ?? 0;
  const alpineEmphasis = sportPatternAlpineEmphasis ?? 0;
  const rockClimbingEmphasisH = sportPatternRockClimbingEmphasis ?? 0;
  const snowKindH = resolveSnowSportKind(input);
  const snowSportAppliesH = snowKindH != null && snowSportBodyFocusAllows(input);
  const mainWorkPatternSet = new Set(["push", "pull", "squat", "hinge", "rotate"]);
  let pool = exercises.filter(
    (e) =>
      (e.modality === "hypertrophy" || e.modality === "strength") &&
      !used.has(e.id) &&
      mainWorkPatternSet.has(effectiveMainWorkPattern(e)) &&
      !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
  );
  if (input.primary_goal === "calisthenics") {
    const bodyweightOrCal = pool.filter(
      (e) =>
        e.equipment_required.some((eq) => eq.toLowerCase() === "bodyweight") ||
        e.tags.goal_tags?.includes("calisthenics")
    );
    if (bodyweightOrCal.length >= 2) pool = bodyweightOrCal;
  }
  pool = applyWeekMainLiftExclusion(pool, input);
  const hikingHypertrophyRule = hikingPatternTransferApplies(input)
    ? getHikingSlotRuleForBlockType("main_hypertrophy")
    : undefined;
  const roadHypertrophyRule = roadRunningPatternTransferApplies(input)
    ? getRoadRunningSlotRuleForBlockType("main_hypertrophy")
    : undefined;
  const trailHypertrophyRule = trailRunningPatternTransferApplies(input)
    ? getTrailRunningSlotRuleForBlockType("main_hypertrophy")
    : undefined;
  const soccerHypertrophyRule = soccerPatternTransferApplies(input)
    ? getSoccerSlotRuleForBlockType("main_hypertrophy")
    : undefined;
  const rockHypertrophyRule = rockClimbingPatternTransferApplies(input)
    ? getRockClimbingSlotRule("main_hypertrophy")
    : undefined;
  const snowHypertrophyRule =
    snowSportAppliesH && snowKindH ? getSnowSportSlotRule("main_hypertrophy", snowKindH) : undefined;
  let hikingHypertrophyMode: "gated" | "fallback" | undefined;
  let roadHypertrophyMode: "gated" | "fallback" | undefined;
  let trailHypertrophyMode: "gated" | "fallback" | undefined;
  let soccerHypertrophyMode: "gated" | "fallback" | undefined;
  let rockHypertrophyMode: "gated" | "fallback" | undefined;
  let snowHypertrophyMode: "gated" | "fallback" | undefined;
  if (hikingHypertrophyRule) {
    const hg = gatePoolForHikingSlot(pool, "main_hypertrophy", {
      applyMainWorkExclusions: true,
      requiredCount: 2,
    });
    if (hikingEnforcement) hikingEnforcement.main_hypertrophy = hg;
    pool = hg.poolForSelection;
    hikingHypertrophyMode = sportPatternScoreModeFromPoolMode(hg.poolMode);
  } else if (roadHypertrophyRule) {
    const rg = gatePoolForRoadRunningSlot(pool, "main_hypertrophy", {
      applyMainWorkExclusions: true,
      requiredCount: 2,
    });
    if (roadRunningEnforcement) roadRunningEnforcement.main_hypertrophy = rg;
    pool = rg.poolForSelection;
    roadHypertrophyMode = sportPatternScoreModeFromPoolMode(rg.poolMode);
  } else if (trailHypertrophyRule) {
    const tg = gatePoolForTrailRunningSlot(pool, "main_hypertrophy", {
      applyMainWorkExclusions: true,
      requiredCount: 2,
    });
    if (trailRunningEnforcement) trailRunningEnforcement.main_hypertrophy = tg;
    pool = tg.poolForSelection;
    trailHypertrophyMode = sportPatternScoreModeFromPoolMode(tg.poolMode);
  } else if (soccerHypertrophyRule) {
    const sg = gatePoolForSoccerSlot(pool, "main_hypertrophy", {
      applyMainWorkExclusions: true,
      requiredCount: 2,
    });
    if (soccerEnforcement) soccerEnforcement.main_hypertrophy = sg;
    pool = sg.poolForSelection;
    soccerHypertrophyMode = sportPatternScoreModeFromPoolMode(sg.poolMode);
  } else if (rockHypertrophyRule) {
    const rg = gatePoolForRockClimbingSlot(pool, "main_hypertrophy", {
      applyMainWorkExclusions: true,
      requiredCount: 2,
    });
    if (rockClimbingEnforcement) rockClimbingEnforcement.main_hypertrophy = rg;
    pool = rg.poolForSelection;
    rockHypertrophyMode = sportPatternScoreModeFromPoolMode(rg.poolMode);
  } else if (snowHypertrophyRule && snowKindH) {
    const ag = gatePoolForSnowSportSlot(pool, "main_hypertrophy", snowKindH, {
      applyMainWorkExclusions: true,
      requiredCount: 2,
    });
    if (alpineSkiingEnforcement) alpineSkiingEnforcement.main_hypertrophy = ag;
    pool = ag.poolForSelection;
    snowHypertrophyMode = sportPatternScoreModeFromPoolMode(ag.poolMode);
  }
  const goalRules = getGoalRules(input.primary_goal);
  const maxExercises = goalRules.maxStrengthExercises ?? 8;
  const mainBlockRange = goalRules.mainBlockMovementCount ?? { min: 2, max: 4 };
  const durationScale =
    input.duration_minutes <= 30 ? mainBlockRange.min
    : input.duration_minutes >= 55 ? mainBlockRange.max
    : Math.round((mainBlockRange.min + mainBlockRange.max) / 2);
  let pairCount = input.duration_minutes <= 30 ? 2 : input.duration_minutes <= 60 ? 3 : 4;
  if (input.energy_level === "low") pairCount = Math.min(pairCount, 2);
  const wantCount = Math.min(
    pairCount * 2,
    durationScale * 2,
    maxExercises,
    pool.length
  );

  const isHypertrophyPrimary = input.primary_goal === "hypertrophy";
  const muscleSubFocusRanked = isHypertrophyPrimary ? (input.goal_sub_focus?.muscle ?? []) : [];
  const hasBalanced = muscleSubFocusRanked.includes("balanced");
  const directSubFocusSlugs = muscleSubFocusRanked.filter((s) => s !== "balanced");
  const dominantSlug = directSubFocusSlugs[0];

  const selectionOptions = {
    blockType: "main_hypertrophy",
    sessionFatigueRegions,
    sessionMovementPatternCounts: movementCounts,
    sessionHasBilateralLowerBody: (movementCounts.get("squat") ?? 0) + (movementCounts.get("hinge") ?? 0) > 0,
    historyContext,
    ...(hikingHypertrophyRule
      ? {
          hikingPatternSlotRule: hikingHypertrophyRule,
          hikingPatternScoreMode: hikingHypertrophyMode,
        }
      : {}),
    ...(roadHypertrophyRule
      ? {
          roadRunningPatternSlotRule: roadHypertrophyRule,
          roadRunningPatternScoreMode: roadHypertrophyMode,
        }
      : {}),
    ...(trailHypertrophyRule
      ? {
          trailRunningPatternSlotRule: trailHypertrophyRule,
          trailRunningPatternScoreMode: trailHypertrophyMode,
        }
      : {}),
    ...(soccerHypertrophyRule
      ? {
          soccerPatternSlotRule: soccerHypertrophyRule,
          soccerPatternScoreMode: soccerHypertrophyMode,
        }
      : {}),
    ...(rockHypertrophyRule
      ? {
          rockClimbingPatternSlotRule: rockHypertrophyRule,
          rockClimbingPatternScoreMode: rockHypertrophyMode,
        }
      : {}),
    ...(snowHypertrophyRule
      ? {
          alpineSkiingPatternSlotRule: snowHypertrophyRule,
          alpineSkiingPatternScoreMode: snowHypertrophyMode,
        }
      : {}),
    ...(hikingHypertrophyRule && hikingPatternTransferApplies(input)
      ? {
          hikingQualityContext: {
            sessionHikingCategoryCounts: sportPatCounts,
            emphasisBucket: hikingEmphasis,
            blockType: "main_hypertrophy",
          },
        }
      : {}),
    ...(roadHypertrophyRule && roadRunningPatternTransferApplies(input)
      ? {
          roadRunningQualityContext: {
            sessionTrailCategoryCounts: sportPatCounts,
            emphasisBucket: roadEmphasisH,
            blockType: "main_hypertrophy",
          },
        }
      : {}),
    ...(trailHypertrophyRule && trailRunningPatternTransferApplies(input)
      ? {
          trailRunningQualityContext: {
            sessionTrailCategoryCounts: sportPatCounts,
            emphasisBucket: trailEmphasis,
            blockType: "main_hypertrophy",
          },
        }
      : {}),
    ...(soccerHypertrophyRule && soccerPatternTransferApplies(input)
      ? {
          soccerQualityContext: {
            sessionSoccerCategoryCounts: sportPatCounts,
            emphasisBucket: soccerEmphasisH,
            blockType: "main_hypertrophy",
          },
        }
      : {}),
    ...(snowHypertrophyRule && snowSportAppliesH
      ? {
          alpineSkiingQualityContext: {
            sessionAlpineCategoryCounts: sportPatCounts,
            emphasisBucket: alpineEmphasis,
            blockType: "main_hypertrophy",
            snowSportKind: snowKindH ?? undefined,
          },
        }
      : {}),
    ...(rockHypertrophyRule && rockClimbingPatternTransferApplies(input)
      ? {
          rockClimbingQualityContext: {
            sessionRockCategoryCounts: sportPatCounts,
            emphasisBucket: rockClimbingEmphasisH,
            blockType: "main_hypertrophy",
          },
        }
      : {}),
    ...(snowHypertrophyRule &&
    snowSportAppliesH &&
    input.use_reduced_surface_for_alpine_main_scoring !== false
      ? { sportMainScoringMode: "alpine_reduced_surface" as const }
      : {}),
    ...(rockHypertrophyRule &&
    rockClimbingPatternTransferApplies(input) &&
    input.use_reduced_surface_for_rock_climbing_main_scoring !== false
      ? { sportMainScoringMode: "rock_reduced_surface" as const }
      : {}),
    ...(roadHypertrophyRule &&
    roadRunningPatternTransferApplies(input) &&
    input.use_reduced_surface_for_road_running_main_scoring !== false
      ? { sportMainScoringMode: "road_reduced_surface" as const }
      : {}),
    ...(soccerHypertrophyRule &&
    soccerPatternTransferApplies(input) &&
    input.use_reduced_surface_for_soccer_main_scoring !== false
      ? { sportMainScoringMode: "soccer_reduced_surface" as const }
      : {}),
    ...(cardioTargetExerciseShare != null && cardioTargetExerciseShare > 0
      ? { targetCardioExerciseShare: cardioTargetExerciseShare }
      : {}),
  };

  const hypertrophyGateSnapshot =
    alpineSkiingEnforcement?.main_hypertrophy ??
    rockClimbingEnforcement?.main_hypertrophy ??
    hikingEnforcement?.main_hypertrophy ??
    roadRunningEnforcement?.main_hypertrophy ??
    trailRunningEnforcement?.main_hypertrophy ??
    soccerEnforcement?.main_hypertrophy;
  const withHypertrophyIntent = (pass_id: string) => ({
    ...selectionOptions,
    ...(intentTrace
      ? {
          intent_survival: {
            collector: intentTrace,
            pass_id,
            block_label: "Main hypertrophy",
            slot_type: "main_hypertrophy",
            sport_gate_applied: !!(
              hikingHypertrophyRule ||
              roadHypertrophyRule ||
              trailHypertrophyRule ||
              soccerHypertrophyRule ||
              rockHypertrophyRule ||
              snowHypertrophyRule
            ),
            slot_rule_id:
              snowHypertrophyRule?.slotRuleId ??
              rockHypertrophyRule?.slotRuleId ??
              hikingHypertrophyRule?.slotRuleId ??
              roadHypertrophyRule?.slotRuleId ??
              trailHypertrophyRule?.slotRuleId ??
              soccerHypertrophyRule?.slotRuleId,
            gate_snapshot: hypertrophyGateSnapshot,
          },
        }
      : {}),
  });

  const sportHandlesHypertrophy = sportMainSelector(input.sport_slugs?.[0], input, {
    scoreExercise: scoreExercise as ScoreExerciseLike,
    sessionTargetVector: shouldUseSessionTargetVector(input) ? buildSessionTargetVectorFromInput(input) : undefined,
  });

  const pickHypertrophyMain = (candidatePool: Exercise[], count: number, pass_id: string) =>
    selectExercises(candidatePool, input, recentIds, movementCounts, count, rng, fatigueState, withHypertrophyIntent(pass_id))
      .exercises;

  const intentContractHype =
    input.session_intent_contract ??
    sessionIntentContractForSportSlug(getCanonicalSportSlug(input.sport_slugs?.[0] ?? ""));

  const alpineHypePickEnv: AlpinePickEnvironment = {
    validateCandidate: () => true,
    onMovementCountCommit: (ex) => {
      movementCounts.set(ex.movement_pattern, (movementCounts.get(ex.movement_pattern) ?? 0) + 1);
    },
    onFatigueRegionCommit: (ex) => {
      if (sessionFatigueRegions) {
        addExerciseFatigueRegionsToSession(sessionFatigueRegions, ex);
      }
    },
  };

  let chosen: Exercise[] = [];
  if (sportHandlesHypertrophy && snowHypertrophyRule && intentContractHype && primarySportIsAlpineSkiing(input)) {
    mainSelectorTrace?.entries.push({
      phase: "main_hypertrophy",
      selector: "sport_owned",
      sport_slug: sportHandlesHypertrophy.sportSlug,
      notes: [],
    });
    const traceHypertrophy =
      mainSelectorTrace && mainSelectorTrace.entries.length > 0
        ? mainSelectorTrace.entries[mainSelectorTrace.entries.length - 1]
        : undefined;
    chosen = sportHandlesHypertrophy.selectHypertrophyVolume({
      contract: intentContractHype,
      pool,
      wantCount,
      input,
      used,
      recentIds,
      movementCounts,
      rng,
      fatigueState,
      sessionFatigueRegions,
      historyContext,
      alpineHypertrophyRule: snowHypertrophyRule,
      alpineHypertrophyMode: snowHypertrophyMode ?? "fallback",
      sportPatCounts,
      alpineEmphasis,
      isHypertrophyPrimary,
      muscleSubFocusRanked,
      hasBalanced,
      directSubFocusSlugs,
      dominantSlug,
      replacementCatalog: exercises.filter((e) => !used.has(e.id)),
      pickEnv: alpineHypePickEnv,
      intentTrace,
      gateSnapshot: alpineSkiingEnforcement?.main_hypertrophy,
      traceNotes: traceHypertrophy?.notes,
      exerciseMatchesHypertrophySubFocusSlug,
    });
  } else if (
    sportHandlesHypertrophy &&
    rockHypertrophyRule &&
    intentContractHype &&
    primarySportIsRockClimbing(input)
  ) {
    mainSelectorTrace?.entries.push({
      phase: "main_hypertrophy",
      selector: "sport_owned",
      sport_slug: sportHandlesHypertrophy.sportSlug,
      notes: [],
    });
    const traceHypertrophyRock =
      mainSelectorTrace && mainSelectorTrace.entries.length > 0
        ? mainSelectorTrace.entries[mainSelectorTrace.entries.length - 1]
        : undefined;
    chosen = sportHandlesHypertrophy.selectHypertrophyVolume({
      contract: intentContractHype,
      pool,
      wantCount,
      input,
      used,
      recentIds,
      movementCounts,
      rng,
      fatigueState,
      sessionFatigueRegions,
      historyContext,
      alpineHypertrophyRule: rockHypertrophyRule,
      alpineHypertrophyMode: rockHypertrophyMode ?? "fallback",
      sportPatCounts,
      alpineEmphasis: rockClimbingEmphasisH,
      isHypertrophyPrimary,
      muscleSubFocusRanked,
      hasBalanced,
      directSubFocusSlugs,
      dominantSlug,
      replacementCatalog: exercises.filter((e) => !used.has(e.id)),
      pickEnv: alpineHypePickEnv,
      intentTrace,
      gateSnapshot: rockClimbingEnforcement?.main_hypertrophy,
      traceNotes: traceHypertrophyRock?.notes,
      exerciseMatchesHypertrophySubFocusSlug,
    });
  } else {
    mainSelectorTrace?.entries.push({
      phase: "main_hypertrophy",
      selector: "generic",
      notes: ["generic_main_selector"],
    });
    chosen = genericSelectHypertrophyChosen({
      pool,
      wantCount,
      isHypertrophyPrimary,
      muscleSubFocusRanked,
      hasBalanced,
      directSubFocusSlugs,
      dominantSlug,
      exerciseMatchesHypertrophySubFocusSlug,
      pick: pickHypertrophyMain,
      used,
    });

    if (snowHypertrophyRule && snowSportAppliesH && snowKindH && chosen.length > 0) {
      const alpineHypeCatalog = exercises.filter((e) => !used.has(e.id) || chosen.some((c) => c.id === e.id));
      applySnowUpstreamMainLiftsCoverage(snowKindH, chosen, alpineHypeCatalog, "main_hypertrophy");
    }
    if (rockHypertrophyRule && rockClimbingPatternTransferApplies(input) && chosen.length > 0) {
      const rockHypeCatalog = exercises.filter((e) => !used.has(e.id) || chosen.some((c) => c.id === e.id));
      applyRockUpstreamMainLiftsCoverage(chosen, rockHypeCatalog, "main_hypertrophy");
    }
  }

  const targetPairCount = Math.floor(chosen.length / 2);
  const rawPairs: Exercise[][] =
    targetPairCount > 0 && chosen.length >= 2
      ? (pickBestSupersetPairs(chosen, targetPairCount, new Set<string>()) as [Exercise, Exercise][])
      : [];
  const pairs: Exercise[][] = rawPairs;
  const usedInPairs = new Set(pairs.flatMap(([a, b]) => [a.id, b.id]));
  const leftover = chosen.filter((e) => !usedInPairs.has(e.id));
  for (const ex of leftover) pairs.push([ex]);
  if (pairs.length === 0 && chosen.length) pairs.push([chosen[0]]);

  if (sportHandlesHypertrophy?.sportSlug === "rock_climbing" && rockHypertrophyRule && pairs.length > 0) {
    const rockHypeVolCatalog = exercises.filter((e) => !used.has(e.id) || chosen.some((c) => c.id === e.id));
    sportHandlesHypertrophy.refineHypertrophyPairsCoverage(chosen, pairs, rockHypeVolCatalog);
    const entry = mainSelectorTrace?.entries.find((e) => e.phase === "main_hypertrophy" && e.selector === "sport_owned");
    entry?.notes.push("rock_climbing_sport_owned:hypertrophy_pair_coverage");
  } else if (sportHandlesHypertrophy && snowHypertrophyRule && pairs.length > 0) {
    const alpineHypeVolCatalog = exercises.filter((e) => !used.has(e.id) || chosen.some((c) => c.id === e.id));
    sportHandlesHypertrophy.refineHypertrophyPairsCoverage(chosen, pairs, alpineHypeVolCatalog);
    const entry = mainSelectorTrace?.entries.find((e) => e.phase === "main_hypertrophy" && e.selector === "sport_owned");
    entry?.notes.push("alpine_sport_owned:hypertrophy_pair_coverage");
  } else if (rockHypertrophyRule && rockClimbingPatternTransferApplies(input) && pairs.length > 0) {
    const rockHypeVolCatalog = exercises.filter((e) => !used.has(e.id) || chosen.some((c) => c.id === e.id));
    applyRockUpstreamAccessoryPairsCoverage([], pairs, rockHypeVolCatalog, "main_hypertrophy");
  } else if (snowHypertrophyRule && snowSportAppliesH && snowKindH && pairs.length > 0) {
    const alpineHypeVolCatalog = exercises.filter((e) => !used.has(e.id) || chosen.some((c) => c.id === e.id));
    applySnowUpstreamAccessoryPairsCoverage(snowKindH, [], pairs, alpineHypeVolCatalog, "main_hypertrophy");
  }

  const items: WorkoutItem[] = pairs.flatMap((pair) =>
    pair.map((e) => {
      used.add(e.id);
      const p = getPrescription(e, "main_hypertrophy", input.energy_level, input.primary_goal, false, fatigueVolumeScale, input.style_prefs?.user_level);
      return {
        exercise_id: e.id,
        exercise_name: e.name,
        sets: p.sets,
        reps: p.reps,
        rest_seconds: p.rest_seconds,
        coaching_cues: p.coaching_cues,
        reasoning_tags: ["hypertrophy", ...(e.tags.goal_tags ?? [])],
        unilateral: e.unilateral ?? false,
      };
    })
  );

  const format: BlockFormat = wantsSupersets && pairs.every((p) => p.length === 2) ? "superset" : "straight_sets";
  const supersetPairs: [WorkoutItem, WorkoutItem][] | undefined =
    format === "superset" ? pairs.map((_, i) => [items[2 * i], items[2 * i + 1]]) : undefined;
  const formulaMinutes = Math.ceil(items.length / 2) * 5;
  const durationAwareMinutes =
    input.duration_minutes != null && input.duration_minutes > 0
      ? Math.min(Math.max(formulaMinutes, input.duration_minutes - 10), 75)
      : formulaMinutes;
  return [
    {
      block_type: "main_hypertrophy",
      format,
      title: (() => {
        if (!isHypertrophyPrimary) return "Main hypertrophy";
        if (dominantSlug) {
          const pretty: Record<string, string> = {
            glutes: "Glutes",
            back: "Back",
            chest: "Chest",
            arms: "Arms",
            shoulders: "Shoulders",
            legs: "Legs",
            core: "Core",
            balanced: "Balanced",
          };
          const suffix = pretty[dominantSlug] ?? dominantSlug;
          return `Main hypertrophy (${suffix})`;
        }
        if (hasBalanced) return "Main hypertrophy (Balanced)";
        return "Main hypertrophy";
      })(),
      reasoning: (() => {
        if (!isHypertrophyPrimary) return "Volume-focused work for muscle building.";
        if (dominantSlug) return `${dominantSlug} dominant volume for muscle building.`;
        if (hasBalanced) return "Evenly distributed hypertrophy volume for a balanced muscle-building session.";
        return "Volume-focused work for muscle building.";
      })(),
      items,
      ...(supersetPairs && supersetPairs.length > 0 ? { supersetPairs } : {}),
      estimated_minutes: durationAwareMinutes,
    },
  ];
}

// --- Endurance / conditioning: duration-scaled strength/conditioning supersets + optional cardio ---
// Target main-work exercise count: 30 min → 3, 45 min → 6, 60+ min → 8 (so 45 min is never only 2 exercises).
// When conditioningProfile is set: intent sub-focuses drive primary selection/structure; overlays drive filtering and secondary scoring.

function buildIntervalsHIITMain(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  conditioningProfile: SubFocusProfile
): WorkoutBlock[] {
  const intentSlugs = getConditioningIntentSlugs(conditioningProfile);
  const primaryIntent = getPrimaryConditioningIntent(conditioningProfile) ?? "intervals_hiit";

  // Strongly prefer conditioning exercises for HIIT structure.
  let pool = exercises.filter((e) => e.modality === "conditioning" && !used.has(e.id));

  // Overlays constrain filtering only; they do not drive the interval structure.
  if (conditioningProfile.overlayFilter && conditioningProfile.overlayFilter !== "full_body") {
    pool = filterPoolByOverlay(pool, conditioningProfile.overlayFilter);
  }

  // Direct sub-focus matching: keep direct matches if available.
  const directMatches =
    intentSlugs.length > 0
      ? pool.filter((e) => intentSlugs.some((s) => exerciseHasSubFocusSlug(e, s)))
      : [];
  if (directMatches.length > 0) pool = directMatches;
  if (!pool.length) return [];

  const c = pickConditioningExercise(
    pool,
    input.style_prefs?.preferred_zone2_cardio,
    rng,
    intentSlugs.length ? intentSlugs : undefined
  );
  if (!c) return [];
  used.add(c.id);

  // Use conditioning duration minutes for a coherent time-based structure.
  const condMins =
    getConditioningDurationMinutes(input.primary_goal, input.energy_level) ??
    Math.max(15, Math.round(input.duration_minutes / 2));

  const interval = getConditioningStructureByIntent(
    condMins,
    primaryIntent,
    c.equipment_required ?? [],
    input.primary_goal
  );

  const p = getPrescription(
    c,
    "conditioning",
    input.energy_level,
    input.primary_goal,
    undefined,
    undefined,
    input.style_prefs?.user_level
  );

  return [
    {
      block_type: "conditioning",
      format: (interval.format as BlockFormat) ?? "circuit",
      title: "HIIT intervals",
      reasoning: interval.reasoning ?? "Time-based intervals with defined rest.",
      items: [
        {
          exercise_id: c.id,
          exercise_name: c.name,
          sets: interval.sets,
          time_seconds: interval.time_seconds ?? 30,
          rest_seconds: interval.rest_seconds,
          coaching_cues: p.coaching_cues,
          reasoning_tags: ["conditioning", "hiit", ...(c.tags.goal_tags ?? [])],
          unilateral: c.unilateral ?? false,
        },
      ],
      estimated_minutes: condMins,
    },
  ];
}

function getConditioningIntentMainMinutes(input: GenerateWorkoutInput): number {
  // Warm-up + cool-down take a chunk; reserve a clear, format-specific amount.
  if (input.duration_minutes === 20) return 12;
  if (input.duration_minutes === 30) return 20;
  if (input.duration_minutes === 45) return 30;
  if (input.duration_minutes === 60) return 40;
  // 75m sessions: cap the intent work so it stays sustainable.
  return 40;
}

function overlayEmphasisLabel(overlayFilter?: string): string | null {
  const ov = (overlayFilter ?? "").toLowerCase();
  if (!ov || ov === "full_body") return null;
  if (ov === "lower") return "Lower-body emphasis";
  if (ov === "upper") return "Upper-body emphasis";
  if (ov === "core") return "Core emphasis";
  return `${ov.replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} emphasis`;
}

function isHillBiasExercise(e: Exercise): boolean {
  const id = (e.id ?? "").toLowerCase();
  const name = (e.name ?? "").toLowerCase();
  const eq = (e.equipment_required ?? []).map((x) => x.toLowerCase().replace(/\s/g, "_"));
  const uphillTreadmill =
    eq.includes("treadmill") &&
    (id.includes("incline") ||
      id.includes("uphill") ||
      name.includes("incline") ||
      name.includes("uphill") ||
      name.includes("hill"));
  return (
    id.includes("treadmill_incline") ||
    id.includes("incline") ||
    name.includes("incline") ||
    name.includes("stair") ||
    id.includes("stair") ||
    id.includes("stair_climber") ||
    id.includes("stepup") ||
    id.includes("step_up") ||
    id.includes("sled_push") ||
    id.includes("sled_drag") ||
    uphillTreadmill ||
    eq.includes("stair_climber") ||
    eq.includes("sled")
  );
}

function pickJointHealthSupportCandidates(pool: Exercise[]): Exercise[] {
  const supportStimulus = new Set([
    "scapular_control",
    "trunk_anti_rotation",
    "anti_flexion",
    "isometric",
    "grip",
    "single_leg",
  ]);
  const supportAttribute = new Set([
    "durability",
    "ankle_stability",
    "knee_load",
    "hip_stability",
    "core_stability",
    "low_impact",
  ]);

  return pool.filter((e) => {
    if (e.time_cost === "high") return false;
    const stim = e.tags?.stimulus ?? [];
    const attrs = e.tags?.attribute_tags ?? [];
    const stimMatch = stim.some((s) => supportStimulus.has(s.toLowerCase().replace(/\s/g, "_")));
    const attrMatch = attrs.some((a) => supportAttribute.has(a.toLowerCase().replace(/\s/g, "_")));
    return stimMatch || attrMatch;
  });
}

function pickBestFromPool(pool: Exercise[], rng: () => number): Exercise | undefined {
  if (!pool.length) return undefined;
  const timeRank = (tc: Exercise["time_cost"]) => (tc === "low" ? 0 : tc === "medium" ? 1 : 2);
  const sorted = [...pool].sort((a, b) => timeRank(a.time_cost) - timeRank(b.time_cost) || a.difficulty - b.difficulty);
  const topN = Math.min(sorted.length, 3);
  const top = sorted.slice(0, topN);
  return top[Math.floor(rng() * top.length)];
}

function buildConditioningIntentFormatMain(
  format: ConditioningIntentFormat,
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  conditioningProfile: SubFocusProfile,
  fatigueVolumeScale?: number
): WorkoutBlock[] {
  if (format === "zone2_sustained") {
    return buildZone2SustainedMain(exercises, input, used, rng, conditioningProfile, fatigueVolumeScale);
  }
  if (format === "threshold_intervals") {
    return buildThresholdIntervalsMain(exercises, input, used, rng, conditioningProfile);
  }
  if (format === "durability_time_circuit") {
    return buildDurabilityTimeCircuitMain(exercises, input, used, rng, conditioningProfile, fatigueVolumeScale);
  }
  return buildHillsRepeatsMain(exercises, input, used, rng, conditioningProfile);
}

function buildZone2SustainedMain(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  conditioningProfile: SubFocusProfile,
  fatigueVolumeScale?: number
): WorkoutBlock[] {
  const overlayLabel = overlayEmphasisLabel(conditioningProfile.overlayFilter);
  const mainMins = getConditioningIntentMainMinutes(input);

  // Main work pool: conditioning modality, then intent direct-match dominates.
  let pool = exercises.filter((e) => e.modality === "conditioning" && !used.has(e.id));
  if (conditioningProfile.overlayFilter && conditioningProfile.overlayFilter !== "full_body") {
    pool = filterPoolByOverlay(pool, conditioningProfile.overlayFilter);
  }
  const directPool = pool.filter((e) => exerciseHasSubFocusSlug(e, "zone2_aerobic_base"));
  const pickPool = directPool.length ? directPool : pool;

  const c = pickBestFromPool(pickPool, rng);
  if (!c) return [];
  used.add(c.id);

  const sets = mainMins >= 30 ? 2 : 1;
  const timePerSetSeconds = sets === 2 ? Math.floor((mainMins / 2) * 60) : Math.floor(mainMins * 60);
  const restSeconds = sets === 2 ? 60 : 0;

  const p = getPrescription(
    c,
    "conditioning",
    input.energy_level,
    input.primary_goal,
    undefined,
    undefined,
    input.style_prefs?.user_level
  );

  const mainBlock: WorkoutBlock = {
    block_type: "conditioning",
    format: "straight_sets",
    title: `Zone 2 sustained effort${overlayLabel ? ` (${overlayLabel})` : ""}`,
    reasoning: "Sustained Zone 2 effort prescribed by time (no rep-based strength structure).",
    items: [
      {
        exercise_id: c.id,
        exercise_name: c.name,
        sets,
        time_seconds: timePerSetSeconds,
        rest_seconds: restSeconds,
        coaching_cues: p.coaching_cues,
        reasoning_tags: ["conditioning", "zone2_sustained", ...(c.tags.goal_tags ?? [])],
        unilateral: c.unilateral ?? false,
      },
    ],
    estimated_minutes: mainMins,
  };

  // Optional accessory: short low-fatigue joint health/durability support.
  const accessoryBlocks: WorkoutBlock[] = [];
  const addAccessory = input.duration_minutes >= 45;
  if (addAccessory) {
    let supportPool = exercises.filter((e) => !used.has(e.id));
    if (conditioningProfile.overlayFilter && conditioningProfile.overlayFilter !== "full_body") {
      supportPool = filterPoolByOverlay(supportPool, conditioningProfile.overlayFilter);
    }
    supportPool = pickJointHealthSupportCandidates(supportPool);

    if (supportPool.length) {
      const accessoryCount = input.duration_minutes >= 60 ? 2 : 1;
      const chosen: Exercise[] = [];
      const poolCopy = [...supportPool];
      for (let i = 0; i < accessoryCount && poolCopy.length; i++) {
        const pick = pickBestFromPool(poolCopy, rng);
        if (!pick) break;
        chosen.push(pick);
        used.add(pick.id);
        const idx = poolCopy.findIndex((x) => x.id === pick.id);
        if (idx >= 0) poolCopy.splice(idx, 1);
      }

      if (chosen.length) {
        const items: WorkoutItem[] = chosen.map((ex) => {
          const isMobility = ex.modality === "mobility" || ex.modality === "recovery";
          const p = getPrescription(
            ex,
            isMobility ? "cooldown" : "main_strength",
            input.energy_level,
            isMobility ? "recovery" : "strength",
            !isMobility,
            fatigueVolumeScale,
            input.style_prefs?.user_level
          );

          // Ensure accessory stays light/short.
          const cappedSets = p.sets > 2 ? 2 : p.sets;
          return {
            exercise_id: ex.id,
            exercise_name: ex.name,
            sets: cappedSets,
            ...(p.reps != null ? { reps: p.reps } : {}),
            ...(p.time_seconds != null ? { time_seconds: p.time_seconds } : {}),
            rest_seconds: p.rest_seconds,
            coaching_cues: p.coaching_cues,
            reasoning_tags: ["durability", "joint_health", ...(ex.tags.goal_tags ?? [])],
            unilateral: ex.unilateral ?? false,
          };
        });

        accessoryBlocks.push({
          block_type: "accessory",
          format: "straight_sets",
          title: `Joint health support${overlayLabel ? ` (${overlayLabel})` : ""}`,
          reasoning: "Low-fatigue durability work to complement the sustained Zone 2 block.",
          items,
          estimated_minutes: Math.min(10, Math.max(6, Math.round(input.duration_minutes / 6))),
        });
      }
    }
  }

  return [mainBlock, ...accessoryBlocks];
}

function buildThresholdIntervalsMain(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  conditioningProfile: SubFocusProfile
): WorkoutBlock[] {
  const overlayLabel = overlayEmphasisLabel(conditioningProfile.overlayFilter);
  const mainMins = getConditioningIntentMainMinutes(input);

  let pool = exercises.filter((e) => e.modality === "conditioning" && !used.has(e.id));
  if (conditioningProfile.overlayFilter && conditioningProfile.overlayFilter !== "full_body") {
    pool = filterPoolByOverlay(pool, conditioningProfile.overlayFilter);
  }

  // Direct intent slug dominates.
  const directPool = pool.filter((e) => exerciseHasSubFocusSlug(e, "threshold_tempo"));
  const pickPool = directPool.length ? directPool : pool;
  const c = pickBestFromPool(pickPool, rng);
  if (!c) return [];
  used.add(c.id);

  // Medium threshold/tempo intervals (not HIIT).
  const workSeconds = mainMins <= 25 ? 180 : 240; // 3–4 min
  const restSeconds = 90; // moderate rest
  const unitMinutes = (workSeconds + restSeconds) / 60;
  const sets = Math.max(3, Math.min(6, Math.round(mainMins / unitMinutes)));

  const p = getPrescription(
    c,
    "conditioning",
    input.energy_level,
    input.primary_goal,
    undefined,
    undefined,
    input.style_prefs?.user_level
  );

  return [
    {
      block_type: "conditioning",
      format: "circuit",
      title: `Threshold intervals${overlayLabel ? ` (${overlayLabel})` : ""}`,
      reasoning: "Repeated medium-duration threshold/tempo efforts with defined rest.",
      items: [
        {
          exercise_id: c.id,
          exercise_name: c.name,
          sets,
          time_seconds: workSeconds,
          rest_seconds: restSeconds,
          coaching_cues: p.coaching_cues,
          reasoning_tags: ["conditioning", "threshold_intervals", ...(c.tags.goal_tags ?? [])],
          unilateral: c.unilateral ?? false,
        },
      ],
      estimated_minutes: mainMins,
    },
  ];
}

function buildHillsRepeatsMain(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  conditioningProfile: SubFocusProfile
): WorkoutBlock[] {
  const overlayLabel = overlayEmphasisLabel(conditioningProfile.overlayFilter);
  const mainMins = getConditioningIntentMainMinutes(input);

  let pool = exercises.filter((e) => e.modality === "conditioning" && !used.has(e.id));
  if (conditioningProfile.overlayFilter && conditioningProfile.overlayFilter !== "full_body") {
    pool = filterPoolByOverlay(pool, conditioningProfile.overlayFilter);
  }

  const directPool = pool.filter((e) => exerciseHasSubFocusSlug(e, "hills"));
  const pickBase = directPool.length ? directPool : pool;

  // Strong hill bias for incline/stairs/sled patterns.
  const hillBiasedPool = pickBase.filter((e) => isHillBiasExercise(e));
  const pickPool = hillBiasedPool.length ? hillBiasedPool : pickBase;

  const c = pickBestFromPool(pickPool, rng);
  if (!c) return [];
  used.add(c.id);

  const workSeconds = 60;
  const restSeconds = 90; // walk down / recover
  const sets = input.duration_minutes <= 30 ? 5 : input.duration_minutes <= 45 ? 6 : 8;

  const p = getPrescription(
    c,
    "conditioning",
    input.energy_level,
    input.primary_goal,
    undefined,
    undefined,
    input.style_prefs?.user_level
  );

  return [
    {
      block_type: "conditioning",
      format: "circuit",
      title: `Hill repeats${overlayLabel ? ` (${overlayLabel})` : ""}`,
      reasoning: "Repeated uphill / incline effort with recovery (time-based hill repeats).",
      items: [
        {
          exercise_id: c.id,
          exercise_name: c.name,
          sets,
          time_seconds: workSeconds,
          rest_seconds: restSeconds,
          coaching_cues: p.coaching_cues,
          reasoning_tags: ["conditioning", "hills_repeats", ...(c.tags.goal_tags ?? [])],
          unilateral: c.unilateral ?? false,
        },
      ],
      estimated_minutes: mainMins,
    },
  ];
}

/**
 * Append a time-based conditioning (cardio) block for endurance / conditioning primaries.
 * Shared by default endurance path and durability time-circuit path.
 */
function appendEnduranceTimeBasedCardioBlock(
  blocks: WorkoutBlock[],
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  conditioningProfile: SubFocusProfile | null | undefined,
  intentSlugs: string[]
): void {
  let cardioPool = exercises.filter((e) => e.modality === "conditioning" && !used.has(e.id));
  const pickMult = input.sport_profile_session_composition?.conditioningPickerMinutesMultiplier ?? 1;
  const condMinsRaw =
    getConditioningDurationMinutes(input.primary_goal, input.energy_level) ??
    input.style_prefs?.conditioning_minutes ??
    (input.duration_minutes >= 60 ? 30 : 20);
  const condMins = Math.max(3, Math.round(condMinsRaw * pickMult));
  const addCardioBlock = cardioPool.length > 0 && condMins > 0;
  if (!addCardioBlock) return;

  const preferredIntentSlugs = intentSlugs.length > 0 ? intentSlugs : undefined;
  const c = pickConditioningExercise(
    cardioPool,
    input.style_prefs?.preferred_zone2_cardio,
    rng,
    preferredIntentSlugs
  );
  if (!c) return;

  used.add(c.id);
  const p = getPrescription(
    c,
    "conditioning",
    input.energy_level,
    input.primary_goal,
    undefined,
    undefined,
    input.style_prefs?.user_level
  );
  const primaryIntent = conditioningProfile ? getPrimaryConditioningIntent(conditioningProfile) : undefined;
  const interval = getConditioningStructureForExercise(
    c,
    condMins,
    input.primary_goal,
    primaryIntent
  );
  const conditioningProtocolTag = conditioningProtocolReasonTag(
    getConditioningProtocolKind(c, primaryIntent)
  );
  const condFormat =
    (interval.format as BlockFormat) ??
    (getGoalRules(input.primary_goal).conditioningFormats?.[0]) ??
    "straight_sets";
  const workSec = interval.time_seconds ?? (interval.reps != null ? 30 : 0);
  const estimatedMin =
    isHighIntensityConditioning(c) || isExplosiveConditioning(c) || isSprintBurstConditioning(c)
      ? interval.sets * ((workSec || 30) / 60 + interval.rest_seconds / 60)
      : condMins;
  blocks.push({
    block_type: "conditioning",
    format: condFormat,
    title: "Conditioning",
    reasoning: interval.reasoning ?? "Steady cardio to support endurance.",
    items: [
      {
        exercise_id: c.id,
        exercise_name: c.name,
        sets: interval.sets,
        ...(interval.reps != null ? { reps: interval.reps } : { time_seconds: interval.time_seconds }),
        rest_seconds: interval.rest_seconds,
        coaching_cues: p.coaching_cues,
        reasoning_tags: ["endurance", conditioningProtocolTag, ...(c.tags.goal_tags ?? [])],
        unilateral: c.unilateral ?? false,
      },
    ],
    estimated_minutes: Math.round(estimatedMin),
  });
}

/** Time-under-tension / stability circuit for endurance `durability` intent (no rep-based strength supersets). */
function buildDurabilityTimeCircuitMain(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  conditioningProfile: SubFocusProfile,
  _fatigueVolumeScale?: number
): WorkoutBlock[] {
  const overlayLabel = overlayEmphasisLabel(conditioningProfile.overlayFilter);
  let pool = exercises.filter(
    (e) =>
      !used.has(e.id) &&
      e.time_cost !== "high" &&
      (e.modality === "strength" || e.modality === "mobility" || e.modality === "recovery") &&
      !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
  );
  if (conditioningProfile.overlayFilter && conditioningProfile.overlayFilter !== "full_body") {
    pool = filterPoolByOverlay(pool, conditioningProfile.overlayFilter);
  }

  const intentSlugs = getConditioningIntentSlugs(conditioningProfile);
  const directMatches =
    intentSlugs.length > 0 ? pool.filter((e) => intentSlugs.some((s) => exerciseHasSubFocusSlug(e, s))) : [];
  const jointCandidates = pickJointHealthSupportCandidates(pool);
  const durabilityPool =
    directMatches.length > 0
      ? directMatches
      : jointCandidates.length > 0
        ? jointCandidates
        : pool.filter((e) => exerciseHasSubFocusSlug(e, "durability"));

  if (!durabilityPool.length) return [];

  const count = input.duration_minutes <= 30 ? 3 : input.duration_minutes <= 45 ? 4 : 5;
  const chosen: Exercise[] = [];
  const poolCopy = [...durabilityPool];
  for (let i = 0; i < count && poolCopy.length; i++) {
    const pick = pickBestFromPool(poolCopy, rng);
    if (!pick) break;
    chosen.push(pick);
    used.add(pick.id);
    const idx = poolCopy.findIndex((x) => x.id === pick.id);
    if (idx >= 0) poolCopy.splice(idx, 1);
  }
  if (!chosen.length) return [];

  const workSec = input.duration_minutes <= 30 ? 35 : 45;
  const restSec = 20;
  const rounds = input.duration_minutes <= 30 ? 2 : 3;
  const cue =
    input.style_prefs?.user_level === "beginner"
      ? "Focus on form and control. Quality over speed."
      : "Sustain each effort; steady breathing. Build tissue tolerance over time.";

  const items: WorkoutItem[] = chosen.map((ex) => ({
    exercise_id: ex.id,
    exercise_name: ex.name,
    sets: rounds,
    time_seconds: workSec,
    rest_seconds: restSec,
    coaching_cues: cue,
    reasoning_tags: ["durability", "time_based", ...(ex.tags.goal_tags ?? [])],
    unilateral: ex.unilateral ?? false,
  }));

  const mainMins = Math.min(
    getConditioningIntentMainMinutes(input),
    Math.max(12, Math.ceil((chosen.length * rounds * (workSec + restSec)) / 60))
  );

  const blocks: WorkoutBlock[] = [
    {
      block_type: "conditioning",
      format: "circuit",
      title: `Durability — time-based${overlayLabel ? ` (${overlayLabel})` : ""}`,
      reasoning: "Time-under-tension and stability work (holds / controlled efforts), not rep-max strength sets.",
      items,
      estimated_minutes: mainMins,
    },
  ];

  const cardioIntentSlugs = getConditioningIntentSlugs(conditioningProfile);
  appendEnduranceTimeBasedCardioBlock(
    blocks,
    exercises,
    input,
    used,
    rng,
    conditioningProfile,
    cardioIntentSlugs
  );
  return blocks;
}

function buildEnduranceMain(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  rng: () => number,
  fatigueVolumeScale?: number,
  fatigueState?: FatigueState,
  sessionFatigueRegions?: Map<string, number>,
  historyContext?: TrainingHistoryContext,
  conditioningProfile?: SubFocusProfile | null
): WorkoutBlock[] {
  const duration = input.duration_minutes;
  const supersetPairCount = duration <= 30 ? 1 : duration <= 45 ? 3 : 4;
  const intentSlugs = conditioningProfile ? getConditioningIntentSlugs(conditioningProfile) : [];

  let strengthPool = exercises.filter(
    (e) =>
      (e.modality === "strength" || e.modality === "conditioning") &&
      !used.has(e.id) &&
      e.time_cost !== "high" &&
      !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
  );
  if (conditioningProfile?.overlayFilter) {
    strengthPool = filterPoolByOverlay(strengthPool, conditioningProfile.overlayFilter);
    if (strengthPool.length === 0) strengthPool = exercises.filter(
      (e) =>
        (e.modality === "strength" || e.modality === "conditioning") &&
        !used.has(e.id) &&
        e.time_cost !== "high" &&
        !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
    );
  }
  const blocks: WorkoutBlock[] = [];

  // HIIT structural override: if intent sub-focus is intervals / HIIT, do not use standard superset+reps.
  const primaryConditioningIntent = conditioningProfile
    ? getPrimaryConditioningIntent(conditioningProfile)
    : undefined;
  if (
    conditioningProfile &&
    (conditioningProfile.templateHints?.includes("hiit_intervals") ||
      primaryConditioningIntent === "intervals_hiit" ||
      (conditioningProfile.goalSlug === "endurance" && primaryConditioningIntent === "intervals"))
  ) {
    const hiitBlocks = buildIntervalsHIITMain(exercises, input, used, rng, conditioningProfile);
    if (hiitBlocks.length) return hiitBlocks;
  }

  // Explicit conditioning intent formats for remaining intents.
  // These must not fall back to strength/hypertrophy superset construction.
  if (conditioningProfile) {
    const format = resolveConditioningIntentFormatFromIntent(conditioningProfile);
    if (format) {
      const formatBlocks = buildConditioningIntentFormatMain(
        format,
        exercises,
        input,
        used,
        rng,
        conditioningProfile,
        fatigueVolumeScale
      );
      if (formatBlocks.length) return formatBlocks;
    }
  }

  const availableForPairs = strengthPool.filter((e) => !used.has(e.id));
  const pairPool =
    intentSlugs.length > 0
      ? filterPoolByDirectSubFocus(availableForPairs, intentSlugs)
      : availableForPairs;
  const pairs = pickBestSupersetPairs(
    pairPool.length >= 2 ? pairPool : availableForPairs,
    supersetPairCount,
    used
  ) as [Exercise, Exercise][];
  if (pairs.length > 0) {
    for (const [exA, exB] of pairs) {
      used.add(exA.id);
      used.add(exB.id);
      if (sessionFatigueRegions) {
        addExerciseFatigueRegionsToSession(sessionFatigueRegions, exA);
        addExerciseFatigueRegionsToSession(sessionFatigueRegions, exB);
      }
    }
    const supportSets = Math.max(1, Math.round(2 * (fatigueVolumeScale ?? 1)));
    const items: WorkoutItem[] = pairs.flatMap(([exA, exB]) => {
      const pA = getPrescription(exA, "main_hypertrophy", input.energy_level, input.primary_goal, false, fatigueVolumeScale, input.style_prefs?.user_level);
      const pB = getPrescription(exB, "main_hypertrophy", input.energy_level, input.primary_goal, false, fatigueVolumeScale, input.style_prefs?.user_level);
      return [
        {
          exercise_id: exA.id,
          exercise_name: exA.name,
          sets: supportSets,
          reps: pA.reps ?? 10,
          rest_seconds: 30,
          coaching_cues: pA.coaching_cues,
          reasoning_tags: ["conditioning", "strength", ...(exA.tags.goal_tags ?? [])],
          unilateral: exA.unilateral ?? false,
        },
        {
          exercise_id: exB.id,
          exercise_name: exB.name,
          sets: supportSets,
          reps: pB.reps ?? 10,
          rest_seconds: 30,
          coaching_cues: pB.coaching_cues,
          reasoning_tags: ["conditioning", "strength", ...(exB.tags.goal_tags ?? [])],
          unilateral: exB.unilateral ?? false,
        },
      ];
    });
    const supersetPairs: [WorkoutItem, WorkoutItem][] = [];
    for (let i = 0; i < pairs.length; i++) {
      supersetPairs.push([items[2 * i], items[2 * i + 1]]);
    }
    const estimatedMinutes = Math.min(supersetPairCount * 8, Math.max(10, duration - 20));
    blocks.push({
      block_type: "conditioning",
      format: "superset",
      items,
      supersetPairs,
      estimated_minutes: estimatedMinutes,
    });
  }

  // Always add a time-based cardio block when we have candidates and duration budget (endurance /
  // conditioning primary). Strength-support supersets alone are not sufficient — users expect
  // explicit sustained or interval cardio prescription.
  appendEnduranceTimeBasedCardioBlock(
    blocks,
    exercises,
    input,
    used,
    rng,
    conditioningProfile,
    intentSlugs
  );
  return blocks;
}

// --- Mobility / recovery: stretching and mobility only (no strength) ---
// Recovery goal: emphasize more stretching/recovery movements than mobility-only.
function buildMobilityRecoveryMain(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number
): WorkoutBlock[] {
  const mobilityPool = exercises.filter(
    (e) =>
      (e.modality === "mobility" || e.modality === "recovery") &&
      !used.has(e.id)
  );
  const isRecovery = input.primary_goal === "recovery";
  const count =
    input.duration_minutes <= 30
      ? isRecovery ? 6 : 4
      : isRecovery ? 9 : 6;
  const chosen = shuffleWithSeed([...mobilityPool], rng).slice(0, count);
  chosen.forEach((e) => used.add(e.id));

  const items: WorkoutItem[] = chosen.map((e) => {
    const p = getPrescription(e, "cooldown", input.energy_level, input.primary_goal, undefined, undefined, input.style_prefs?.user_level);
    return {
      exercise_id: e.id,
      exercise_name: e.name,
      sets: p.sets,
      reps: p.reps,
      time_seconds: p.time_seconds ?? 45,
      rest_seconds: p.rest_seconds,
      coaching_cues: p.coaching_cues,
      reasoning_tags: ["mobility", "recovery", ...(e.tags.goal_tags ?? [])],
      unilateral: e.unilateral ?? false,
    };
  });

  return [
    {
      block_type: "cooldown",
      format: "circuit",
      items,
      estimated_minutes: input.duration_minutes - 10,
    },
  ];
}

/** Human-readable label for a goal slug (session title and block naming). */
function goalToDisplayLabel(goal: string): string {
  const g = goal.toLowerCase().replace(/\s/g, "_");
  const map: Record<string, string> = {
    strength: "Strength",
    power: "Power",
    hypertrophy: "Hypertrophy",
    body_recomp: "Body recomp",
    endurance: "Endurance",
    conditioning: "Conditioning",
    mobility: "Mobility",
    recovery: "Recovery",
    athletic_performance: "Athletic performance",
    calisthenics: "Calisthenics",
  };
  return map[g] ?? goal.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Block title tied to goals: primary blocks get base name; secondary-goal blocks get " (secondary goal)". */
function blockTitleForGoal(
  blockType: string,
  _primaryGoal: string,
  isSecondaryGoalBlock: boolean
): string {
  const base: Record<string, string> = {
    warmup: "Activation",
    main_strength: "Main strength",
    main_hypertrophy: "Main hypertrophy",
    power: "Power",
    accessory: "Accessory",
    conditioning: "Conditioning",
    cooldown: "Cooldown",
    mobility: "Mobility",
    recovery: "Recovery",
  };
  const name = base[blockType] ?? blockType.replace(/_/g, " ");
  if (isSecondaryGoalBlock) return `${name} (secondary goal)`;
  return name;
}

/** True when conditioning exercise is Zone 2 / steady-state cardio (treadmill, bike, rower at aerobic_zone2). */
function isZone2Conditioning(exercise: Exercise): boolean {
  if (exercise.tags?.stimulus?.includes("aerobic_zone2")) return true;
  const id = (exercise.id ?? "").toLowerCase();
  return id.startsWith("zone2_") || id.includes("zone2");
}

/** Normalize block title for comparison (so "Conditioning" and "conditioning" match). */
function normalizedBlockTitle(block: WorkoutBlock): string {
  const raw = block.title ?? block.block_type;
  return raw.toLowerCase().replace(/_/g, " ").trim();
}

/** Merge consecutive blocks that share the same display title so we never show two blocks with the same name. */
function mergeConsecutiveBlocksWithSameTitle(blocks: WorkoutBlock[]): WorkoutBlock[] {
  if (blocks.length <= 1) return blocks;
  const result: WorkoutBlock[] = [];
  for (const block of blocks) {
    const displayTitle = normalizedBlockTitle(block);
    const last = result[result.length - 1];
    const lastTitle = last ? normalizedBlockTitle(last) : "";
    if (last && lastTitle === displayTitle) {
      const merged: WorkoutBlock = {
        block_type: last.block_type,
        format: last.format,
        title: last.title,
        reasoning: last.reasoning,
        items: [...last.items, ...block.items],
        estimated_minutes: (last.estimated_minutes ?? 0) + (block.estimated_minutes ?? 0),
        supersetPairs:
          (last.supersetPairs?.length && block.supersetPairs?.length)
            ? [...(last.supersetPairs ?? []), ...(block.supersetPairs ?? [])]
            : last.supersetPairs ?? block.supersetPairs,
      };
      result[result.length - 1] = merged;
    } else {
      result.push({ ...block });
    }
  }
  return result;
}

const SUPERSET_STRUCTURE_BLOCK_TYPES = new Set<BlockType>([
  "main_strength",
  "main_hypertrophy",
  "power",
  "accessory",
]);

function toBlockLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/**
 * Present main work as simple superset blocks:
 * - split to 2 items per block
 * - allow single-item block for difficult compound focus
 * - title as Block A / Block B / ...
 */
function normalizeSupersetBlockPresentation(blocks: WorkoutBlock[]): WorkoutBlock[] {
  const normalized: WorkoutBlock[] = [];
  let supersetBlockIndex = 0;

  for (const block of blocks) {
    if (!SUPERSET_STRUCTURE_BLOCK_TYPES.has(block.block_type)) {
      normalized.push({ ...block });
      continue;
    }

    const chunkSize = 2;
    const chunkCount = Math.max(1, Math.ceil((block.items?.length ?? 0) / chunkSize));
    const estPerChunk =
      block.estimated_minutes != null
        ? Math.max(1, Math.round(block.estimated_minutes / chunkCount))
        : undefined;

    for (let i = 0; i < block.items.length; i += chunkSize) {
      const chunkItems = block.items.slice(i, i + chunkSize);
      const withLetterTitle = `Block ${toBlockLetter(supersetBlockIndex++)}`;
      normalized.push({
        ...block,
        format: "superset",
        title: withLetterTitle,
        items: chunkItems,
        supersetPairs: chunkItems.length === 2 ? [[chunkItems[0], chunkItems[1]]] : undefined,
        estimated_minutes: estPerChunk,
      });
    }
  }

  return normalized;
}

/** Main block types for main vs accessory set ratio. */
const MAIN_BLOCK_TYPES_FOR_RATIO = new Set<BlockType>([
  "main_strength",
  "main_hypertrophy",
  "power",
]);

/**
 * Enforce main > accessory:
 * - never more accessory sets than main sets
 * - keep at least one set worth of dominance for main work (when possible)
 * Mutates blocks in place by reducing accessory block item set counts if needed.
 */
function enforceMainAccessoryRatioOnBlocks(blocks: WorkoutBlock[]): void {
  let mainSets = 0;
  const accessoryBlocks: WorkoutBlock[] = [];
  let accessorySets = 0;

  for (const block of blocks) {
    const blockSets = block.items.reduce((s, item) => s + (item.sets ?? 0), 0);
    if (MAIN_BLOCK_TYPES_FOR_RATIO.has(block.block_type)) {
      mainSets += blockSets;
    } else if (block.block_type === "accessory") {
      accessorySets += blockSets;
      accessoryBlocks.push(block);
    }
  }

  if (accessoryBlocks.length === 0 || accessorySets === 0) return;

  const maxAccessory = Math.max(0, mainSets - 1);
  if (accessorySets <= maxAccessory) return;

  let toRemove = accessorySets - maxAccessory;
  const itemsWithSets: { item: WorkoutItem }[] = [];
  for (const block of accessoryBlocks) {
    for (const item of block.items) {
      const sets = item.sets ?? 0;
      if (sets > 0) itemsWithSets.push({ item });
    }
  }
  itemsWithSets.sort((a, b) => (b.item.sets ?? 0) - (a.item.sets ?? 0));

  for (const { item } of itemsWithSets) {
    if (toRemove <= 0) break;
    const current = item.sets ?? 0;
    const reduce = Math.min(toRemove, current - 3);
    if (reduce > 0) {
      item.sets = Math.max(3, current - reduce);
      toRemove -= reduce;
    }
  }

  if (toRemove <= 0) return;

  // If set reduction cannot satisfy ratio without dropping below minimum useful volume,
  // remove lowest-volume accessory items entirely.
  for (let bi = accessoryBlocks.length - 1; bi >= 0 && toRemove > 0; bi--) {
    const block = accessoryBlocks[bi];
    for (let ii = block.items.length - 1; ii >= 0 && toRemove > 0; ii--) {
      const item = block.items[ii];
      const sets = item.sets ?? 0;
      if (sets <= 0) continue;
      block.items.splice(ii, 1);
      toRemove -= sets;
    }
    if (block.format === "superset" && block.items.length >= 2) {
      const pairs: [WorkoutItem, WorkoutItem][] = [];
      for (let i = 0; i + 1 < block.items.length; i += 2) {
        pairs.push([block.items[i], block.items[i + 1]]);
      }
      block.supersetPairs = pairs.length ? pairs : undefined;
    } else {
      block.supersetPairs = undefined;
    }
  }
}

/** Map generator primary_goal to `goal_sub_focus` keys (manual adapter uses muscle, physique, etc.). */
function goalSubFocusKeysForPrimary(primary: PrimaryGoal): string[] {
  switch (primary) {
    case "strength":
      return ["strength"];
    case "hypertrophy":
      return ["muscle", "hypertrophy"];
    case "body_recomp":
      return ["physique"];
    case "conditioning":
      return ["conditioning"];
    case "endurance":
      return ["endurance"];
    case "mobility":
      return ["mobility"];
    case "recovery":
      return ["resilience"];
    case "power":
      return ["conditioning"];
    case "athletic_performance":
      return ["strength"];
    case "calisthenics":
      return ["strength"];
    default:
      return [];
  }
}

function getActiveGoalSubFocusEntry(input: GenerateWorkoutInput): { goalSlug: string; slugs: string[] } | null {
  const keys = goalSubFocusKeysForPrimary(input.primary_goal);
  const gsf = input.goal_sub_focus ?? {};
  for (const k of keys) {
    const slugs = gsf[k];
    if (slugs?.length) return { goalSlug: k, slugs };
  }
  return null;
}

function collectExerciseIdsFromBlocks(blocks: WorkoutBlock[]): string[] {
  return blocks.flatMap((b) => b.items.map((i) => i.exercise_id));
}

/** Warmup/cooldown can include light prep; sub-focus guarantee targets training blocks only. */
function collectExerciseIdsForSubFocusCoverage(blocks: WorkoutBlock[]): string[] {
  const trainingBlocks = blocks.filter((b) => b.block_type !== "warmup" && b.block_type !== "cooldown");
  return collectExerciseIdsFromBlocks(trainingBlocks);
}

function sessionHasGoalSubFocusCoverage(
  blocks: WorkoutBlock[],
  exerciseById: Map<string, Exercise>,
  goalSlug: string,
  guaranteeSlugs: string[]
): boolean {
  if (guaranteeSlugs.length === 0) return true;
  const ids = collectExerciseIdsForSubFocusCoverage(blocks);
  for (const id of ids) {
    const ex = exerciseById.get(id);
    if (!ex) continue;
    for (const slug of guaranteeSlugs) {
      if (exerciseMatchesGoalSubFocusSlugUnified(ex, goalSlug, slug)) return true;
    }
  }
  return false;
}

/**
 * When the user selected a single primary goal and ranked sub-focuses, ensure at least one exercise
 * in the session matches one of those sub-focuses (so upper/lower split days still reflect the goal).
 * Picks from injury-safe + equipment pool, ignoring body-part split, then inserts a short accessory block.
 */
function ensureSingleGoalSubFocusCoverage(
  mergedBlocks: WorkoutBlock[],
  input: GenerateWorkoutInput,
  guaranteePool: Exercise[],
  used: Set<string>,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  rng: () => number,
  fatigueState: FatigueState | undefined,
  fatigueVolumeScale: number | undefined,
  historyContext: TrainingHistoryContext | undefined,
  sessionFatigueRegions: Map<string, number>
): void {
  if ((input.secondary_goals?.length ?? 0) > 0) return;
  const entry = getActiveGoalSubFocusEntry(input);
  if (!entry) return;
  const guaranteeSlugs = subFocusSlugsForGuarantee(entry.goalSlug, entry.slugs);
  if (guaranteeSlugs.length === 0) return;

  const exerciseById = new Map(guaranteePool.map((e) => [e.id, e]));
  if (sessionHasGoalSubFocusCoverage(mergedBlocks, exerciseById, entry.goalSlug, guaranteeSlugs)) return;

  const matchingPool = guaranteePool.filter(
    (e) =>
      !used.has(e.id) &&
      guaranteeSlugs.some((slug) => exerciseMatchesGoalSubFocusSlugUnified(e, entry.goalSlug, slug))
  );
  if (matchingPool.length === 0) return;

  const selectionOptions = {
    blockType: "accessory",
    sessionFatigueRegions,
    sessionMovementPatternCounts: movementCounts,
    historyContext,
  } as const;

  const picked = selectExercises(
    matchingPool,
    input,
    recentIds,
    movementCounts,
    1,
    rng,
    fatigueState,
    selectionOptions
  );
  const ex = picked.exercises[0];
  if (!ex) return;

  used.add(ex.id);
  const blockTypeForPrescription: BlockType =
    input.primary_goal === "strength" || input.primary_goal === "power" ? "main_strength" : "main_hypertrophy";
  const p = getPrescription(
    ex,
    blockTypeForPrescription,
    input.energy_level,
    input.primary_goal,
    true,
    fatigueVolumeScale,
    input.style_prefs?.user_level
  );
  const item: WorkoutItem = {
    exercise_id: ex.id,
    exercise_name: ex.name,
    sets: Math.max(3, Math.min(p.sets ?? 3, 4)),
    reps: p.reps,
    rest_seconds: p.rest_seconds,
    coaching_cues: p.coaching_cues,
    reasoning_tags: ["goal_sub_focus", ...(ex.tags.goal_tags ?? [])],
    unilateral: ex.unilateral ?? false,
  };

  const cooldownIdx = mergedBlocks.findIndex((b) => b.block_type === "cooldown");
  const newBlock: WorkoutBlock = {
    block_type: "accessory",
    format: "straight_sets",
    title: "Goal focus",
    reasoning: "Brings your selected sub-focus into this session even when the day emphasizes another area.",
    items: [item],
    estimated_minutes: 6,
  };
  if (cooldownIdx >= 0) mergedBlocks.splice(cooldownIdx, 0, newBlock);
  else mergedBlocks.push(newBlock);
}

/**
 * Manual week: ensure each selected sub-focus has at least the planned number of matching exercises
 * in this session (spread across the week via `weekly_sub_focus_session_minimums`).
 */
function ensureWeeklySubFocusSessionMinimums(
  mergedBlocks: WorkoutBlock[],
  input: GenerateWorkoutInput,
  guaranteePool: Exercise[],
  used: Set<string>,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  rng: () => number,
  fatigueState: FatigueState | undefined,
  fatigueVolumeScale: number | undefined,
  historyContext: TrainingHistoryContext | undefined,
  sessionFatigueRegions: Map<string, number>
): void {
  const mins = input.weekly_sub_focus_session_minimums;
  if (!mins || Object.keys(mins).length === 0) return;

  const exerciseById = new Map(guaranteePool.map((e) => [e.id, e]));
  const itemsToAdd: WorkoutItem[] = [];

  const selectionOptions = {
    blockType: "accessory" as const,
    sessionFatigueRegions,
    sessionMovementPatternCounts: movementCounts,
    historyContext,
  };

  const blockTypeForPrescription = (): BlockType =>
    input.primary_goal === "strength" ||
    input.primary_goal === "power" ||
    input.primary_goal === "calisthenics"
      ? "main_strength"
      : "main_hypertrophy";

  for (const [key, minRequired] of Object.entries(mins)) {
    if (minRequired <= 0) continue;
    const colon = key.indexOf(":");
    if (colon <= 0) continue;
    const goalSlug = key.slice(0, colon);
    const subSlug = key.slice(colon + 1);
    if (!subSlug) continue;

    const countMatching = (): number => {
      let n = 0;
      for (const id of collectExerciseIdsForSubFocusCoverage(mergedBlocks)) {
        const ex = exerciseById.get(id);
        if (ex && exerciseMatchesGoalSubFocusSlugUnified(ex, goalSlug, subSlug)) n++;
      }
      return n;
    };

    let toAdd = Math.max(0, minRequired - countMatching());
    while (toAdd > 0) {
      const matchingPool = guaranteePool.filter(
        (e) =>
          !used.has(e.id) &&
          exerciseMatchesGoalSubFocusSlugUnified(e, goalSlug, subSlug)
      );
      if (matchingPool.length === 0) break;

      const picked = selectExercises(
        matchingPool,
        input,
        recentIds,
        movementCounts,
        1,
        rng,
        fatigueState,
        selectionOptions
      ).exercises[0];
      if (!picked) break;

      used.add(picked.id);
      toAdd -= 1;

      const p = getPrescription(
        picked,
        blockTypeForPrescription(),
        input.energy_level,
        input.primary_goal,
        true,
        fatigueVolumeScale,
        input.style_prefs?.user_level
      );
      itemsToAdd.push({
        exercise_id: picked.id,
        exercise_name: picked.name,
        sets: Math.max(3, Math.min(p.sets ?? 3, 4)),
        reps: p.reps,
        rest_seconds: p.rest_seconds,
        coaching_cues: p.coaching_cues,
        reasoning_tags: ["weekly_sub_focus", ...(picked.tags.goal_tags ?? [])],
        unilateral: picked.unilateral ?? false,
      });
    }
  }

  if (itemsToAdd.length === 0) return;

  const cooldownIdx = mergedBlocks.findIndex((b) => b.block_type === "cooldown");
  const newBlock: WorkoutBlock = {
    block_type: "accessory",
    format: "straight_sets",
    title: "Sub-focus coverage",
    reasoning:
      "Adds training volume aligned to your ranked sub-goals so each one shows up across the week (minimum targets per sub-goal).",
    items: itemsToAdd,
    estimated_minutes: Math.min(8 * itemsToAdd.length, 36),
  };
  if (cooldownIdx >= 0) mergedBlocks.splice(cooldownIdx, 0, newBlock);
  else mergedBlocks.push(newBlock);
}

/** Post-build repair for mountain snow family (alpine, snowboard, backcountry, XC). */
function tryRepairSnowSportSession(
  mergedBlocks: WorkoutBlock[],
  input: GenerateWorkoutInput,
  filtered: Exercise[],
  used: Set<string>,
  rng: () => number,
  fatigueVolumeScale: number | undefined,
  sessionFatigueRegions: Map<string, number>,
  repairLog?: IntentSurvivalRepairChange[]
): void {
  const kind = resolveSnowSportKind(input);
  if (!kind || !snowSportBodyFocusAllows(input)) return;
  const byId = new Map(filtered.map((e) => [e.id, e]));
  const logRepair = (change: IntentSurvivalRepairChange) => {
    repairLog?.push(change);
  };

  const usedIdsInSession = (): Set<string> =>
    new Set(mergedBlocks.flatMap((b) => b.items.map((i) => i.exercise_id)));

  const XC_MAIN_ENGINE_ANCHOR = [
    "nordic_poling_pull_endurance",
    "quad_dominant_endurance",
    "sustained_tension_lower_body",
    "eccentric_braking_control",
  ] as const;
  const XC_ENDURANCE_TRUNK = [
    "nordic_poling_pull_endurance",
    "sustained_tension_lower_body",
    "quad_dominant_endurance",
    "trunk_bracing_dynamic",
  ] as const;
  const UPHILL_TOUCH = ["uphill_skin_travel_endurance", "locomotion_hiking_trail_identity"] as const;

  for (let attempt = 0; attempt < 4; attempt++) {
    const ev = evaluateSnowSportCoverageForBlocks(kind, input, mergedBlocks, byId);
    if (ev.ok) return;
    let progressed = false;

    for (const v of ev.violations) {
      if (v.ruleId.endsWith("main_eccentric_or_deceleration") || v.ruleId.endsWith("main_engine_anchor")) {
        const anchorCats =
          v.ruleId.endsWith("main_engine_anchor") ? [...XC_MAIN_ENGINE_ANCHOR] : [...ALPINE_MAIN_ECCENTRIC_OR_DECEL_CATEGORIES];
        const mainItems: { block: WorkoutBlock; item: WorkoutItem; ex: Exercise }[] = [];
        for (const block of mergedBlocks) {
          if (block.block_type !== "main_strength" && block.block_type !== "main_hypertrophy") continue;
          for (const item of block.items) {
            const ex = byId.get(item.exercise_id);
            if (!ex) continue;
            mainItems.push({ block, item, ex });
          }
        }
        const alreadyHasMainIdentity = mainItems.some(({ ex }) =>
          exerciseMatchesAnySnowSportCategory(ex, anchorCats)
        );
        if (!alreadyHasMainIdentity && mainItems.length > 0) {
          let weakest = mainItems[0];
          let weakestScore = Number.POSITIVE_INFINITY;
          for (const m of mainItems) {
            const q = computeAlpineSkiingWithinPoolQualityScore(m.ex, {
              sessionAlpineCategoryCounts: new Map<string, number>(),
              emphasisBucket: 0,
              blockType: m.block.block_type,
              snowSportKind: kind,
            });
            if (q.total < weakestScore) {
              weakestScore = q.total;
              weakest = m;
            }
          }

          const gatedPool = gatePoolForSnowSportSlot(filtered, weakest.block.block_type, kind, {
            applyMainWorkExclusions: true,
          }).poolForSelection;
          const exclude = usedIdsInSession();
          exclude.delete(weakest.item.exercise_id);
          const repl = findBestSnowSportReplacement(gatedPool, anchorCats, exclude, kind);
          if (repl) {
            const beforeId = weakest.item.exercise_id;
            used.delete(weakest.item.exercise_id);
            used.add(repl.id);
            weakest.item.exercise_id = repl.id;
            weakest.item.exercise_name = repl.name;
            weakest.item.unilateral = repl.unilateral ?? false;
            const p = getPrescription(
              repl,
              weakest.block.block_type === "main_hypertrophy" ? "main_hypertrophy" : "main_strength",
              input.energy_level,
              input.primary_goal,
              false,
              fatigueVolumeScale,
              input.style_prefs?.user_level
            );
            weakest.item.sets = p.sets;
            weakest.item.reps = p.reps;
            weakest.item.rest_seconds = p.rest_seconds;
            weakest.item.coaching_cues = p.coaching_cues;
            logRepair({
              rule_id: v.ruleId,
              action: "replace_main_for_eccentric_decel_anchor",
              detail: v.description,
              exercise_id_before: beforeId,
              exercise_id_after: repl.id,
              block_type: weakest.block.block_type,
            });
            progressed = true;
          }
        }
      }

      if (v.ruleId.endsWith("eccentric_control_presence")) {
        for (const block of mergedBlocks) {
          if (block.block_type !== "main_strength" && block.block_type !== "main_hypertrophy") continue;
          for (const item of block.items) {
            const cur = byId.get(item.exercise_id);
            if (cur && exerciseMatchesAnySnowSportCategory(cur, [...ALPINE_ECCENTRIC_CONTROL_CATEGORIES])) continue;
            const exclude = usedIdsInSession();
            exclude.delete(item.exercise_id);
            const repl = findBestSnowSportReplacement(filtered, [...ALPINE_ECCENTRIC_CONTROL_CATEGORIES], exclude, kind);
            if (!repl) continue;
            const beforeId = item.exercise_id;
            used.delete(item.exercise_id);
            used.add(repl.id);
            item.exercise_id = repl.id;
            item.exercise_name = repl.name;
            item.unilateral = repl.unilateral ?? false;
            const p = getPrescription(
              repl,
              block.block_type === "main_hypertrophy" ? "main_hypertrophy" : "main_strength",
              input.energy_level,
              input.primary_goal,
              false,
              fatigueVolumeScale,
              input.style_prefs?.user_level
            );
            item.sets = p.sets;
            item.reps = p.reps;
            item.rest_seconds = p.rest_seconds;
            item.coaching_cues = p.coaching_cues;
            logRepair({
              rule_id: v.ruleId,
              action: "replace_main_for_eccentric_control",
              detail: v.description,
              exercise_id_before: beforeId,
              exercise_id_after: repl.id,
              block_type: block.block_type,
            });
            progressed = true;
          }
        }
      }

      if (v.ruleId.endsWith("endurance_or_trunk_presence")) {
        for (const block of mergedBlocks) {
          if (block.block_type !== "main_strength" && block.block_type !== "main_hypertrophy") continue;
          for (const item of block.items) {
            const cur = byId.get(item.exercise_id);
            if (cur && exerciseMatchesAnySnowSportCategory(cur, [...XC_ENDURANCE_TRUNK])) continue;
            const exclude = usedIdsInSession();
            exclude.delete(item.exercise_id);
            const repl = findBestSnowSportReplacement(filtered, [...XC_ENDURANCE_TRUNK], exclude, kind);
            if (!repl) continue;
            const beforeId = item.exercise_id;
            used.delete(item.exercise_id);
            used.add(repl.id);
            item.exercise_id = repl.id;
            item.exercise_name = repl.name;
            item.unilateral = repl.unilateral ?? false;
            const p = getPrescription(
              repl,
              block.block_type === "main_hypertrophy" ? "main_hypertrophy" : "main_strength",
              input.energy_level,
              input.primary_goal,
              false,
              fatigueVolumeScale,
              input.style_prefs?.user_level
            );
            item.sets = p.sets;
            item.reps = p.reps;
            item.rest_seconds = p.rest_seconds;
            item.coaching_cues = p.coaching_cues;
            logRepair({
              rule_id: v.ruleId,
              action: "replace_main_for_xc_endurance_trunk",
              detail: v.description,
              exercise_id_before: beforeId,
              exercise_id_after: repl.id,
              block_type: block.block_type,
            });
            progressed = true;
          }
        }
      }

      if (v.ruleId === "backcountry_uphill_engine_touch") {
        const repl = findBestSnowSportReplacement(filtered, [...UPHILL_TOUCH], usedIdsInSession(), kind);
        if (repl) {
          used.add(repl.id);
          const p = getPrescription(
            repl,
            "accessory",
            input.energy_level,
            input.primary_goal,
            true,
            fatigueVolumeScale,
            input.style_prefs?.user_level
          );
          const newItem: WorkoutItem = {
            exercise_id: repl.id,
            exercise_name: repl.name,
            sets: Math.max(3, Math.min(p.sets ?? 3, 4)),
            reps: p.reps,
            rest_seconds: p.rest_seconds,
            coaching_cues: p.coaching_cues,
            reasoning_tags: ["backcountry_skiing_support", ...(repl.tags.goal_tags ?? [])],
            unilateral: repl.unilateral ?? false,
          };
          const cooldownIdx = mergedBlocks.findIndex((b) => b.block_type === "cooldown");
          const newBlock: WorkoutBlock = {
            block_type: "accessory",
            format: "straight_sets",
            title: "Backcountry ascent support",
            reasoning: "Adds uphill or loaded-step signal for backcountry coverage.",
            items: [newItem],
            estimated_minutes: 6,
          };
          if (cooldownIdx >= 0) mergedBlocks.splice(cooldownIdx, 0, newBlock);
          else mergedBlocks.push(newBlock);
          addExerciseFatigueRegionsToSession(sessionFatigueRegions, repl);
          logRepair({
            rule_id: v.ruleId,
            action: "add_accessory_uphill_engine",
            detail: v.description,
            exercise_id_after: repl.id,
            block_type: "accessory",
          });
          progressed = true;
        }
      }

      if (v.ruleId.endsWith("lateral_or_trunk_stability")) {
        const repl = findBestSnowSportReplacement(
          filtered,
          [...ALPINE_LATERAL_STABILITY_CATEGORIES],
          usedIdsInSession(),
          kind
        );
        if (repl) {
          used.add(repl.id);
          const p = getPrescription(
            repl,
            "accessory",
            input.energy_level,
            input.primary_goal,
            true,
            fatigueVolumeScale,
            input.style_prefs?.user_level
          );
          const newItem: WorkoutItem = {
            exercise_id: repl.id,
            exercise_name: repl.name,
            sets: Math.max(3, Math.min(p.sets ?? 3, 4)),
            reps: p.reps,
            rest_seconds: p.rest_seconds,
            coaching_cues: p.coaching_cues,
            reasoning_tags: ["snow_sport_support", ...(repl.tags.goal_tags ?? [])],
            unilateral: repl.unilateral ?? false,
          };
          const cooldownIdx = mergedBlocks.findIndex((b) => b.block_type === "cooldown");
          const newBlock: WorkoutBlock = {
            block_type: "accessory",
            format: "straight_sets",
            title: "Snow sport support",
            reasoning: "Adds lateral or trunk-bracing work to satisfy snow-sport coverage.",
            items: [newItem],
            estimated_minutes: 6,
          };
          if (cooldownIdx >= 0) mergedBlocks.splice(cooldownIdx, 0, newBlock);
          else mergedBlocks.push(newBlock);
          addExerciseFatigueRegionsToSession(sessionFatigueRegions, repl);
          logRepair({
            rule_id: v.ruleId,
            action: "add_accessory_lateral_trunk_stability",
            detail: v.description,
            exercise_id_after: repl.id,
            block_type: "accessory",
          });
          progressed = true;
        }
      }

      if (v.ruleId.endsWith("lower_body_tension_endurance")) {
        const targetCats = [...ALPINE_LOWER_BODY_TENSION_ENDURANCE_CATEGORIES];
        for (const block of mergedBlocks) {
          if (block.block_type !== "main_strength" && block.block_type !== "main_hypertrophy") continue;
          for (const item of block.items) {
            const cur = byId.get(item.exercise_id);
            if (cur && exerciseMatchesAnySnowSportCategory(cur, targetCats)) continue;
            const exclude = usedIdsInSession();
            exclude.delete(item.exercise_id);
            const repl = findBestSnowSportReplacement(filtered, targetCats, exclude, kind);
            if (!repl) continue;
            const beforeId = item.exercise_id;
            used.delete(item.exercise_id);
            used.add(repl.id);
            item.exercise_id = repl.id;
            item.exercise_name = repl.name;
            item.unilateral = repl.unilateral ?? false;
            const p = getPrescription(
              repl,
              block.block_type === "main_hypertrophy" ? "main_hypertrophy" : "main_strength",
              input.energy_level,
              input.primary_goal,
              false,
              fatigueVolumeScale,
              input.style_prefs?.user_level
            );
            item.sets = p.sets;
            item.reps = p.reps;
            item.rest_seconds = p.rest_seconds;
            item.coaching_cues = p.coaching_cues;
            logRepair({
              rule_id: v.ruleId,
              action: "replace_main_for_lower_body_tension_endurance",
              detail: v.description,
              exercise_id_before: beforeId,
              exercise_id_after: repl.id,
              block_type: block.block_type,
            });
            progressed = true;
          }
        }
      }

      if (v.ruleId.endsWith("conditioning_relevance")) {
        const idx = mergedBlocks.findIndex((b) => b.block_type === "conditioning");
        if (idx < 0) continue;
        const block = mergedBlocks[idx];
        const item = block.items[0];
        if (!item) continue;
        const sid = usedIdsInSession();
        sid.delete(item.exercise_id);
        let altPool = filtered.filter(
          (e) => e.modality === "conditioning" && isSnowSportConditioningExercise(e, kind) && !sid.has(e.id)
        );
        if (altPool.length === 0) {
          altPool = filtered.filter((e) => e.modality === "conditioning" && isSnowSportConditioningExercise(e, kind));
        }
        const c = pickConditioningExercise(altPool, input.style_prefs?.preferred_zone2_cardio, rng);
        if (c) {
          const beforeId = item.exercise_id;
          used.delete(item.exercise_id);
          used.add(c.id);
          item.exercise_id = c.id;
          item.exercise_name = c.name;
          item.unilateral = c.unilateral ?? false;
          const p = getPrescription(
            c,
            "conditioning",
            input.energy_level,
            input.primary_goal,
            undefined,
            undefined,
            input.style_prefs?.user_level
          );
          const conditioningMins = block.estimated_minutes ?? 10;
          const interval = getConditioningStructureForExercise(
            c,
            conditioningMins,
            input.primary_goal
          );
          const conditioningTag = conditioningProtocolReasonTag(
            getConditioningProtocolKind(c)
          );
          item.sets = interval.sets;
          if (interval.reps != null) {
            item.reps = interval.reps;
            item.time_seconds = undefined;
          } else {
            item.reps = undefined;
            item.time_seconds = interval.time_seconds;
          }
          item.rest_seconds = interval.rest_seconds;
          item.coaching_cues = p.coaching_cues;
          item.reasoning_tags = ["endurance", conditioningTag, ...(c.tags.goal_tags ?? [])];
          logRepair({
            rule_id: v.ruleId,
            action: "replace_conditioning_alpine_relevant",
            detail: v.description,
            exercise_id_before: beforeId,
            exercise_id_after: c.id,
            block_type: "conditioning",
          });
          progressed = true;
        }
      }
    }

    if (!progressed) return;
  }
}

/** Post-build repair for hiking/backpacking minimum pattern coverage (mutates blocks + used). */
function tryRepairHikingSession(
  mergedBlocks: WorkoutBlock[],
  input: GenerateWorkoutInput,
  filtered: Exercise[],
  used: Set<string>,
  rng: () => number,
  fatigueVolumeScale: number | undefined,
  sessionFatigueRegions: Map<string, number>
): void {
  if (!hikingPatternTransferApplies(input)) return;
  const byId = new Map(filtered.map((e) => [e.id, e]));

  const usedIdsInSession = (): Set<string> =>
    new Set(mergedBlocks.flatMap((b) => b.items.map((i) => i.exercise_id)));

  for (let attempt = 0; attempt < 4; attempt++) {
    const ev = evaluateHikingCoverageForBlocks(input, mergedBlocks, byId);
    if (ev.ok) return;
    let progressed = false;

    for (const v of ev.violations) {
      if (v.ruleId === "hiking_main_primary_locomotion") {
        for (const block of mergedBlocks) {
          if (block.block_type !== "main_strength") continue;
          for (const item of block.items) {
            const cur = byId.get(item.exercise_id);
            if (cur && isValidHikingMainWorkExercise(cur)) continue;
            const exclude = usedIdsInSession();
            exclude.delete(item.exercise_id);
            const repl = findBestHikingMainWorkReplacement(filtered, exclude);
            if (!repl) continue;
            used.delete(item.exercise_id);
            used.add(repl.id);
            item.exercise_id = repl.id;
            item.exercise_name = repl.name;
            item.unilateral = repl.unilateral ?? false;
            const p = getPrescription(
              repl,
              "main_strength",
              input.energy_level,
              input.primary_goal,
              false,
              fatigueVolumeScale,
              input.style_prefs?.user_level
            );
            item.sets = p.sets;
            item.reps = p.reps;
            item.rest_seconds = p.rest_seconds;
            item.coaching_cues = p.coaching_cues;
            progressed = true;
          }
        }
      }

      if (v.ruleId === "hiking_support_second_pattern") {
        const repl = findBestHikingReplacement(
          filtered,
          [...HIKING_SUPPORT_COVERAGE_CATEGORIES],
          usedIdsInSession()
        );
        if (repl) {
          used.add(repl.id);
          const p = getPrescription(
            repl,
            "accessory",
            input.energy_level,
            input.primary_goal,
            true,
            fatigueVolumeScale,
            input.style_prefs?.user_level
          );
          const newItem: WorkoutItem = {
            exercise_id: repl.id,
            exercise_name: repl.name,
            sets: Math.max(3, Math.min(p.sets ?? 3, 4)),
            reps: p.reps,
            rest_seconds: p.rest_seconds,
            coaching_cues: p.coaching_cues,
            reasoning_tags: ["hiking_support", ...(repl.tags.goal_tags ?? [])],
            unilateral: repl.unilateral ?? false,
          };
          const cooldownIdx = mergedBlocks.findIndex((b) => b.block_type === "cooldown");
          const newBlock: WorkoutBlock = {
            block_type: "accessory",
            format: "straight_sets",
            title: "Hiking support",
            reasoning: "Adds a hiking-specific durability pattern to satisfy trail-transfer coverage.",
            items: [newItem],
            estimated_minutes: 6,
          };
          if (cooldownIdx >= 0) mergedBlocks.splice(cooldownIdx, 0, newBlock);
          else mergedBlocks.push(newBlock);
          addExerciseFatigueRegionsToSession(sessionFatigueRegions, repl);
          progressed = true;
        }
      }

      if (v.ruleId === "hiking_conditioning_relevance") {
        const idx = mergedBlocks.findIndex((b) => b.block_type === "conditioning");
        if (idx < 0) continue;
        const block = mergedBlocks[idx];
        const item = block.items[0];
        if (!item) continue;
        const sid = usedIdsInSession();
        sid.delete(item.exercise_id);
        let altPool = filtered.filter(
          (e) => e.modality === "conditioning" && isHikingConditioningExercise(e) && !sid.has(e.id)
        );
        if (altPool.length === 0) {
          altPool = filtered.filter((e) => e.modality === "conditioning" && isHikingConditioningExercise(e));
        }
        const c = pickConditioningExercise(altPool, input.style_prefs?.preferred_zone2_cardio, rng);
        if (c) {
          used.delete(item.exercise_id);
          used.add(c.id);
          item.exercise_id = c.id;
          item.exercise_name = c.name;
          item.unilateral = c.unilateral ?? false;
          const p = getPrescription(
            c,
            "conditioning",
            input.energy_level,
            input.primary_goal,
            undefined,
            undefined,
            input.style_prefs?.user_level
          );
          const conditioningMins = block.estimated_minutes ?? 10;
          const interval = getConditioningStructureForExercise(
            c,
            conditioningMins,
            input.primary_goal
          );
          const conditioningTag = conditioningProtocolReasonTag(
            getConditioningProtocolKind(c)
          );
          item.sets = interval.sets;
          if (interval.reps != null) {
            item.reps = interval.reps;
            item.time_seconds = undefined;
          } else {
            item.reps = undefined;
            item.time_seconds = interval.time_seconds;
          }
          item.rest_seconds = interval.rest_seconds;
          item.coaching_cues = p.coaching_cues;
          item.reasoning_tags = ["endurance", conditioningTag, ...(c.tags.goal_tags ?? [])];
          progressed = true;
        }
      }
    }

    if (!progressed) return;
  }
}

/** Post-build repair for trail-running minimum pattern coverage (mutates blocks + used). */
function tryRepairTrailRunningSession(
  mergedBlocks: WorkoutBlock[],
  input: GenerateWorkoutInput,
  filtered: Exercise[],
  used: Set<string>,
  rng: () => number,
  fatigueVolumeScale: number | undefined,
  sessionFatigueRegions: Map<string, number>
): void {
  if (!trailRunningPatternTransferApplies(input)) return;
  const byId = new Map(filtered.map((e) => [e.id, e]));

  const usedIdsInSession = (): Set<string> =>
    new Set(mergedBlocks.flatMap((b) => b.items.map((i) => i.exercise_id)));

  for (let attempt = 0; attempt < 4; attempt++) {
    const ev = evaluateTrailCoverageForBlocks(input, mergedBlocks, byId);
    if (ev.ok) return;
    let progressed = false;

    for (const v of ev.violations) {
      if (v.ruleId === "trail_main_primary_locomotion") {
        for (const block of mergedBlocks) {
          if (block.block_type !== "main_strength") continue;
          for (const item of block.items) {
            const cur = byId.get(item.exercise_id);
            if (cur && isValidTrailMainWorkExercise(cur)) continue;
            const exclude = usedIdsInSession();
            exclude.delete(item.exercise_id);
            const repl = findBestTrailMainWorkReplacement(filtered, exclude);
            if (!repl) continue;
            used.delete(item.exercise_id);
            used.add(repl.id);
            item.exercise_id = repl.id;
            item.exercise_name = repl.name;
            item.unilateral = repl.unilateral ?? false;
            const p = getPrescription(
              repl,
              "main_strength",
              input.energy_level,
              input.primary_goal,
              false,
              fatigueVolumeScale,
              input.style_prefs?.user_level
            );
            item.sets = p.sets;
            item.reps = p.reps;
            item.rest_seconds = p.rest_seconds;
            item.coaching_cues = p.coaching_cues;
            progressed = true;
          }
        }
      }

      if (v.ruleId === "trail_support_second_pattern") {
        const repl = findBestTrailRunningReplacement(
          filtered,
          [...TRAIL_SUPPORT_COVERAGE_CATEGORIES],
          usedIdsInSession()
        );
        if (repl) {
          used.add(repl.id);
          const p = getPrescription(
            repl,
            "accessory",
            input.energy_level,
            input.primary_goal,
            true,
            fatigueVolumeScale,
            input.style_prefs?.user_level
          );
          const newItem: WorkoutItem = {
            exercise_id: repl.id,
            exercise_name: repl.name,
            sets: Math.max(3, Math.min(p.sets ?? 3, 4)),
            reps: p.reps,
            rest_seconds: p.rest_seconds,
            coaching_cues: p.coaching_cues,
            reasoning_tags: ["trail_running_support", ...(repl.tags.goal_tags ?? [])],
            unilateral: repl.unilateral ?? false,
          };
          const cooldownIdx = mergedBlocks.findIndex((b) => b.block_type === "cooldown");
          const newBlock: WorkoutBlock = {
            block_type: "accessory",
            format: "straight_sets",
            title: "Trail running support",
            reasoning: "Adds a trail-running durability pattern to satisfy coverage.",
            items: [newItem],
            estimated_minutes: 6,
          };
          if (cooldownIdx >= 0) mergedBlocks.splice(cooldownIdx, 0, newBlock);
          else mergedBlocks.push(newBlock);
          addExerciseFatigueRegionsToSession(sessionFatigueRegions, repl);
          progressed = true;
        }
      }

      if (v.ruleId === "trail_conditioning_relevance") {
        const idx = mergedBlocks.findIndex((b) => b.block_type === "conditioning");
        if (idx < 0) continue;
        const block = mergedBlocks[idx];
        const item = block.items[0];
        if (!item) continue;
        const sid = usedIdsInSession();
        sid.delete(item.exercise_id);
        let altPool = filtered.filter(
          (e) => e.modality === "conditioning" && isTrailRunningConditioningExercise(e) && !sid.has(e.id)
        );
        if (altPool.length === 0) {
          altPool = filtered.filter((e) => e.modality === "conditioning" && isTrailRunningConditioningExercise(e));
        }
        const c = pickConditioningExercise(altPool, input.style_prefs?.preferred_zone2_cardio, rng);
        if (c) {
          used.delete(item.exercise_id);
          used.add(c.id);
          item.exercise_id = c.id;
          item.exercise_name = c.name;
          item.unilateral = c.unilateral ?? false;
          const p = getPrescription(
            c,
            "conditioning",
            input.energy_level,
            input.primary_goal,
            undefined,
            undefined,
            input.style_prefs?.user_level
          );
          const conditioningMins = block.estimated_minutes ?? 10;
          const interval = getConditioningStructureForExercise(
            c,
            conditioningMins,
            input.primary_goal
          );
          const conditioningTag = conditioningProtocolReasonTag(
            getConditioningProtocolKind(c)
          );
          item.sets = interval.sets;
          if (interval.reps != null) {
            item.reps = interval.reps;
            item.time_seconds = undefined;
          } else {
            item.reps = undefined;
            item.time_seconds = interval.time_seconds;
          }
          item.rest_seconds = interval.rest_seconds;
          item.coaching_cues = p.coaching_cues;
          item.reasoning_tags = ["endurance", conditioningTag, ...(c.tags.goal_tags ?? [])];
          progressed = true;
        }
      }
    }

    if (!progressed) return;
  }
}

/** Post-build repair for road-running minimum pattern coverage (mutates blocks + used). */
function tryRepairRoadRunningSession(
  mergedBlocks: WorkoutBlock[],
  input: GenerateWorkoutInput,
  filtered: Exercise[],
  used: Set<string>,
  rng: () => number,
  fatigueVolumeScale: number | undefined,
  sessionFatigueRegions: Map<string, number>
): void {
  if (!roadRunningPatternTransferApplies(input)) return;
  const byId = new Map(filtered.map((e) => [e.id, e]));

  const usedIdsInSession = (): Set<string> =>
    new Set(mergedBlocks.flatMap((b) => b.items.map((i) => i.exercise_id)));

  for (let attempt = 0; attempt < 4; attempt++) {
    const ev = evaluateRoadCoverageForBlocks(input, mergedBlocks, byId);
    if (ev.ok) return;
    let progressed = false;

    for (const v of ev.violations) {
      if (v.ruleId === "road_main_locomotion_support") {
        for (const block of mergedBlocks) {
          if (block.block_type !== "main_strength") continue;
          for (const item of block.items) {
            const cur = byId.get(item.exercise_id);
            if (cur && isValidRoadMainWorkExercise(cur)) continue;
            const exclude = usedIdsInSession();
            exclude.delete(item.exercise_id);
            const repl = findBestRoadMainWorkReplacement(filtered, exclude);
            if (!repl) continue;
            used.delete(item.exercise_id);
            used.add(repl.id);
            item.exercise_id = repl.id;
            item.exercise_name = repl.name;
            item.unilateral = repl.unilateral ?? false;
            const p = getPrescription(
              repl,
              "main_strength",
              input.energy_level,
              input.primary_goal,
              false,
              fatigueVolumeScale,
              input.style_prefs?.user_level
            );
            item.sets = p.sets;
            item.reps = p.reps;
            item.rest_seconds = p.rest_seconds;
            item.coaching_cues = p.coaching_cues;
            progressed = true;
          }
        }
      }

      if (v.ruleId === "road_support_second_pattern") {
        const repl = findBestRoadRunningReplacement(
          filtered,
          [...ROAD_SUPPORT_COVERAGE_CATEGORIES],
          usedIdsInSession()
        );
        if (repl) {
          used.add(repl.id);
          const p = getPrescription(
            repl,
            "accessory",
            input.energy_level,
            input.primary_goal,
            true,
            fatigueVolumeScale,
            input.style_prefs?.user_level
          );
          const newItem: WorkoutItem = {
            exercise_id: repl.id,
            exercise_name: repl.name,
            sets: Math.max(3, Math.min(p.sets ?? 3, 4)),
            reps: p.reps,
            rest_seconds: p.rest_seconds,
            coaching_cues: p.coaching_cues,
            reasoning_tags: ["road_running_support", ...(repl.tags.goal_tags ?? [])],
            unilateral: repl.unilateral ?? false,
          };
          const cooldownIdx = mergedBlocks.findIndex((b) => b.block_type === "cooldown");
          const newBlock: WorkoutBlock = {
            block_type: "accessory",
            format: "straight_sets",
            title: "Road running support",
            reasoning: "Adds a road-running durability pattern to satisfy coverage.",
            items: [newItem],
            estimated_minutes: 6,
          };
          if (cooldownIdx >= 0) mergedBlocks.splice(cooldownIdx, 0, newBlock);
          else mergedBlocks.push(newBlock);
          addExerciseFatigueRegionsToSession(sessionFatigueRegions, repl);
          progressed = true;
        }
      }

      if (v.ruleId === "road_conditioning_relevance") {
        const idx = mergedBlocks.findIndex((b) => b.block_type === "conditioning");
        if (idx < 0) continue;
        const block = mergedBlocks[idx];
        const item = block.items[0];
        if (!item) continue;
        const sid = usedIdsInSession();
        sid.delete(item.exercise_id);
        let altPool = filtered.filter(
          (e) => e.modality === "conditioning" && isRoadRunningConditioningExercise(e) && !sid.has(e.id)
        );
        if (altPool.length === 0) {
          altPool = filtered.filter((e) => e.modality === "conditioning" && isRoadRunningConditioningExercise(e));
        }
        const c = pickConditioningExercise(altPool, input.style_prefs?.preferred_zone2_cardio, rng);
        if (c) {
          used.delete(item.exercise_id);
          used.add(c.id);
          item.exercise_id = c.id;
          item.exercise_name = c.name;
          item.unilateral = c.unilateral ?? false;
          const p = getPrescription(
            c,
            "conditioning",
            input.energy_level,
            input.primary_goal,
            undefined,
            undefined,
            input.style_prefs?.user_level
          );
          const conditioningMins = block.estimated_minutes ?? 10;
          const interval = getConditioningStructureForExercise(
            c,
            conditioningMins,
            input.primary_goal
          );
          const conditioningTag = conditioningProtocolReasonTag(
            getConditioningProtocolKind(c)
          );
          item.sets = interval.sets;
          if (interval.reps != null) {
            item.reps = interval.reps;
            item.time_seconds = undefined;
          } else {
            item.reps = undefined;
            item.time_seconds = interval.time_seconds;
          }
          item.rest_seconds = interval.rest_seconds;
          item.coaching_cues = p.coaching_cues;
          item.reasoning_tags = ["endurance", conditioningTag, ...(c.tags.goal_tags ?? [])];
          progressed = true;
        }
      }
    }

    if (!progressed) return;
  }
}

/** Post-build repair for soccer / field-sport minimum coverage (mutates blocks + used). */
function tryRepairSoccerSession(
  mergedBlocks: WorkoutBlock[],
  input: GenerateWorkoutInput,
  filtered: Exercise[],
  used: Set<string>,
  rng: () => number,
  fatigueVolumeScale: number | undefined,
  sessionFatigueRegions: Map<string, number>
): void {
  if (!soccerPatternTransferApplies(input)) return;
  const byId = new Map(filtered.map((e) => [e.id, e]));

  const usedIdsInSession = (): Set<string> =>
    new Set(mergedBlocks.flatMap((b) => b.items.map((i) => i.exercise_id)));

  for (let attempt = 0; attempt < 4; attempt++) {
    const ev = evaluateSoccerCoverageForBlocks(input, mergedBlocks, byId);
    if (ev.ok) return;
    let progressed = false;

    for (const v of ev.violations) {
      if (v.ruleId === "soccer_main_transfer") {
        for (const block of mergedBlocks) {
          if (block.block_type !== "main_strength") continue;
          for (const item of block.items) {
            const cur = byId.get(item.exercise_id);
            if (cur && isValidSoccerMainWorkExercise(cur)) continue;
            const exclude = usedIdsInSession();
            exclude.delete(item.exercise_id);
            const repl = findBestSoccerMainWorkReplacement(filtered, exclude);
            if (!repl) continue;
            used.delete(item.exercise_id);
            used.add(repl.id);
            item.exercise_id = repl.id;
            item.exercise_name = repl.name;
            item.unilateral = repl.unilateral ?? false;
            const p = getPrescription(
              repl,
              "main_strength",
              input.energy_level,
              input.primary_goal,
              false,
              fatigueVolumeScale,
              input.style_prefs?.user_level
            );
            item.sets = p.sets;
            item.reps = p.reps;
            item.rest_seconds = p.rest_seconds;
            item.coaching_cues = p.coaching_cues;
            progressed = true;
          }
        }
      }

      if (v.ruleId === "soccer_support_second_pattern") {
        const repl = findBestSoccerReplacement(filtered, [...SOCCER_SUPPORT_COVERAGE_CATEGORIES], usedIdsInSession());
        if (repl) {
          used.add(repl.id);
          const p = getPrescription(
            repl,
            "accessory",
            input.energy_level,
            input.primary_goal,
            true,
            fatigueVolumeScale,
            input.style_prefs?.user_level
          );
          const newItem: WorkoutItem = {
            exercise_id: repl.id,
            exercise_name: repl.name,
            sets: Math.max(3, Math.min(p.sets ?? 3, 4)),
            reps: p.reps,
            rest_seconds: p.rest_seconds,
            coaching_cues: p.coaching_cues,
            reasoning_tags: ["soccer_field_support", ...(repl.tags.goal_tags ?? [])],
            unilateral: repl.unilateral ?? false,
          };
          const cooldownIdx = mergedBlocks.findIndex((b) => b.block_type === "cooldown");
          const newBlock: WorkoutBlock = {
            block_type: "accessory",
            format: "straight_sets",
            title: "Soccer support",
            reasoning: "Adds a soccer-transfer pattern (RSA/COD/unilateral/trunk support) to satisfy coverage.",
            items: [newItem],
            estimated_minutes: 6,
          };
          if (cooldownIdx >= 0) mergedBlocks.splice(cooldownIdx, 0, newBlock);
          else mergedBlocks.push(newBlock);
          addExerciseFatigueRegionsToSession(sessionFatigueRegions, repl);
          progressed = true;
        }
      }

      if (v.ruleId === "soccer_conditioning_rsa_relevant") {
        const idx = mergedBlocks.findIndex((b) => b.block_type === "conditioning");
        if (idx < 0) continue;
        const block = mergedBlocks[idx];
        const item = block.items[0];
        if (!item) continue;
        const sid = usedIdsInSession();
        sid.delete(item.exercise_id);
        let altPool = filtered.filter(
          (e) => e.modality === "conditioning" && isSoccerConditioningExercise(e) && !sid.has(e.id)
        );
        if (altPool.length === 0) {
          altPool = filtered.filter((e) => e.modality === "conditioning" && isSoccerConditioningExercise(e));
        }
        const c = pickConditioningExercise(altPool, input.style_prefs?.preferred_zone2_cardio, rng);
        if (c) {
          used.delete(item.exercise_id);
          used.add(c.id);
          item.exercise_id = c.id;
          item.exercise_name = c.name;
          item.unilateral = c.unilateral ?? false;
          const p = getPrescription(
            c,
            "conditioning",
            input.energy_level,
            input.primary_goal,
            undefined,
            undefined,
            input.style_prefs?.user_level
          );
          const conditioningMins = block.estimated_minutes ?? 10;
          const interval = getConditioningStructureForExercise(
            c,
            conditioningMins,
            input.primary_goal
          );
          const conditioningTag = conditioningProtocolReasonTag(
            getConditioningProtocolKind(c)
          );
          item.sets = interval.sets;
          if (interval.reps != null) {
            item.reps = interval.reps;
            item.time_seconds = undefined;
          } else {
            item.reps = undefined;
            item.time_seconds = interval.time_seconds;
          }
          item.rest_seconds = interval.rest_seconds;
          item.coaching_cues = p.coaching_cues;
          item.reasoning_tags = ["endurance", conditioningTag, ...(c.tags.goal_tags ?? [])];
          progressed = true;
        }
      }
    }

    if (!progressed) return;
  }
}

// --- Session title: body focus + goal + optional secondary + duration ---
function sessionTitle(input: GenerateWorkoutInput): string {
  const goal = input.primary_goal.replace(/_/g, " ");
  const cap = goal.charAt(0).toUpperCase() + goal.slice(1);
  const focus = input.focus_body_parts ?? [];
  const hasFocus = focus.length > 0 && !focus.some((f) => f.toLowerCase() === "full_body");
  const focusLabel = hasFocus
    ? focus
        .map((f) => {
          const k = f.toLowerCase().replace(/\s/g, "_");
          if (k === "upper_push") return "Push";
          if (k === "upper_pull") return "Pull";
          if (k === "upper_body") return "Upper";
          if (k === "lower" || k === "lower_body") return "Lower";
          if (k === "quad") return "Quad";
          if (k === "posterior") return "Posterior";
          if (k === "core") return "Core";
          return f;
        })
        .filter((x, i, a) => a.indexOf(x) === i)
        .join(" ")
    : "";
  const secondary = input.secondary_goals ?? [];
  const secondaryLabels = secondary
    .map(goalToDisplayLabel)
    .filter((x, i, a) => a.indexOf(x) === i);
  const suffix = secondaryLabels.length > 0 ? " + " + secondaryLabels.join(" + ") : "";
  if (focusLabel) return `${focusLabel} ${cap}${suffix} • ${input.duration_minutes} min`;
  return `${cap}${suffix} • ${input.duration_minutes} min`;
}

const CRITICAL_UNRESOLVED_VALIDATION_TYPES = new Set([
  "injury_restriction",
  "body_part_focus",
]);

type InternalGenerateWorkoutInput = GenerateWorkoutInput & {
  __validation_regenerate_attempted?: boolean;
};

const sportProfileMapFailedLogKeysSeen = new Set<string>();

function makeSportProfileMapFailedLogKey(canonicalSlug: string, errors: string[]): string {
  return JSON.stringify({
    canonical_sport_definition_slug: canonicalSlug,
    errors: [...errors].sort(),
  });
}

function logSportProfileMapFailedOnce(canonicalSlug: string, errors: string[]): void {
  const key = makeSportProfileMapFailedLogKey(canonicalSlug, errors);
  if (sportProfileMapFailedLogKeysSeen.has(key)) return;
  sportProfileMapFailedLogKeysSeen.add(key);
  console.error("[SportProfile] canonical map failed; continuing without sport profile engine", {
    canonical_sport_definition_slug: canonicalSlug,
    errors,
  });
}

/** Test-only: clear runtime dedupe state for map-failed sport profile logs. */
export function __resetSportProfileMapFailedLogDedupeForTests(): void {
  sportProfileMapFailedLogKeysSeen.clear();
}

function applyCriticalValidationSafeguard(
  session: WorkoutSession,
  validation: ValidationResult
): WorkoutSession | null {
  const unresolvedCritical = validation.violations.filter(
    (v) =>
      v.repaired !== true &&
      CRITICAL_UNRESOLVED_VALIDATION_TYPES.has(v.type)
  );
  if (unresolvedCritical.length === 0) return null;

  const removeByBlock = new Map<number, Set<string>>();
  for (const v of unresolvedCritical) {
    if (v.exerciseId == null) continue;
    const bucket = removeByBlock.get(v.blockIndex) ?? new Set<string>();
    bucket.add(v.exerciseId);
    removeByBlock.set(v.blockIndex, bucket);
  }
  if (removeByBlock.size === 0) return null;

  const sanitizedBlocks: WorkoutBlock[] = session.blocks
    .map((b, idx) => {
      const removeIds = removeByBlock.get(idx);
      if (!removeIds || removeIds.size === 0) return b;
      const items = b.items.filter((it) => !removeIds.has(it.exercise_id));
      return { ...b, items };
    })
    .filter((b) => b.items.length > 0);

  if (sanitizedBlocks.length === 0) return null;
  const sumBlockMinutes = sanitizedBlocks.reduce(
    (sum, b) => sum + (b.estimated_minutes ?? 5),
    0
  );

  return {
    ...session,
    blocks: sanitizedBlocks,
    estimated_duration_minutes: Math.max(
      session.estimated_duration_minutes,
      sumBlockMinutes
    ),
  };
}

function appendValidationFallbackDebug(
  session: WorkoutSession,
  validation: ValidationResult
): WorkoutSession {
  const unresolved = validation.violations.filter((v) => v.repaired !== true);
  const unresolvedTypes = [...new Set(unresolved.map((v) => v.type))];
  const unresolvedCriticalTypes = unresolvedTypes.filter((t) =>
    CRITICAL_UNRESOLVED_VALIDATION_TYPES.has(t)
  );
  return {
    ...session,
    debug: {
      ...(session.debug ?? {}),
      validation_fallback: {
        unresolved_violation_count: unresolved.length,
        unresolved_violation_types: unresolvedTypes,
        unresolved_has_critical_types: unresolvedCriticalTypes.length > 0,
        unresolved_critical_types: unresolvedCriticalTypes,
      },
    },
  };
}

function unresolvedCriticalValidationTypes(validation: ValidationResult): string[] {
  return [
    ...new Set(
      validation.violations
        .filter((v) => v.repaired !== true && CRITICAL_UNRESOLVED_VALIDATION_TYPES.has(v.type))
        .map((v) => v.type)
    ),
  ];
}

function buildValidationRegenerateInput(
  input: GenerateWorkoutInput,
  unresolvedCriticalTypes: string[]
): InternalGenerateWorkoutInput {
  const seed = input.seed ?? 0;
  const perturbation = hashString(
    JSON.stringify({
      seed,
      unresolved_critical_types: [...unresolvedCriticalTypes].sort(),
      iteration: 13,
    })
  );
  return {
    ...(input as InternalGenerateWorkoutInput),
    seed: seed + perturbation + 13,
    __validation_regenerate_attempted: true,
  };
}

function applyCardioDominantMainBlockBias(
  blocks: WorkoutBlock[],
  profile: ReturnType<typeof buildBlockIntentProfile>
): void {
  if (!profile.cardioDominant || profile.sessionCardioShare < 0.45) return;
  const preferredMainFormat = profile.preferredBlockFormatsByRole.main[0];
  const shouldUseTimeBasedMain = profile.sessionCardioShare >= 0.55;
  for (const block of blocks) {
    if (
      block.block_type !== "main_strength" &&
      block.block_type !== "main_hypertrophy" &&
      block.block_type !== "accessory"
    ) {
      continue;
    }
    if (preferredMainFormat) {
      block.format = preferredMainFormat;
      if (preferredMainFormat !== "superset") {
        delete block.supersetPairs;
      }
    }
    if (!shouldUseTimeBasedMain) continue;
    for (const item of block.items) {
      if (item.time_seconds != null && item.time_seconds > 0) continue;
      const blockWorkSeconds =
        block.block_type === "main_strength"
          ? 45
          : block.block_type === "main_hypertrophy"
            ? 60
            : 50;
      item.time_seconds = blockWorkSeconds;
      delete item.reps;
      item.rest_seconds = Math.min(item.rest_seconds ?? 30, 30);
    }
  }
}

function hasSurfingPopUpPowerSubFocus(input: GenerateWorkoutInput): boolean {
  const selectedSportSubFocus = input.sport_sub_focus ?? {};
  for (const [sportSlugRaw, subFocuses] of Object.entries(selectedSportSubFocus)) {
    const sportSlug = tagToSlug(getCanonicalSportSlug(sportSlugRaw));
    if (sportSlug !== "surfing") continue;
    const normalized = (subFocuses ?? []).map((s) => tagToSlug(String(s)));
    const hasPopUpPower = normalized.includes("pop_up_power");
    const hasPaddleEndurance = normalized.includes("paddle_endurance");
    if (hasPopUpPower && !hasPaddleEndurance) return true;
  }
  return false;
}

function isRowOrUpperPullExercise(exercise: Exercise): boolean {
  const family = (exercise.primary_movement_family ?? "").toLowerCase().replace(/\s/g, "_");
  if (family === "upper_pull") return true;
  const pattern = (exercise.movement_pattern ?? "").toLowerCase().replace(/\s/g, "_");
  if (pattern === "pull") return true;
  const patterns = (exercise.movement_patterns ?? []).map((p) => p.toLowerCase().replace(/\s/g, "_"));
  if (patterns.some((p) => p === "horizontal_pull" || p === "vertical_pull" || p === "pull")) return true;
  const tagSlugs = getExerciseTagSlugs(exercise);
  if (tagSlugs.has("horizontal_pull") || tagSlugs.has("vertical_pull") || tagSlugs.has("pulling_strength")) return true;
  return /\brow\b/.test(exercise.id.toLowerCase()) || /\brow\b/.test(exercise.name.toLowerCase());
}

function applySurfPopUpPowerPoolFilter(pool: Exercise[], input: GenerateWorkoutInput): Exercise[] {
  if (!hasSurfingPopUpPowerSubFocus(input)) return pool;
  const filtered = pool.filter((e) => !isRowOrUpperPullExercise(e));
  return filtered.length > 0 ? filtered : pool;
}

// --- Main entry: 8-step generation flow ---
/** @param exercisePool Full catalog for this request (e.g. from `listExercisesForGenerator`). No default — avoids accidentally using the tiny test stub in production. */
export function generateWorkoutSession(
  input: GenerateWorkoutInput,
  exercisePool: Exercise[]
): WorkoutSession {
  const seed = input.seed ?? 0;
  const rngSeed = hashString(
    JSON.stringify({
      seed,
      primary_goal: input.primary_goal,
      focus_body_parts: input.focus_body_parts ?? null,
      duration_minutes: input.duration_minutes,
      secondary_goals: input.secondary_goals ?? [],
    })
  );
  const rng = createSeededRng(rngSeed);

  const gatedExerciseResult = resolveGatedExercisePoolForGeneration(exercisePool, input);
  const effectiveExercisePool = gatedExerciseResult.pool;
  if (input.log_pruning_gate_to_console) {
    logPruningGateToConsole(gatedExerciseResult.debug);
  }
  const flagsForPruningDebug = mergePruningGateFlags(input);
  const pruningGateDebugForSession =
    input.omit_pruning_gate_session_debug
      ? undefined
      : flagsForPruningDebug.enable_pruning_gating || input.include_pruning_gate_comparison === true
        ? gatedExerciseResult.debug
        : undefined;

  attachWorkoutLevelScoringContext(input, effectiveExercisePool);

  // 1. Determine goal rules (from prescriptionRules)
  const primary = input.primary_goal;
  const goalRules = getGoalRules(primary);
  const blockIntentProfile = buildBlockIntentProfile(input);

  // 2. Filter exercises: equipment + energy + avoid (filterByHardConstraints), then constraint-based injury/body-part (single source of truth with validator).
  const hardFiltered = filterByHardConstraints(effectiveExercisePool, input);
  const constraints = resolveWorkoutConstraints(inputToSelectionInput(input));
  /** Injury-safe pool without body-part split — used to guarantee goal sub-focus on any training day. */
  let guaranteePool = hardFiltered.filter((e) => {
    const shape = toConstraintEligibilityShape(e);
    return isExerciseAllowedByInjuries(shape, constraints);
  });
  let filtered = filterByConstraintsForPool(hardFiltered, constraints);
  const guaranteePoolCountAfterInjuryGate = guaranteePool.length;
  const filteredPoolCountAfterConstraintGate = filtered.length;

  let sportProfileSessionSnapshot: SportProfileAppliedSnapshot | null = null;
  let sportProfileCanonicalMappingFailure: {
    canonical_sport_definition_slug: string;
    errors: string[];
  } | null = null;
  let sportProfileForcedConditioning = false;
  let sportProfileCondSortApplied = false;
  let sportProfileCondMinFloor: number | undefined;

  const spLoad = loadSportProfileForSession(input);
  if (spLoad.status === "applied") {
    const { profile, canonicalSlug, mapResult } = spLoad;
    const poolBefore = filtered.length;
    const adj = getSportAdjustedExercisePool(filtered, profile, 0);
    filtered = adj.pool;
    const adjG = getSportAdjustedExercisePool(guaranteePool, profile, adj.relaxLevel);
    guaranteePool = adjG.pool;
    sportProfileSessionSnapshot = {
      profile,
      relaxLevel: adjG.relaxLevel,
      poolBefore,
      poolAfter: filtered.length,
      enforcedBiasLabel: formatStructureBiasLabel(profile),
      mapping: buildSportProfileMappingDebug(canonicalSlug, profile, mapResult),
    };
    input.sport_profile_for_scoring = profile;
    input.sport_profile_session_composition = {
      conditioningPickerMinutesMultiplier: profile.compositionNudge.conditioningPickerMinutesMultiplier,
    };
  } else if (spLoad.status === "map_failed") {
    logSportProfileMapFailedOnce(spLoad.canonicalSlug, spLoad.errors);
    sportProfileCanonicalMappingFailure = {
      canonical_sport_definition_slug: spLoad.canonicalSlug,
      errors: spLoad.errors,
    };
  }

  filtered = applySurfPopUpPowerPoolFilter(filtered, input);
  guaranteePool = applySurfPopUpPowerPoolFilter(guaranteePool, input);

  const used = new Set<string>();
  const historyContext = input.training_history ?? buildHistoryContextFromLegacy(input);
  const legacyRecentIds = new Set(input.recent_history?.flatMap((h) => h.exercise_ids) ?? []);
  const recentIds = getEffectiveRecentIds(legacyRecentIds, historyContext);
  const movementCounts = new Map<string, number>();

  // Fatigue management: volume scale and fatigued muscle groups from recent history
  const fatigueState = getFatigueState(input.recent_history, {
    energy_level: input.energy_level,
  });
  const fatigueVolumeScale = fatigueState.volumeScaleFactor;

  // Resolve strength profile early so warm-up can align with intent.
  let strengthProfileForWarmup: SubFocusProfile | null = null;
  if (primary === "strength" && (input.goal_sub_focus?.[primary]?.length ?? 0) > 0) {
    strengthProfileForWarmup = resolveSubFocusProfile({
      goalSlug: primary,
      rankedSubFocusSlugs: input.goal_sub_focus[primary] ?? [],
      rankWeights: input.goal_sub_focus_weights?.[primary],
    });
  }

  // 3. Build warmup
  const warmup = buildWarmup(
    filtered,
    input,
    used,
    rng,
    fatigueState,
    historyContext,
    strengthProfileForWarmup,
    blockIntentProfile.warmupPreferredTargets
  );
  const blocks: WorkoutBlock[] = [warmup];

  const wantsSupersets = input.style_prefs?.wants_supersets !== false;
  const sessionFatigueRegions = new Map<string, number>();
  const hikingEnforcementSnapshot: HikingSessionEnforcementSnapshot = {};
  const trailRunningEnforcementSnapshot: HikingSessionEnforcementSnapshot = {};
  const roadRunningEnforcementSnapshot: HikingSessionEnforcementSnapshot = {};
  const soccerEnforcementSnapshot: HikingSessionEnforcementSnapshot = {};
  const alpineSkiingEnforcementSnapshot: HikingSessionEnforcementSnapshot = {};
  const sessionSportPatternCategoryCounts = new Map<string, number>();
  const sportPatternHikingEmphasis = hikingPatternTransferApplies(input) ? computeHikingEmphasisBucket(seed) : 0;
  const sportPatternTrailEmphasis = trailRunningPatternTransferApplies(input)
    ? computeTrailRunningEmphasisBucket(seed)
    : 0;
  const sportPatternRoadEmphasis = roadRunningPatternTransferApplies(input)
    ? computeRoadRunningEmphasisBucket(seed)
    : 0;
  const sportPatternSoccerEmphasis = soccerPatternTransferApplies(input) ? computeSoccerEmphasisBucket(seed) : 0;
  const sessionSnowKindForGen = resolveSnowSportKind(input);
  const sportPatternAlpineEmphasis =
    sessionSnowKindForGen != null && snowSportBodyFocusAllows(input)
      ? computeSnowSportEmphasisBucket(seed, sessionSnowKindForGen)
      : 0;
  const rockClimbingEnforcementSnapshot: HikingSessionEnforcementSnapshot = {};
  const sportPatternRockClimbingEmphasis = rockClimbingPatternTransferApplies(input)
    ? computeRockClimbingEmphasisBucket(seed)
    : 0;

  const intentCollector =
    input.include_intent_survival_report === true
      ? createIntentSurvivalCollector(input, input.sport_slugs?.[0])
      : undefined;
  if (intentCollector && input.intent_survival_upstream) {
    intentCollector.setUpstream(input.intent_survival_upstream);
  }

  const mainSelectorTrace: MainSelectorSessionTrace = { entries: [] };

  // 4. Build main block (goal-specific); session fatigue regions improve later picks
  if (primary === "power") {
    blocks.push(...buildPowerBlock(filtered, input, used, recentIds, movementCounts, rng, fatigueVolumeScale, fatigueState, sessionFatigueRegions, historyContext));
    if (input.duration_minutes >= 45) {
      const accessoryPool = filtered.filter(
        (e) =>
          (e.modality === "strength" || e.modality === "hypertrophy") &&
          !used.has(e.id) &&
          !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
      );
      const pairs = pickBestSupersetPairs(accessoryPool, 1, used) as [Exercise, Exercise][];
      if (pairs.length > 0) {
        const [exA, exB] = pairs[0];
        used.add(exA.id);
        used.add(exB.id);
        const pA = getPrescription(exA, "main_strength", input.energy_level, "power", true, fatigueVolumeScale, input.style_prefs?.user_level);
        const pB = getPrescription(exB, "main_strength", input.energy_level, "power", true, fatigueVolumeScale, input.style_prefs?.user_level);
        const itemA: WorkoutItem = {
          exercise_id: exA.id,
          exercise_name: exA.name,
          sets: pA.sets,
          reps: pA.reps,
          rest_seconds: pA.rest_seconds,
          coaching_cues: pA.coaching_cues,
          reasoning_tags: ["accessory", ...(exA.tags?.goal_tags ?? [])],
          unilateral: exA.unilateral ?? false,
        };
        const itemB: WorkoutItem = {
          exercise_id: exB.id,
          exercise_name: exB.name,
          sets: pB.sets,
          reps: pB.reps,
          rest_seconds: pB.rest_seconds,
          coaching_cues: pB.coaching_cues,
          reasoning_tags: ["accessory", ...(exB.tags?.goal_tags ?? [])],
          unilateral: exB.unilateral ?? false,
        };
        blocks.push({
          block_type: "accessory",
          format: "superset",
          title: "Accessory",
          reasoning: "Supporting work; controlled after power.",
          items: [itemA, itemB],
          supersetPairs: [[itemA, itemB]],
          estimated_minutes: 8,
        });
      }
    }
  } else if (primary === "strength") {
    blocks.push(
      ...buildMainStrength(
        filtered,
        input,
        used,
        recentIds,
        movementCounts,
        rng,
        wantsSupersets,
        fatigueVolumeScale,
        fatigueState,
        sessionFatigueRegions,
        historyContext,
        strengthProfileForWarmup,
        hikingEnforcementSnapshot,
        trailRunningEnforcementSnapshot,
        roadRunningEnforcementSnapshot,
        soccerEnforcementSnapshot,
        alpineSkiingEnforcementSnapshot,
        rockClimbingEnforcementSnapshot,
        sessionSportPatternCategoryCounts,
        sportPatternHikingEmphasis,
        sportPatternTrailEmphasis,
        sportPatternRoadEmphasis,
        sportPatternSoccerEmphasis,
        sportPatternAlpineEmphasis,
        sportPatternRockClimbingEmphasis,
        intentCollector,
        mainSelectorTrace,
        blockIntentProfile.targetCardioExerciseShare
      )
    );
  } else if (primary === "hypertrophy" || primary === "body_recomp" || primary === "calisthenics") {
    blocks.push(
      ...buildMainHypertrophy(
        filtered,
        input,
        used,
        recentIds,
        movementCounts,
        rng,
        wantsSupersets,
        fatigueVolumeScale,
        fatigueState,
        sessionFatigueRegions,
        historyContext,
        hikingEnforcementSnapshot,
        trailRunningEnforcementSnapshot,
        roadRunningEnforcementSnapshot,
        soccerEnforcementSnapshot,
        alpineSkiingEnforcementSnapshot,
        rockClimbingEnforcementSnapshot,
        sessionSportPatternCategoryCounts,
        sportPatternHikingEmphasis,
        sportPatternTrailEmphasis,
        sportPatternRoadEmphasis,
        sportPatternSoccerEmphasis,
        sportPatternAlpineEmphasis,
        sportPatternRockClimbingEmphasis,
        intentCollector,
        mainSelectorTrace,
        blockIntentProfile.targetCardioExerciseShare
      )
    );
  } else if (primary === "endurance" || primary === "conditioning") {
    const conditioningProfile: SubFocusProfile | null =
      (input.goal_sub_focus?.[primary]?.length ?? 0) > 0
        ? resolveSubFocusProfile({
            goalSlug: primary,
            rankedSubFocusSlugs: input.goal_sub_focus[primary] ?? [],
          })
        : null;
    blocks.push(
      ...buildEnduranceMain(
        filtered,
        input,
        used,
        recentIds,
        movementCounts,
        rng,
        fatigueVolumeScale,
        fatigueState,
        sessionFatigueRegions,
        historyContext,
        conditioningProfile
      )
    );
  } else if (primary === "mobility" || primary === "recovery") {
    blocks.push(...buildMobilityRecoveryMain(filtered, input, used, rng));
  } else {
    blocks.push(
      ...buildMainStrength(
        filtered,
        input,
        used,
        recentIds,
        movementCounts,
        rng,
        wantsSupersets,
        fatigueVolumeScale,
        fatigueState,
        sessionFatigueRegions,
        historyContext,
        null,
        hikingEnforcementSnapshot,
        trailRunningEnforcementSnapshot,
        roadRunningEnforcementSnapshot,
        soccerEnforcementSnapshot,
        alpineSkiingEnforcementSnapshot,
        rockClimbingEnforcementSnapshot,
        sessionSportPatternCategoryCounts,
        sportPatternHikingEmphasis,
        sportPatternTrailEmphasis,
        sportPatternRoadEmphasis,
        sportPatternSoccerEmphasis,
        sportPatternAlpineEmphasis,
        sportPatternRockClimbingEmphasis,
        intentCollector,
        mainSelectorTrace,
        blockIntentProfile.targetCardioExerciseShare
      )
    );
  }

  // 5. Build accessory (handled inside buildMainStrength / buildMainHypertrophy per goal rules)

  // 5a. Strength block when strength is secondary goal (prefer_strength_block; primary is not already strength/power)
  if (constraints.prefer_strength_block && primary !== "strength" && primary !== "power") {
    const hasStrengthBlock = blocks.some((b) => b.block_type === "main_strength");
    if (!hasStrengthBlock) {
      const mainStrengthPatterns = new Set(["squat", "hinge", "push", "pull"]);
      let strengthPool = filtered.filter(
        (e) =>
          (e.modality === "strength" || e.modality === "power") &&
          !used.has(e.id) &&
          mainStrengthPatterns.has(effectiveMainWorkPattern(e)) &&
          !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
      );
      strengthPool = applyWeekMainLiftExclusion(strengthPool, input);
      const count = input.duration_minutes >= 45 ? 2 : 1;
      const hikingSecRule = hikingPatternTransferApplies(input)
        ? getHikingSlotRuleForBlockType("main_strength")
        : undefined;
      const roadSecRule = roadRunningPatternTransferApplies(input)
        ? getRoadRunningSlotRuleForBlockType("main_strength")
        : undefined;
      const trailSecRule = trailRunningPatternTransferApplies(input)
        ? getTrailRunningSlotRuleForBlockType("main_strength")
        : undefined;
      const soccerSecRule = soccerPatternTransferApplies(input) ? getSoccerSlotRuleForBlockType("main_strength") : undefined;
      const rockSecRule = rockClimbingPatternTransferApplies(input) ? getRockClimbingSlotRule("main_strength") : undefined;
      const snowSecRule =
        sessionSnowKindForGen != null && snowSportBodyFocusAllows(input)
          ? getSnowSportSlotRule("main_strength", sessionSnowKindForGen)
          : undefined;
      let hikingSecMode: "gated" | "fallback" | undefined;
      let roadSecMode: "gated" | "fallback" | undefined;
      let trailSecMode: "gated" | "fallback" | undefined;
      let soccerSecMode: "gated" | "fallback" | undefined;
      let rockSecMode: "gated" | "fallback" | undefined;
      let snowSecMode: "gated" | "fallback" | undefined;
      if (hikingSecRule) {
        const secGate = gatePoolForHikingSlot(strengthPool, "main_strength", {
          applyMainWorkExclusions: true,
          requiredCount: Math.min(count, 2),
        });
        hikingEnforcementSnapshot.secondary_main_strength = secGate;
        strengthPool = secGate.poolForSelection;
        hikingSecMode = sportPatternScoreModeFromPoolMode(secGate.poolMode);
      } else if (roadSecRule) {
        const secGate = gatePoolForRoadRunningSlot(strengthPool, "main_strength", {
          applyMainWorkExclusions: true,
          requiredCount: Math.min(count, 2),
        });
        roadRunningEnforcementSnapshot.secondary_main_strength = secGate;
        strengthPool = secGate.poolForSelection;
        roadSecMode = sportPatternScoreModeFromPoolMode(secGate.poolMode);
      } else if (trailSecRule) {
        const secGate = gatePoolForTrailRunningSlot(strengthPool, "main_strength", {
          applyMainWorkExclusions: true,
          requiredCount: Math.min(count, 2),
        });
        trailRunningEnforcementSnapshot.secondary_main_strength = secGate;
        strengthPool = secGate.poolForSelection;
        trailSecMode = sportPatternScoreModeFromPoolMode(secGate.poolMode);
      } else if (soccerSecRule) {
        const secGate = gatePoolForSoccerSlot(strengthPool, "main_strength", {
          applyMainWorkExclusions: true,
          requiredCount: Math.min(count, 2),
        });
        soccerEnforcementSnapshot.secondary_main_strength = secGate;
        strengthPool = secGate.poolForSelection;
        soccerSecMode = sportPatternScoreModeFromPoolMode(secGate.poolMode);
      } else if (rockSecRule) {
        const secGate = gatePoolForRockClimbingSlot(strengthPool, "main_strength", {
          applyMainWorkExclusions: true,
          requiredCount: Math.min(count, 2),
        });
        rockClimbingEnforcementSnapshot.secondary_main_strength = secGate;
        strengthPool = secGate.poolForSelection;
        rockSecMode = sportPatternScoreModeFromPoolMode(secGate.poolMode);
      } else if (snowSecRule && sessionSnowKindForGen) {
        const secGate = gatePoolForSnowSportSlot(strengthPool, "main_strength", sessionSnowKindForGen, {
          applyMainWorkExclusions: true,
          requiredCount: Math.min(count, 2),
        });
        alpineSkiingEnforcementSnapshot.secondary_main_strength = secGate;
        strengthPool = secGate.poolForSelection;
        snowSecMode = sportPatternScoreModeFromPoolMode(secGate.poolMode);
      }
      if (strengthPool.length >= 1) {
        const { exercises: chosen } = selectExercises(
          strengthPool,
          input,
          recentIds,
          movementCounts,
          count,
          rng,
          fatigueState,
          {
            blockType: "main_strength",
            sessionFatigueRegions,
            sessionMovementPatternCounts: movementCounts,
            historyContext,
            hikingPatternSlotRule: hikingSecRule,
            hikingPatternScoreMode: hikingSecMode,
            roadRunningPatternSlotRule: roadSecRule,
            roadRunningPatternScoreMode: roadSecMode,
            trailRunningPatternSlotRule: trailSecRule,
            trailRunningPatternScoreMode: trailSecMode,
            soccerPatternSlotRule: soccerSecRule,
            soccerPatternScoreMode: soccerSecMode,
            rockClimbingPatternSlotRule: rockSecRule,
            rockClimbingPatternScoreMode: rockSecMode,
            alpineSkiingPatternSlotRule: snowSecRule,
            alpineSkiingPatternScoreMode: snowSecMode,
            ...(hikingSecRule && hikingPatternTransferApplies(input)
              ? {
                  hikingQualityContext: {
                    sessionHikingCategoryCounts: sessionSportPatternCategoryCounts,
                    emphasisBucket: sportPatternHikingEmphasis,
                    blockType: "main_strength",
                  },
                }
              : {}),
            ...(roadSecRule && roadRunningPatternTransferApplies(input)
              ? {
                  roadRunningQualityContext: {
                    sessionTrailCategoryCounts: sessionSportPatternCategoryCounts,
                    emphasisBucket: sportPatternRoadEmphasis,
                    blockType: "main_strength",
                  },
                }
              : {}),
            ...(trailSecRule && trailRunningPatternTransferApplies(input)
              ? {
                  trailRunningQualityContext: {
                    sessionTrailCategoryCounts: sessionSportPatternCategoryCounts,
                    emphasisBucket: sportPatternTrailEmphasis,
                    blockType: "main_strength",
                  },
                }
              : {}),
            ...(soccerSecRule && soccerPatternTransferApplies(input)
              ? {
                  soccerQualityContext: {
                    sessionSoccerCategoryCounts: sessionSportPatternCategoryCounts,
                    emphasisBucket: sportPatternSoccerEmphasis,
                    blockType: "main_strength",
                  },
                }
              : {}),
            ...(snowSecRule && sessionSnowKindForGen != null && snowSportBodyFocusAllows(input)
              ? {
                  alpineSkiingQualityContext: {
                    sessionAlpineCategoryCounts: sessionSportPatternCategoryCounts,
                    emphasisBucket: sportPatternAlpineEmphasis,
                    blockType: "main_strength",
                    snowSportKind: sessionSnowKindForGen,
                  },
                }
              : {}),
            ...(rockSecRule && rockClimbingPatternTransferApplies(input)
              ? {
                  rockClimbingQualityContext: {
                    sessionRockCategoryCounts: sessionSportPatternCategoryCounts,
                    emphasisBucket: sportPatternRockClimbingEmphasis,
                    blockType: "main_strength",
                  },
                }
              : {}),
            ...(snowSecRule &&
            sessionSnowKindForGen != null &&
            snowSportBodyFocusAllows(input) &&
            input.use_reduced_surface_for_alpine_main_scoring !== false
              ? { sportMainScoringMode: "alpine_reduced_surface" as const }
              : {}),
            ...(rockSecRule &&
            rockClimbingPatternTransferApplies(input) &&
            input.use_reduced_surface_for_rock_climbing_main_scoring !== false
              ? { sportMainScoringMode: "rock_reduced_surface" as const }
              : {}),
            ...(roadSecRule &&
            roadRunningPatternTransferApplies(input) &&
            input.use_reduced_surface_for_road_running_main_scoring !== false
              ? { sportMainScoringMode: "road_reduced_surface" as const }
              : {}),
            ...(soccerSecRule &&
            soccerPatternTransferApplies(input) &&
            input.use_reduced_surface_for_soccer_main_scoring !== false
              ? { sportMainScoringMode: "soccer_reduced_surface" as const }
              : {}),
            ...(intentCollector
              ? {
                  intent_survival: {
                    collector: intentCollector,
                    pass_id: "secondary_goal_main_strength",
                    block_label: "Secondary strength (goal)",
                    slot_type: "main_strength",
                    sport_gate_applied: !!(
                      hikingSecRule ||
                      roadSecRule ||
                      trailSecRule ||
                      soccerSecRule ||
                      rockSecRule ||
                      snowSecRule
                    ),
                    slot_rule_id:
                      snowSecRule?.slotRuleId ??
                      rockSecRule?.slotRuleId ??
                      hikingSecRule?.slotRuleId ??
                      roadSecRule?.slotRuleId ??
                      trailSecRule?.slotRuleId ??
                      soccerSecRule?.slotRuleId,
                    gate_snapshot:
                      alpineSkiingEnforcementSnapshot.secondary_main_strength ??
                      rockClimbingEnforcementSnapshot.secondary_main_strength ??
                      hikingEnforcementSnapshot.secondary_main_strength ??
                      roadRunningEnforcementSnapshot.secondary_main_strength ??
                      trailRunningEnforcementSnapshot.secondary_main_strength ??
                      soccerEnforcementSnapshot.secondary_main_strength,
                  },
                }
              : {}),
            ...(blockIntentProfile.targetCardioExerciseShare > 0
              ? { targetCardioExerciseShare: blockIntentProfile.targetCardioExerciseShare * 0.7 }
              : {}),
          }
        );
        if (chosen.length > 0) {
          const strengthItems: WorkoutItem[] = chosen.map((e) => {
            used.add(e.id);
            const p = getPrescription(e, "main_strength", input.energy_level, "strength", false, fatigueVolumeScale, input.style_prefs?.user_level);
            return {
              exercise_id: e.id,
              exercise_name: e.name,
              sets: p.sets,
              reps: p.reps,
              rest_seconds: p.rest_seconds,
              coaching_cues: p.coaching_cues,
              reasoning_tags: ["strength", "secondary_goal", ...(e.tags.goal_tags ?? [])],
              unilateral: e.unilateral ?? false,
            };
          });
          const estMin = strengthItems.length * (strengthItems[0]?.sets ?? 3) * 2.5;
          blocks.push({
            block_type: "main_strength",
            format: "straight_sets",
            title: blockTitleForGoal("main_strength", primary, true),
            reasoning: "Strength work for secondary goal: compound lifts, lower reps.",
            items: strengthItems,
            estimated_minutes: Math.min(estMin, 15),
          });
        }
      }
    }
  }

  // 5b. Hypertrophy block when hypertrophy (or body_recomp/calisthenics) is secondary goal
  if (constraints.prefer_hypertrophy_block && primary !== "hypertrophy" && primary !== "body_recomp" && primary !== "calisthenics") {
    const hasHypertrophyBlock = blocks.some((b) => b.block_type === "main_hypertrophy");
    if (!hasHypertrophyBlock) {
      const mainWorkPatterns = new Set(["push", "pull", "squat", "hinge", "rotate"]);
      const hypertrophyPool = filtered.filter(
        (e) =>
          (e.modality === "hypertrophy" || e.modality === "strength") &&
          !used.has(e.id) &&
          mainWorkPatterns.has(effectiveMainWorkPattern(e)) &&
          !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
      );
      const count = Math.min(input.duration_minutes >= 45 ? 3 : 2, hypertrophyPool.length);
      if (count >= 1 && hypertrophyPool.length >= 1) {
        const { exercises: chosen } = selectExercises(
          hypertrophyPool,
          input,
          recentIds,
          movementCounts,
          count,
          rng,
          fatigueState,
          {
            blockType: "main_hypertrophy",
            sessionFatigueRegions,
            sessionMovementPatternCounts: movementCounts,
            historyContext,
            ...(blockIntentProfile.targetCardioExerciseShare > 0
              ? { targetCardioExerciseShare: blockIntentProfile.targetCardioExerciseShare * 0.6 }
              : {}),
          }
        );
        if (chosen.length > 0) {
          const hypertrophyItems: WorkoutItem[] = chosen.map((e) => {
            used.add(e.id);
            const p = getPrescription(e, "main_hypertrophy", input.energy_level, "hypertrophy", false, fatigueVolumeScale, input.style_prefs?.user_level);
            return {
              exercise_id: e.id,
              exercise_name: e.name,
              sets: p.sets,
              reps: p.reps,
              rest_seconds: p.rest_seconds,
              coaching_cues: p.coaching_cues,
              reasoning_tags: ["hypertrophy", "secondary_goal", ...(e.tags.goal_tags ?? [])],
              unilateral: e.unilateral ?? false,
            };
          });
          const estMin = hypertrophyItems.length * 4;
          blocks.push({
            block_type: "main_hypertrophy",
            format: "straight_sets",
            title: blockTitleForGoal("main_hypertrophy", primary, true),
            reasoning: "Hypertrophy work for secondary goal: moderate load, higher reps.",
            items: hypertrophyItems,
            estimated_minutes: Math.min(estMin, 15),
          });
        }
      }
    }
  }

  // 5c. Power block when power is secondary goal (prefer_power_block; primary is not already power)
  if (constraints.prefer_power_block && primary !== "power") {
    const powerPool = filtered.filter(
      (e) =>
        e.modality === "power" &&
        !used.has(e.id) &&
        (e.fatigue_cost ?? "medium") !== "high"
    );
    if (powerPool.length >= 1) {
      const count = input.duration_minutes >= 45 ? 2 : 1;
      const chosen = powerPool
        .map((e) => ({ e, r: rng() }))
        .sort((a, b) => a.r - b.r)
        .slice(0, count)
        .map((x) => x.e);
      const powerItems: WorkoutItem[] = chosen.map((e) => {
        used.add(e.id);
        const p = getPrescription(e, "main_strength", input.energy_level, "power", false, fatigueVolumeScale, input.style_prefs?.user_level);
        return {
          exercise_id: e.id,
          exercise_name: e.name,
          sets: p.sets,
          reps: p.reps,
          rest_seconds: p.rest_seconds,
          coaching_cues: p.coaching_cues,
          reasoning_tags: ["power", "secondary_goal", ...(e.tags.goal_tags ?? [])],
          unilateral: e.unilateral ?? false,
        };
      });
      if (powerItems.length > 0) {
        const estMin = powerItems.length * (powerItems[0]?.sets ?? 3) * 2;
        blocks.push({
          block_type: "power",
          format: "straight_sets",
          title: blockTitleForGoal("power", primary, true),
          reasoning: "Power work for secondary goal: explosive intent, quality over volume.",
          items: powerItems,
          estimated_minutes: Math.min(estMin, 15),
        });
      }
    }
  }

  applyCardioDominantMainBlockBias(blocks, blockIntentProfile);

  // 6. Build conditioning (goal rules: optional vs mandatory vs primary; or required when secondary)
  const hasConditioningBlock = blocks.some((b) => b.block_type === "conditioning");
  const conditioningStrategy = goalRules.conditioningStrategy;
  const requiredConditioning =
    constraints.required_conditioning_block === true || blockIntentProfile.conditioningRequired;
  const rankedCardioIntentsFinisher = getCardioFinisherIntentSlugs(input);
  let skipConditioning =
    hasConditioningBlock ||
    !blockIntentProfile.allowConditioningBlock ||
    (!requiredConditioning &&
      (conditioningStrategy === "none" ||
        (goalRules.conditioningOnlyIfHighEnergy &&
          input.energy_level !== "high" &&
          !rankedCardioIntentsFinisher?.length)));

  const spForComposition = input.sport_profile_for_scoring;
  if (
    !hasConditioningBlock &&
    blockIntentProfile.allowConditioningBlock &&
    spForComposition &&
    sportProfileBiasedTowardConditioning(spForComposition) &&
    skipConditioning
  ) {
    skipConditioning = false;
    sportProfileForcedConditioning = true;
  }

  if (!skipConditioning) {
    const userMins = input.style_prefs?.conditioning_minutes ?? 0;
    const ruleMins = getConditioningDurationMinutes(primary, input.energy_level);
    const profileCardioMinutes = Math.round(input.duration_minutes * blockIntentProfile.sessionCardioShare);
    let conditioningMins = requiredConditioning
      ? Math.min(20, Math.max(10, profileCardioMinutes, ruleMins ?? 15))
      : conditioningStrategy === "mandatory"
        ? Math.max(profileCardioMinutes, ruleMins ?? 30)
        : (userMins > 0 ? userMins : Math.max(profileCardioMinutes, ruleMins ?? 0));
    if (sportProfileForcedConditioning && conditioningMins < 12) {
      conditioningMins = 12;
      sportProfileCondMinFloor = 12;
    }
    const addConditioning =
      (requiredConditioning && blockIntentProfile.allowConditioningBlock) ||
      sportProfileForcedConditioning ||
      (blockIntentProfile.allowConditioningBlock &&
        (conditioningStrategy === "mandatory" ||
          conditioningStrategy === "optional_short" ||
          conditioningStrategy === "optional_moderate"));
    if (addConditioning && conditioningMins > 0) {
      let cardioPool = filtered.filter((e) => e.modality === "conditioning" && !used.has(e.id));
      let dedicatedCardioPoolSort = false;
      if (cardioPool.length && hikingPatternTransferApplies(input)) {
        const hikingCardio = cardioPool.filter((e) => isHikingConditioningExercise(e));
        if (hikingCardio.length > 0) cardioPool = hikingCardio;
      }
      if (cardioPool.length && roadRunningPatternTransferApplies(input)) {
        const roadCardio = cardioPool.filter((e) => isRoadRunningConditioningExercise(e));
        if (roadCardio.length > 0) cardioPool = roadCardio;
      }
      if (cardioPool.length && trailRunningPatternTransferApplies(input)) {
        const trailCardio = cardioPool.filter((e) => isTrailRunningConditioningExercise(e));
        if (trailCardio.length > 0) cardioPool = trailCardio;
      }
      if (cardioPool.length && soccerPatternTransferApplies(input)) {
        const soccerCardio = cardioPool.filter((e) => isSoccerConditioningExercise(e));
        if (soccerCardio.length > 0) cardioPool = soccerCardio;
      }
      if (cardioPool.length && sessionSnowKindForGen != null && snowSportBodyFocusAllows(input)) {
        const alpineCardio = cardioPool.filter((e) => isSnowSportConditioningExercise(e, sessionSnowKindForGen));
        if (alpineCardio.length > 0) cardioPool = alpineCardio;
      }
      if (cardioPool.length > 1 && hikingPatternTransferApplies(input)) {
        dedicatedCardioPoolSort = true;
        cardioPool = [...cardioPool].sort(
          (a, b) =>
            computeHikingWithinPoolQualityScore(b, {
              sessionHikingCategoryCounts: sessionSportPatternCategoryCounts,
              emphasisBucket: sportPatternHikingEmphasis,
              blockType: "conditioning",
            }).total -
            computeHikingWithinPoolQualityScore(a, {
              sessionHikingCategoryCounts: sessionSportPatternCategoryCounts,
              emphasisBucket: sportPatternHikingEmphasis,
              blockType: "conditioning",
            }).total
        );
      }
      if (cardioPool.length > 1 && roadRunningPatternTransferApplies(input)) {
        dedicatedCardioPoolSort = true;
        cardioPool = [...cardioPool].sort(
          (a, b) =>
            computeRoadRunningWithinPoolQualityScore(b, {
              sessionTrailCategoryCounts: sessionSportPatternCategoryCounts,
              emphasisBucket: sportPatternRoadEmphasis,
              blockType: "conditioning",
            }).total -
            computeRoadRunningWithinPoolQualityScore(a, {
              sessionTrailCategoryCounts: sessionSportPatternCategoryCounts,
              emphasisBucket: sportPatternRoadEmphasis,
              blockType: "conditioning",
            }).total
        );
      }
      if (cardioPool.length > 1 && trailRunningPatternTransferApplies(input)) {
        dedicatedCardioPoolSort = true;
        cardioPool = [...cardioPool].sort(
          (a, b) =>
            computeTrailRunningWithinPoolQualityScore(b, {
              sessionTrailCategoryCounts: sessionSportPatternCategoryCounts,
              emphasisBucket: sportPatternTrailEmphasis,
              blockType: "conditioning",
            }).total -
            computeTrailRunningWithinPoolQualityScore(a, {
              sessionTrailCategoryCounts: sessionSportPatternCategoryCounts,
              emphasisBucket: sportPatternTrailEmphasis,
              blockType: "conditioning",
            }).total
        );
      }
      if (cardioPool.length > 1 && soccerPatternTransferApplies(input)) {
        dedicatedCardioPoolSort = true;
        cardioPool = [...cardioPool].sort(
          (a, b) =>
            computeSoccerWithinPoolQualityScore(b, {
              sessionSoccerCategoryCounts: sessionSportPatternCategoryCounts,
              emphasisBucket: sportPatternSoccerEmphasis,
              blockType: "conditioning",
            }).total -
            computeSoccerWithinPoolQualityScore(a, {
              sessionSoccerCategoryCounts: sessionSportPatternCategoryCounts,
              emphasisBucket: sportPatternSoccerEmphasis,
              blockType: "conditioning",
            }).total
        );
      }
      if (cardioPool.length > 1 && sessionSnowKindForGen != null && snowSportBodyFocusAllows(input)) {
        dedicatedCardioPoolSort = true;
        const sk = sessionSnowKindForGen;
        cardioPool = [...cardioPool].sort(
          (a, b) =>
            computeAlpineSkiingWithinPoolQualityScore(b, {
              sessionAlpineCategoryCounts: sessionSportPatternCategoryCounts,
              emphasisBucket: sportPatternAlpineEmphasis,
              blockType: "conditioning",
              snowSportKind: sk,
            }).total -
            computeAlpineSkiingWithinPoolQualityScore(a, {
              sessionAlpineCategoryCounts: sessionSportPatternCategoryCounts,
              emphasisBucket: sportPatternAlpineEmphasis,
              blockType: "conditioning",
              snowSportKind: sk,
            }).total
        );
      }
      if (cardioPool.length > 1 && spForComposition && !dedicatedCardioPoolSort) {
        sportProfileCondSortApplied = true;
        cardioPool = [...cardioPool].sort(
          (a, b) => sportProfileConditioningPickScore(b, spForComposition) - sportProfileConditioningPickScore(a, spForComposition)
        );
      }
      if (cardioPool.length) {
        const narrowedPool = rankedCardioIntentsFinisher?.length
          ? narrowCardioPoolByConditioningIntents(cardioPool, rankedCardioIntentsFinisher)
          : cardioPool;
        const c = pickConditioningExercise(
          narrowedPool,
          input.style_prefs?.preferred_zone2_cardio,
          rng,
          rankedCardioIntentsFinisher
        );
        if (c) {
          used.add(c.id);
          const p = getPrescription(c, "conditioning", input.energy_level, input.primary_goal, undefined, undefined, input.style_prefs?.user_level);
          const interval = getConditioningStructureForExercise(
            c,
            conditioningMins,
            input.primary_goal
          );
          const conditioningTag = conditioningProtocolReasonTag(
            getConditioningProtocolKind(c)
          );
          const condFormat =
            (interval.format as BlockFormat) ??
            (blockIntentProfile.cardioDominant ? blockFormatForCardioHint(blockIntentProfile.cardioFormatHint) : undefined) ??
            (blockIntentProfile.preferredBlockFormatsByRole.conditioning[0] as BlockFormat | undefined) ??
            (goalRules.conditioningFormats?.[0]) ??
            "straight_sets";
          const forceTimeBasedConditioning = blockIntentProfile.cardioDominant && blockIntentProfile.sessionCardioShare >= 0.55;
          const workSec = interval.time_seconds ?? (interval.reps != null ? 30 : 0);
          const estimatedMin = isHighIntensityConditioning(c) || isExplosiveConditioning(c) || isSprintBurstConditioning(c)
            ? interval.sets * ((workSec || 30) / 60 + interval.rest_seconds / 60)
            : conditioningMins;
          const hasConditioningTitle = blocks.some((b) => b.title === "Conditioning");
          const conditioningBlockTitle =
            isZone2Conditioning(c)
              ? "Zone 2"
              : hasConditioningTitle
                ? "Aerobic finisher"
                : requiredConditioning
                  ? blockTitleForGoal("conditioning", primary, true)
                  : blockTitleForGoal("conditioning", primary, false);
          blocks.push({
            block_type: "conditioning",
            format: condFormat,
            title: conditioningBlockTitle,
            reasoning: requiredConditioning
              ? "Conditioning for secondary goal; shorter block to preserve primary focus."
              : (interval.reasoning ?? "Cardio finisher."),
            items: [
              {
                exercise_id: c.id,
                exercise_name: c.name,
                sets: interval.sets,
                ...(forceTimeBasedConditioning
                  ? { time_seconds: interval.time_seconds ?? (interval.reps != null ? 30 : undefined) }
                  : interval.reps != null
                    ? { reps: interval.reps }
                    : { time_seconds: interval.time_seconds }),
                rest_seconds: interval.rest_seconds,
                coaching_cues: p.coaching_cues,
                reasoning_tags: ["conditioning", conditioningTag, ...(c.tags.goal_tags ?? [])],
                unilateral: c.unilateral ?? false,
              },
            ],
            estimated_minutes: Math.round(estimatedMin),
          });
        }
      }
    }
  }

  if (
    sportProfileSessionSnapshot &&
    (sportProfileForcedConditioning || sportProfileCondSortApplied || sportProfileCondMinFloor != null)
  ) {
    sportProfileSessionSnapshot = {
      ...sportProfileSessionSnapshot,
      compositionHooks: {
        forced_session_conditioning_block: sportProfileForcedConditioning,
        conditioning_pool_sorted_by_profile: sportProfileCondSortApplied,
        ...(sportProfileCondMinFloor != null ? { min_conditioning_minutes_applied: sportProfileCondMinFloor } : {}),
      },
    };
  }

  // 6b. Ensure no two blocks share the same title
  const usedTitles = new Set<string>();
  for (const b of blocks) {
    let t = b.title ?? b.block_type.replace(/_/g, " ");
    if (usedTitles.has(t)) {
      let suffix = 2;
      while (usedTitles.has(`${t} (${suffix})`)) suffix++;
      t = `${t} (${suffix})`;
      b.title = t;
    }
    usedTitles.add(t);
  }

  // 7. Build cooldown (required-block: mobility secondary goal → min mobility exercises + visible block)
  const mainWorkFamilies = getMainWorkFamiliesFromBlocks(blocks, filtered);
  const cooldown = buildCooldown(filtered, input, used, rng, {
    constraints,
    mainWorkFamilies,
    preferredTargets: blockIntentProfile.cooldownPreferredTargets,
  });
  blocks.push(cooldown);

  // Merge consecutive blocks with the same title so we never show two blocks with the same name
  let mergedBlocks = mergeConsecutiveBlocksWithSameTitle(blocks);

  ensureSingleGoalSubFocusCoverage(
    mergedBlocks,
    input,
    guaranteePool,
    used,
    recentIds,
    movementCounts,
    rng,
    fatigueState,
    fatigueVolumeScale,
    historyContext,
    sessionFatigueRegions
  );

  ensureWeeklySubFocusSessionMinimums(
    mergedBlocks,
    input,
    guaranteePool,
    used,
    recentIds,
    movementCounts,
    rng,
    fatigueState,
    fatigueVolumeScale,
    historyContext,
    sessionFatigueRegions
  );

  tryRepairHikingSession(
    mergedBlocks,
    input,
    filtered,
    used,
    rng,
    fatigueVolumeScale,
    sessionFatigueRegions
  );
  tryRepairTrailRunningSession(
    mergedBlocks,
    input,
    filtered,
    used,
    rng,
    fatigueVolumeScale,
    sessionFatigueRegions
  );
  tryRepairRoadRunningSession(
    mergedBlocks,
    input,
    filtered,
    used,
    rng,
    fatigueVolumeScale,
    sessionFatigueRegions
  );
  tryRepairSoccerSession(mergedBlocks, input, filtered, used, rng, fatigueVolumeScale, sessionFatigueRegions);
  const preAlpineRepairBlocks =
    input.include_intent_survival_report === true && snowMountainSessionApplies(input)
      ? (structuredClone(mergedBlocks) as WorkoutBlock[])
      : null;
  const alpineRepairLog: IntentSurvivalRepairChange[] = [];
  tryRepairSnowSportSession(
    mergedBlocks,
    input,
    filtered,
    used,
    rng,
    fatigueVolumeScale,
    sessionFatigueRegions,
    alpineRepairLog
  );

  mergedBlocks = normalizeSupersetBlockPresentation(mergedBlocks);

  if (intentCollector && snowMountainSessionApplies(input) && sessionSnowKindForGen != null) {
    const byIdForIntent = new Map(filtered.map((e) => [e.id, e]));
    const ctxAlpine = buildSportCoverageContext(input, mergedBlocks);
    const skIntent = sessionSnowKindForGen;
    const preCov =
      preAlpineRepairBlocks != null
        ? evaluateSnowSportCoverageForBlocks(skIntent, input, preAlpineRepairBlocks, byIdForIntent)
        : { ok: true, violations: [] as { ruleId: string; description: string }[] };
    const postCov = evaluateSnowSportCoverageForBlocks(skIntent, input, mergedBlocks, byIdForIntent);
    const shares = computeAlpineStrictVsFallbackShares(mergedBlocks, alpineSkiingEnforcementSnapshot);
    intentCollector.setAlpinePartial({
      required_category_hits: alpineRequiredCategoryHits(ctxAlpine, postCov.violations),
      key_coverage_ok_pre_repair: preCov.ok,
      key_coverage_ok_post_repair: postCov.ok,
      repair_ran: alpineRepairLog.length > 0,
      repair_changes: alpineRepairLog,
      strict_gate_selection_share: shares.strict_gate_selection_share,
      fallback_path_selection_share: shares.fallback_path_selection_share,
      degraded_mode: !postCov.ok,
      anchors_pre_repair: computeAlpineAnchorSnapshot(preAlpineRepairBlocks ?? mergedBlocks, byIdForIntent),
      anchors_post_repair: computeAlpineAnchorSnapshot(mergedBlocks, byIdForIntent),
    });
  }

  // Phase 11: attach progress/maintain/regress/rotate and prescription influence
  attachRecommendationsToSession(mergedBlocks, filtered, historyContext, recentIds);

  // Enforce main vs accessory set ratio: never more accessory than main; when doing accessory, 75% main / 25% accessory
  enforceMainAccessoryRatioOnBlocks(mergedBlocks);

  if (sportProfileSessionSnapshot?.profile) {
    mergedBlocks = applyConditioningDurationScaleToBlocks(mergedBlocks, sportProfileSessionSnapshot.profile);
  }

  // 8. Post-assembly validation and repair (Phase 8)
  const sumBlockMinutes = mergedBlocks.reduce((sum, b) => sum + (b.estimated_minutes ?? 5), 0);
  const estimated_duration_minutes =
    input.duration_minutes != null && input.duration_minutes > 0
      ? Math.max(input.duration_minutes, sumBlockMinutes)
      : sumBlockMinutes;

  let sportProfileExerciseScores: NonNullable<WorkoutSession["debug"]>["sport_profile_exercise_scores"] | undefined;
  if (input.include_sport_profile_exercise_debug === true && sportProfileSessionSnapshot?.profile) {
    const prof = sportProfileSessionSnapshot.profile;
    const byId = new Map(filtered.map((e) => [e.id, e]));
    const out: NonNullable<WorkoutSession["debug"]>["sport_profile_exercise_scores"] = {};
    for (const b of mergedBlocks) {
      const bn = (b.block_type ?? "").toLowerCase().replace(/\s/g, "_");
      for (const it of b.items) {
        if (out[it.exercise_id]) continue;
        const ex = byId.get(it.exercise_id);
        if (!ex) continue;
        const spc = computeSportProfileScoreComponents(ex, prof, bn);
        out[it.exercise_id] = {
          movement_pattern_match_score: spc.movement_pattern_match,
          sport_alignment_score: spc.sport_specificity + spc.energy_system_alignment + spc.penalty,
          penalty_flags: spc.penalty_flags.length ? spc.penalty_flags : undefined,
        };
      }
    }
    sportProfileExerciseScores = out;
  }

  delete input.sport_profile_for_scoring;
  delete input.sport_profile_session_composition;

  const sportPatternTransferDebug = hikingPatternTransferApplies(input)
    ? (() => {
        const byId = new Map(filtered.map((e) => [e.id, e]));
        const cov = evaluateHikingCoverageForBlocks(input, mergedBlocks, byId);
        return {
          sport_slug: "hiking_backpacking" as const,
          coverage_ok: cov.ok,
          violations: cov.violations.length ? cov.violations : undefined,
          enforcement_snapshot: hikingEnforcementSnapshot,
          items: buildHikingTransferDebug(mergedBlocks, byId, hikingEnforcementSnapshot, { sessionSeed: seed }),
          session_summary: summarizeHikingSportPatternSession(mergedBlocks, byId),
        };
      })()
    : roadRunningPatternTransferApplies(input)
      ? (() => {
          const byId = new Map(filtered.map((e) => [e.id, e]));
          const cov = evaluateRoadCoverageForBlocks(input, mergedBlocks, byId);
          return {
            sport_slug: "road_running" as const,
            coverage_ok: cov.ok,
            violations: cov.violations.length ? cov.violations : undefined,
            enforcement_snapshot: roadRunningEnforcementSnapshot,
            items: buildRoadRunningTransferDebug(mergedBlocks, byId, roadRunningEnforcementSnapshot, {
              sessionSeed: seed,
            }),
            session_summary: summarizeRoadRunningSportPatternSession(mergedBlocks, byId),
          };
        })()
    : trailRunningPatternTransferApplies(input)
      ? (() => {
          const byId = new Map(filtered.map((e) => [e.id, e]));
          const cov = evaluateTrailCoverageForBlocks(input, mergedBlocks, byId);
          return {
            sport_slug: "trail_running" as const,
            coverage_ok: cov.ok,
            violations: cov.violations.length ? cov.violations : undefined,
            enforcement_snapshot: trailRunningEnforcementSnapshot,
            items: buildTrailRunningTransferDebug(mergedBlocks, byId, trailRunningEnforcementSnapshot, {
              sessionSeed: seed,
            }),
            session_summary: summarizeTrailRunningSportPatternSession(mergedBlocks, byId),
          };
        })()
      : soccerPatternTransferApplies(input)
        ? (() => {
            const byId = new Map(filtered.map((e) => [e.id, e]));
            const cov = evaluateSoccerCoverageForBlocks(input, mergedBlocks, byId);
            return {
              sport_slug: "soccer" as const,
              coverage_ok: cov.ok,
              violations: cov.violations.length ? cov.violations : undefined,
              enforcement_snapshot: soccerEnforcementSnapshot,
              items: buildSoccerTransferDebug(mergedBlocks, byId, soccerEnforcementSnapshot, {
                sessionSeed: seed,
              }),
              session_summary: summarizeSoccerSportPatternSession(mergedBlocks, byId),
            };
          })()
        : snowMountainSessionApplies(input) && sessionSnowKindForGen != null
        ? (() => {
            const byId = new Map(filtered.map((e) => [e.id, e]));
            const sk = sessionSnowKindForGen;
            const cov = evaluateSnowSportCoverageForBlocks(sk, input, mergedBlocks, byId);
            return {
              sport_slug: sk,
              coverage_ok: cov.ok,
              violations: cov.violations.length ? cov.violations : undefined,
              enforcement_snapshot: alpineSkiingEnforcementSnapshot,
              items: buildSnowSportTransferDebug(sk, mergedBlocks, byId, alpineSkiingEnforcementSnapshot, {
                sessionSeed: seed,
              }),
              session_summary: summarizeSnowSportPatternSession(sk, mergedBlocks, byId),
            };
          })()
        : rockClimbingPatternTransferApplies(input)
          ? (() => {
              const byId = new Map(filtered.map((e) => [e.id, e]));
              return {
                sport_slug: "rock_climbing" as const,
                coverage_ok: true,
                enforcement_snapshot: rockClimbingEnforcementSnapshot,
                items: [],
                session_summary: summarizeRockClimbingSportPatternSession(mergedBlocks, byId),
              };
            })()
          : undefined;

  const includeSessionDebug =
    sportPatternTransferDebug ||
    intentCollector ||
    mainSelectorTrace.entries.length > 0 ||
    sportProfileSessionSnapshot != null ||
    sportProfileCanonicalMappingFailure != null ||
    sportProfileExerciseScores != null ||
    pruningGateDebugForSession != null;
  const generationModeFingerprint = includeSessionDebug
    ? {
        pruning_gate: {
          resolved_flags: flagsForPruningDebug,
          enabled: flagsForPruningDebug.enable_pruning_gating === true,
        },
        sport_profile_engine:
          spLoad.status === "applied"
            ? {
                status: "applied" as const,
                canonical_sport_definition_slug: spLoad.canonicalSlug,
              }
            : spLoad.status === "map_failed"
              ? {
                  status: "map_failed" as const,
                  canonical_sport_definition_slug: spLoad.canonicalSlug,
                }
              : {
                  status: "skipped" as const,
                  reason: spLoad.reason,
                },
        pool_sizes: {
          input_exercise_pool: exercisePool.length,
          after_pruning_gate: effectiveExercisePool.length,
          after_hard_constraints: hardFiltered.length,
          after_constraint_gate: filteredPoolCountAfterConstraintGate,
          guarantee_pool_after_injury_gate: guaranteePoolCountAfterInjuryGate,
          ...(sportProfileSessionSnapshot
            ? {
                after_sport_profile: filtered.length,
                guarantee_pool_after_sport_profile: guaranteePool.length,
                sport_profile_pool_before: sportProfileSessionSnapshot.poolBefore,
                sport_profile_pool_after: sportProfileSessionSnapshot.poolAfter,
              }
            : {}),
        },
      }
    : undefined;

  const session: WorkoutSession = {
    title: sessionTitle(input),
    estimated_duration_minutes,
    blocks: mergedBlocks,
    ...(includeSessionDebug
      ? {
          debug: {
            ...(sportPatternTransferDebug ? { sport_pattern_transfer: sportPatternTransferDebug } : {}),
            ...(intentCollector ? { intent_survival_report: intentCollector.report } : {}),
            ...(mainSelectorTrace.entries.length > 0 ? { main_selector: mainSelectorTrace } : {}),
            ...(sportProfileSessionSnapshot
              ? {
                  sport_profile_applied: {
                    sport: sportProfileSessionSnapshot.profile.sportSlug,
                    top_patterns: [...sportProfileSessionSnapshot.profile.topPatterns],
                    excluded_patterns: [
                      ...sportProfileSessionSnapshot.profile.bannedTagSlugs,
                      ...sportProfileSessionSnapshot.profile.softBannedTagSlugs,
                    ],
                    enforced_bias: sportProfileSessionSnapshot.enforcedBiasLabel,
                    relax_level: sportProfileSessionSnapshot.relaxLevel,
                    pool_before: sportProfileSessionSnapshot.poolBefore,
                    pool_after: sportProfileSessionSnapshot.poolAfter,
                    ...(sportProfileSessionSnapshot.mapping
                      ? {
                          mapping: sportProfileSessionSnapshot.mapping,
                          canonical_sport_definition_slug:
                            sportProfileSessionSnapshot.mapping.canonical_sport_definition_slug,
                          canonical_profile_loaded:
                            sportProfileSessionSnapshot.mapping.canonical_profile_loaded,
                          canonical_fields_used:
                            sportProfileSessionSnapshot.mapping.canonical_fields_used,
                          normalized_profile_summary:
                            sportProfileSessionSnapshot.mapping.normalized_profile_summary,
                          fallback_used: sportProfileSessionSnapshot.mapping.fallback_used,
                          fallback_reason: sportProfileSessionSnapshot.mapping.fallback_reason,
                          mapper_defaults_applied:
                            sportProfileSessionSnapshot.mapping.mapper_defaults_applied,
                        }
                      : {}),
                    ...(sportProfileSessionSnapshot.compositionHooks
                      ? { composition_hooks: sportProfileSessionSnapshot.compositionHooks }
                      : {}),
                  },
                }
              : {}),
            ...(sportProfileCanonicalMappingFailure
              ? { sport_profile_canonical_mapping_failed: sportProfileCanonicalMappingFailure }
              : {}),
            ...(sportProfileExerciseScores ? { sport_profile_exercise_scores: sportProfileExerciseScores } : {}),
            ...(pruningGateDebugForSession ? { pruning_gate: pruningGateDebugForSession } : {}),
            ...(generationModeFingerprint ? { generation_mode_fingerprint: generationModeFingerprint } : {}),
          },
        }
      : {}),
  };

  const validation = validateWorkoutAgainstConstraints(session, constraints, filtered);
  if (validation.valid) return session;
  if (validation.repairedWorkout) {
    return validation.repairedWorkout as WorkoutSession;
  }
  let fallbackSession = session;
  let fallbackValidation = validation;
  const unresolvedCriticalTypes = unresolvedCriticalValidationTypes(validation);
  const internalInput = input as InternalGenerateWorkoutInput;
  if (
    unresolvedCriticalTypes.length > 0 &&
    internalInput.__validation_regenerate_attempted !== true
  ) {
    const regenerateInput = buildValidationRegenerateInput(input, unresolvedCriticalTypes);
    const regeneratedSession = generateWorkoutSession(regenerateInput, exercisePool);
    const regeneratedValidation = validateWorkoutAgainstConstraints(
      regeneratedSession,
      constraints,
      filtered
    );
    const regeneratedUnresolvedCriticalTypes =
      unresolvedCriticalValidationTypes(regeneratedValidation);
    if (regeneratedValidation.valid || regeneratedUnresolvedCriticalTypes.length === 0) {
      return regeneratedValidation.violations.length > 0
        ? appendValidationFallbackDebug(regeneratedSession, regeneratedValidation)
        : regeneratedSession;
    }
    fallbackSession = regeneratedSession;
    fallbackValidation = regeneratedValidation;
  }
  const sessionWithValidationFallbackDebug =
    fallbackValidation.violations.length > 0
      ? appendValidationFallbackDebug(fallbackSession, fallbackValidation)
      : fallbackSession;
  const safeguardedSession = applyCriticalValidationSafeguard(
    fallbackSession,
    fallbackValidation
  );
  if (safeguardedSession) {
    console.warn(
      "[Phase 8] Applied critical validation safeguard (removed unresolved items):",
      fallbackValidation.violations
        .filter((v) => v.repaired !== true && CRITICAL_UNRESOLVED_VALIDATION_TYPES.has(v.type))
        .map((v) => ({ type: v.type, exerciseId: v.exerciseId, description: v.description }))
    );
    return sessionWithValidationFallbackDebug === session
      ? safeguardedSession
      : {
          ...safeguardedSession,
          debug: {
            ...(safeguardedSession.debug ?? {}),
            ...(sessionWithValidationFallbackDebug.debug ?? {}),
          },
        };
  }
  if (fallbackValidation.violations.length > 0) {
    console.warn(
      "[Phase 8] Workout validation issues (no repair possible):",
      fallbackValidation.violations.map((v) => ({ type: v.type, description: v.description }))
    );
  }
  return sessionWithValidationFallbackDebug;
}

// --- Regenerate ---
export function regenerateWorkoutSession(
  input: GenerateWorkoutInput,
  previousSession: WorkoutSession,
  mode: RegenerateMode,
  exercisePool: Exercise[]
): WorkoutSession {
  const seed = (input.seed ?? 0) + 1;
  const newInput: GenerateWorkoutInput = { ...input, seed };

  if (mode === "keep_structure_swap_exercises") {
    return regenerateWithSubstitution(input, previousSession, exercisePool);
  }

  return generateWorkoutSession(newInput, exercisePool);
}

/**
 * Keep block structure and prescriptions; swap each exercise to a ranked substitute
 * (same pattern/muscles, progressions/regressions) from the filtered pool.
 */
function regenerateWithSubstitution(
  input: GenerateWorkoutInput,
  previousSession: WorkoutSession,
  exercisePool: Exercise[]
): WorkoutSession {
  const gatedPool = resolveGatedExercisePoolForGeneration(exercisePool, input).pool;
  const filtered = filterByHardConstraints(gatedPool, input);
  const poolById = new Map(gatedPool.map((e) => [e.id, e]));
  const usedInNewSession = new Set<string>();

  const blocks: WorkoutBlock[] = previousSession.blocks.map((block) => {
    const items: WorkoutItem[] = block.items.map((item) => {
      const original = poolById.get(item.exercise_id);
      const candidatePool = filtered.filter((e) => !usedInNewSession.has(e.id));
      const substitute = original
        ? getBestSubstitute(original, candidatePool, {
            excludeIds: usedInNewSession,
            maxResults: 1,
          })
        : undefined;

      const chosen = substitute?.exercise ?? original;
      const exerciseId = chosen?.id ?? item.exercise_id;
      const exerciseName = chosen?.name ?? item.exercise_name;
      if (chosen) usedInNewSession.add(chosen.id);

      const unilateral = chosen && "unilateral" in chosen ? (chosen as Exercise).unilateral : item.unilateral;
      return {
        ...item,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        unilateral: unilateral ?? false,
      };
    });

    return { ...block, items };
  });

  const sumBlockMinutes = blocks.reduce(
    (sum, b) => sum + (b.estimated_minutes ?? 5),
    0
  );
  const estimated_duration_minutes =
    input.duration_minutes != null && input.duration_minutes > 0
      ? input.duration_minutes
      : sumBlockMinutes;

  return {
    title: previousSession.title,
    estimated_duration_minutes,
    blocks,
  };
}
