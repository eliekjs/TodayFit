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
  BLOCKED_EXERCISE_IDS,
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
  getConditioningStructureByIntent,
  getExplosiveConditioningStructure,
  getHighIntensityConditioningStructure,
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
  exerciseBlockedByCreativePreference,
  exerciseMatchesWorkoutTier,
} from "../../lib/workoutLevel";
import {
  isExerciseAllowedByInjuries,
  matchesBodyPartFocus,
} from "../workoutIntelligence/constraints/eligibilityHelpers";
import { toExerciseWithQualities, type GeneratorExercise } from "../workoutIntelligence/adapters";
import { validateWorkoutAgainstConstraints } from "../workoutIntelligence/validation/workoutValidator";
import {
  computeOntologyScoreComponents,
  getEffectiveFatigueRegions,
  getPreferredWarmupTargetsFromFocus,
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
import { getExerciseTagsForSubFocuses } from "../../data/sportSubFocus";

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
  const jointStressFor = (e: Exercise) =>
    (e.joint_stress_tags?.length ? e.joint_stress_tags : e.tags?.joint_stress) ?? [];

  return exercises.filter((e) => {
    if (BLOCKED_EXERCISE_IDS.has(e.id)) return false;
    if (!exerciseMatchesWorkoutTier(e.workout_level_tags, userWorkoutTier)) return false;
    if (exerciseBlockedByCreativePreference(e.creative_variation, includeCreativeVariations))
      return false;
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

// --- Scoring weights ---
const WEIGHT_PRIMARY_GOAL = 3.0;
const WEIGHT_SECONDARY_GOAL = 1.5;
const WEIGHT_TERTIARY = 1.0;
const WEIGHT_BODY_PART = 1.5;
const WEIGHT_ENERGY_FIT = 1.0;

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

// Hypertrophy sub-focus: treat selected body-part slugs as first-class match signals.
// We intentionally keep this direct + localized (no hidden ontology layer).
const HYPERTROPHY_SUB_FOCUS_MATCH_SLUGS: Record<string, string[]> = {
  // Keep this inference direct + simple, based on what already exists in the exercise fields.
  // We include a few region-level proxies (legs/posterior_chain/push/pull) so the “direct match”
  // signal actually triggers on unbackfilled DBs / stubs.
  glutes: ["glutes", "hamstrings", "legs", "posterior_chain"],
  back: ["back", "lats", "upper_back", "pull"],
  chest: ["chest", "pecs", "push"],
  arms: ["biceps", "triceps"],
  shoulders: ["shoulders", "push"],
  legs: ["legs", "quads", "glutes", "hamstrings", "calves"],
  core: ["core", "core_stability"],
  balanced: [],
};

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

function exerciseMatchesHypertrophySubFocusSlug(exercise: Exercise, slug: string): boolean {
  const norm = tagToSlug(slug);
  if (norm === "balanced") return false;

  const matchSet = new Set(
    (HYPERTROPHY_SUB_FOCUS_MATCH_SLUGS[norm] ?? [norm]).map((s) => tagToSlug(s))
  );

  const muscleSet = new Set((exercise.muscle_groups ?? []).map((m) => tagToSlug(m)));
  const attrSet = new Set((exercise.tags?.attribute_tags ?? []).map((a) => tagToSlug(a)));
  const fatigueSet = new Set((exercise.fatigue_regions ?? []).map((f) => tagToSlug(f)));
  const pairing = tagToSlug(exercise.pairing_category ?? "");

  for (const m of matchSet) {
    if (muscleSet.has(m) || attrSet.has(m) || fatigueSet.has(m) || pairing === m) return true;
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
}

export function scoreExercise(
  exercise: Exercise,
  input: GenerateWorkoutInput,
  recentExerciseIds: Set<string>,
  movementPatternCounts: Map<string, number>,
  fatigueState?: FatigueState,
  options?: ScoreExerciseOptions
): { score: number } {
  let total = 0;
  const opts = options ?? {};

  // Goal alignment (optionally scaled by goal_weights when provided)
  const goalTags = exercise.tags.goal_tags ?? [];
  const primaryTags = goalToTags(input.primary_goal);
  const secondaryTags = (input.secondary_goals ?? []).flatMap(goalToTags);
  const gw = input.goal_weights;
  const w0 = gw?.[0] ?? 0.6;
  const w1 = gw?.[1] ?? 0.3;
  const w2 = gw?.[2] ?? 0.1;
  let goalScore = 0;
  for (const t of goalTags) {
    if (primaryTags.includes(t)) goalScore += gw ? WEIGHT_PRIMARY_GOAL * (w0 / 0.6) : WEIGHT_PRIMARY_GOAL;
    else if (secondaryTags.includes(t)) goalScore += gw ? WEIGHT_SECONDARY_GOAL * (w1 / 0.3) : WEIGHT_SECONDARY_GOAL;
    else goalScore += gw ? WEIGHT_TERTIARY * 0.5 * (w2 / 0.1) : WEIGHT_TERTIARY * 0.5;
  }
  total += goalScore;

  // Sport match: boost exercises whose sport_tags match user's ranked sport(s)
  const sportSlugs = input.sport_slugs;
  if (sportSlugs?.length) {
    const exerciseSportTags = new Set((exercise.tags.sport_tags ?? []).map((s) => tagToSlug(s)));
    for (let i = 0; i < sportSlugs.length; i++) {
      const slug = tagToSlug(sportSlugs[i]);
      if (exerciseSportTags.has(slug)) {
        total += i === 0 ? 2 : 1;
        break;
      }
    }
  }

  // Preferred exercise IDs (from sport/goal ranking): strong bonus when exercise is in the preferred list
  const preferredIds = input.style_prefs?.preferred_exercise_ids;
  if (preferredIds?.length) {
    const exIdNorm = tagToSlug(exercise.id);
    const exNameNorm = exercise.name ? tagToSlug(exercise.name) : "";
    const idx = preferredIds.findIndex(
      (id) => tagToSlug(id) === exIdNorm || tagToSlug(id) === exNameNorm || id === exercise.id || id === exercise.name
    );
    if (idx >= 0) {
      const bonus = Math.max(0.5, 2 - idx * 0.25);
      total += bonus;
    }
  }

  // Body part focus (canonical muscles + ontology movement_family_fit below). Muscle priority: prefer exercises that primarily target focus.
  const focusParts = input.focus_body_parts ?? [];
  if (focusParts.length) {
    const wantedMuscles = new Set(focusParts.flatMap(focusBodyPartToMuscles));
    const primaryMuscles = exercise.primary_muscle_groups ?? exercise.muscle_groups.filter((m) => !exercise.secondary_muscle_groups?.includes(m));
    const matchInPrimary = primaryMuscles.length > 0 && primaryMuscles.some((m) => wantedMuscles.has(m));
    const matchInAny = exercise.muscle_groups.some((m) => wantedMuscles.has(m));
    if (matchInAny) {
      total += WEIGHT_BODY_PART;
    }
    // Primary muscle match bonus: exercise primarily targets the user's focus (ExRx primary movers)
    if (matchInPrimary) {
      total += 0.5;
    }
    // Quad/Posterior emphasis: when Lower is selected with modifier, prefer matching pattern/category
    const focusSet = new Set(focusParts.map((f) => f.toLowerCase().replace(/\s/g, "_")));
    const patternFocus = (exercise.movement_pattern ?? "").toLowerCase();
    const pairing = (exercise.pairing_category ?? "").toLowerCase().replace(/\s/g, "_");
    if (focusSet.has("quad") && (patternFocus === "squat" || pairing === "quads")) {
      total += 0.8;
    }
    if (focusSet.has("posterior") && (patternFocus === "hinge" || pairing === "posterior_chain")) {
      total += 0.8;
    }
  }

  // Calisthenics: ~90% bodyweight, prefer advanced progressions, upper = push-up/handstand/pull-up families
  if (input.primary_goal === "calisthenics") {
    const isBodyweight =
      exercise.equipment_required.some((eq) => eq.toLowerCase() === "bodyweight") ||
      exercise.tags.goal_tags?.includes("calisthenics");
    if (isBodyweight) {
      total += 1.5;
    } else {
      total -= 1.5;
    }
    const hasRegressions = (exercise.regressions?.length ?? 0) > 0;
    if (hasRegressions) {
      total += 0.5;
    }
    const focusPartsNorm = (input.focus_body_parts ?? []).map((f) => f.toLowerCase().replace(/\s/g, "_"));
    const focusUpper =
      (focusPartsNorm.includes("upper_push") || focusPartsNorm.includes("upper_pull")) &&
      !focusPartsNorm.includes("lower") &&
      !focusPartsNorm.includes("full_body");
    if (focusUpper) {
      const fine = getPrimaryFineMovementPattern(exercise);
      if (fine && CALISTHENICS_UPPER_PREFERRED_FINE_PATTERNS.has(fine)) {
        total += 0.8;
      }
    }
  }

  // Conditioning/endurance: direct sub-focus slug match is first-class (strong); legacy tag match is weaker.
  const primary = input.primary_goal;
  const goalSubFocus = input.goal_sub_focus;
  const conditioningIntentSlugs =
    (primary === "conditioning" || primary === "endurance") &&
    goalSubFocus?.[primary]?.length
      ? (goalSubFocus[primary] ?? []).filter(
          (s) => !["upper", "lower", "core", "full_body"].includes(s)
        )
      : [];
  if (conditioningIntentSlugs.length > 0) {
    const directMatch = conditioningIntentSlugs.some((slug) =>
      exerciseHasSubFocusSlug(exercise, slug)
    );
    if (directMatch) total += 3;
  }

  // Strength: direct intent sub-focus slug match drives primary selection and is stronger than legacy tags.
  if (primary === "strength" && goalSubFocus?.[primary]?.length) {
    const ranked = goalSubFocus[primary] ?? [];
    const weightsArr = input.goal_sub_focus_weights?.[primary] ?? ranked.map(() => 1 / (ranked.length || 1));
    const weightBySlug = new Map<string, number>();
    ranked.forEach((s, i) => weightBySlug.set(s, weightsArr[i] ?? 1 / (ranked.length || 1)));

    let intentBonus = 0;
    let overlayBonus = 0;
    for (const slug of ranked) {
      if (!exerciseHasStrengthSubFocusSlug(exercise, slug)) continue;
      const w = weightBySlug.get(slug) ?? 0;
      if (STRENGTH_INTENT_SET.has(slug)) intentBonus += w * 5;
      else if (STRENGTH_OVERLAY_SET.has(slug)) overlayBonus += w * 2;
    }
    total += intentBonus + overlayBonus;
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
        // Scale so direct match beats legacy tag overlap.
        total += w * 6;
      }
    }
  }

  // Sub-focus (tag-based): boost exercises whose tags match goal/sport sub-focus tag map. For conditioning, legacy tags (conditioning/compound/energy_high) are weaker than direct slug match above.
  const sportSubFocus = input.sport_sub_focus;
  const hasSubFocus =
    (goalSubFocus && Object.keys(goalSubFocus).length > 0) ||
    (sportSubFocus && Object.keys(sportSubFocus).length > 0);
  if (hasSubFocus) {
    const preferredWeights = buildPreferredTagWeightsFromSubFocus(input);
    if (preferredWeights.size > 0) {
      const exerciseSlugs = getExerciseTagSlugs(exercise);
      let subFocusScore = 0;
      for (const [slug, weight] of preferredWeights) {
        if (exerciseSlugs.has(slug)) subFocusScore += weight;
      }
      const subFocusCoeff =
        primary === "conditioning" || primary === "endurance"
          ? 0.25
          : primary === "strength"
            ? 0.2
            : primary === "hypertrophy"
              ? 0.15
              : 0.5;
      const subFocusContribution = subFocusScore * subFocusCoeff;
      total += subFocusContribution;
    }
  }

  // Injury-aware: down-rank high-impact exercises when user has knee/lower_back/ankle limitations
  const injuries = input.injuries_or_constraints ?? [];
  const impactSensitiveKeys = new Set(injuries.map(normalizeInjuryKey).filter((k) => ["knee", "knee_pain", "lower_back", "low_back_sensitive", "ankle"].includes(k)));
  if (impactSensitiveKeys.size > 0 && exercise.impact_level === "high") {
    total -= 2;
  }

  // Contraindication priority: prefer exercises with fewer contraindications when otherwise equal
  // (tags are ordered most→least relevant; fewer tags = broader applicability / better match pool)
  const contraCount = (exercise.contraindication_tags?.length ?? exercise.tags.contraindications?.length ?? 0);
  if (contraCount === 0) {
    total += 0.3;
  } else if (contraCount === 1) {
    total += 0.2;
  } else if (contraCount === 2) {
    total += 0.1;
  }

  // Energy fit
  const energyFit = exercise.tags.energy_fit ?? ["low", "medium", "high"];
  if (energyFit.includes(input.energy_level)) {
    total += WEIGHT_ENERGY_FIT;
  }

  // Variety penalty: used recently
  let varietyPenalty = 0;
  if (recentExerciseIds.has(exercise.id)) varietyPenalty += 3;
  const pattern = exercise.movement_pattern;
  const samePatternCount = movementPatternCounts.get(pattern) ?? 0;
  if (samePatternCount >= 2) varietyPenalty += 1.5;
  if (samePatternCount >= 3) varietyPenalty += 2;
  total -= varietyPenalty;

  // Balance bonus: movement-pattern balancing engine (prefer missing categories, then underrepresented)
  const balanceBonus = balanceBonusForExercise(
    pattern,
    movementPatternCounts,
    MIN_MOVEMENT_CATEGORIES,
    [...BALANCE_CATEGORY_PATTERNS]
  );
  total += balanceBonus;

  // Fatigue management: slight penalty for re-hitting same muscle groups as last session
  if (fatigueState) {
    const fatiguePenalty = fatiguePenaltyForExercise(exercise.muscle_groups, fatigueState);
    total += fatiguePenalty;
  }

  // Duration practicality: short sessions prefer low time_cost
  if (input.duration_minutes <= 30 && exercise.time_cost === "high") {
    total -= 1;
  } else if (input.duration_minutes <= 30 && exercise.time_cost === "low") {
    total += 0.5;
  }

  // Phase 11: history-aware scoring (no effect when history absent)
  if (opts.historyContext) {
    const lastSuccess = opts.historyContext.recent_sessions?.[0]?.performance_by_exercise?.[exercise.id]
      ? undefined
      : undefined;
    const { total: historyTotal, breakdown: historyBreakdown } = computeHistoryScoreComponents(exercise, {
      recentIds: recentExerciseIds,
      blockType: opts.blockType,
      preferVariety: opts.blockType !== "main_strength" && opts.blockType !== "main_hypertrophy",
      historyContext: opts.historyContext,
      lastCompletionSuccess: lastSuccess,
    });
    total += historyTotal;
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
  total += ontologyTotal;

  return { score: total };
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
  if (exercise.rep_range_min == null || exercise.rep_range_max == null) return goalRange;
  const effectiveMin = Math.max(goalRange.min, exercise.rep_range_min);
  const effectiveMax = Math.min(goalRange.max, exercise.rep_range_max);
  if (effectiveMin <= effectiveMax) return { min: effectiveMin, max: effectiveMax };
  return goalRange;
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
  const scaleSets = (s: number) => {
    let n = fatigueVolumeScale != null && fatigueVolumeScale < 1
      ? Math.max(1, Math.round(s * fatigueVolumeScale))
      : s;
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
      rest_seconds: blockType === "warmup" ? 0 : 15,
      coaching_cues: beginnerCue(rules.cueStyle.mobility ?? "Controlled, full range of motion. Breathe steadily."),
    };
  }

  // Power block: rep-based explosive prescription regardless of exercise modality (e.g. KB swing in power block).
  if (blockType === "power" && goal === "power" && rules.setRange && rules.repRange && rules.restRange) {
    const baseSets = Math.round((rules.setRange.min + rules.setRange.max) / 2);
    const sets = scaleSets(scaleSetsByEnergy(baseSets, energyLevel));
    const repRange = getEffectiveRepRange(exercise, rules.powerRepRange ?? rules.repRange);
    const reps = Math.round((repRange.min + repRange.max) / 2);
    const rest = rules.powerRestRange
      ? Math.round((rules.powerRestRange.min + rules.powerRestRange.max) / 2)
      : Math.round((rules.restRange.min + rules.restRange.max) / 2);
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
    const setRange = rules.accessorySetRange ?? { min: 2, max: 3 };
    const sets = scaleSets(scaleSetsByEnergy(Math.round((setRange.min + setRange.max) / 2), energyLevel));
    const goalRepRange = exerciseUsesOnlyDumbbellsOrKettlebells(exercise) ? { min: 8, max: 12 } : rules.accessoryRepRange;
    const repRange = getEffectiveRepRange(exercise, goalRepRange);
    const reps = Math.round((repRange.min + repRange.max) / 2);
    const rest = rules.accessoryRestRange ? Math.round((rules.accessoryRestRange.min + rules.accessoryRestRange.max) / 2) : 60;
    return {
      sets,
      reps,
      rest_seconds: rest,
      coaching_cues: beginnerCue(rules.cueStyle.strength ?? "Controlled tempo. Muscular balance."),
    };
  }

  // Power goal: use power rep/rest in main_strength block (evidence-based: low reps, high intent, long rest).
  if (blockType === "main_strength" && goal === "power" && rules.powerRepRange && rules.powerRestRange) {
    const baseSets = Math.round((rules.setRange.min + rules.setRange.max) / 2);
    const sets = scaleSets(scaleSetsByEnergy(baseSets, energyLevel));
    const repRange = getEffectiveRepRange(exercise, rules.powerRepRange);
    const reps = Math.round((repRange.min + repRange.max) / 2);
    const rest = Math.round((rules.powerRestRange.min + rules.powerRestRange.max) / 2);
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
    const reps = Math.round((repRange.min + repRange.max) / 2);
    const rest = Math.round((rules.restRange.min + rules.restRange.max) / 2);
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
    const reps = Math.round((repRange.min + repRange.max) / 2);
    const rest = Math.round((rules.restRange.min + rules.restRange.max) / 2);
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
  const reps = Math.round((repRange.min + repRange.max) / 2);
  const rest = Math.round((rules.restRange.min + rules.restRange.max) / 2);
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

// --- Select top exercises by score (and by movement pattern for balance) ---
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
  }
): { exercises: Exercise[] } {
  const opts = selectionOptions ?? {};
  const scoreOpts: ScoreExerciseOptions = {
    blockType: opts.blockType,
    sessionFatigueRegions: opts.sessionFatigueRegions,
    preferredWarmupCooldownTargets: opts.preferredWarmupCooldownTargets,
    sessionMovementPatternCounts: opts.sessionMovementPatternCounts,
    sessionHasBilateralLowerBody: opts.sessionHasBilateralLowerBody,
    historyContext: opts.historyContext,
  };

  const scored = pool.map((e) => ({
    exercise: e,
    ...scoreExercise(e, input, recentIds, movementCounts, fatigueState, scoreOpts),
  }));
  scored.sort((a, b) => b.score - a.score);
  const topOverall = scored.slice(0, Math.min(60, scored.length));
  // Score tier: all exercises within 2.5 points of the best, so we don't over-weight a small top set (min 25, max 50)
  const bestScore = topOverall[0]?.score ?? 0;
  const tierThreshold = Math.max(0, bestScore - 2.5);
  const topTier = topOverall.filter((x) => x.score >= tierThreshold);
  const randomPoolSize = Math.min(50, Math.max(25, topTier.length));
  const randomPool = topTier.slice(0, randomPoolSize);
  const chosen: Exercise[] = [];

  // Category-fill pass: ensure we hit MIN_MOVEMENT_CATEGORIES when possible (movement-pattern balancing engine)
  const patternsToPrefer = getPatternsToPrefer(movementCounts, MIN_MOVEMENT_CATEGORIES, [...BALANCE_CATEGORY_PATTERNS]);
  const state = getBalanceState(movementCounts, [...BALANCE_CATEGORY_PATTERNS]);
  const needCategories = Math.min(MIN_MOVEMENT_CATEGORIES - state.categoryCount, patternsToPrefer.length);

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

  return { exercises: chosen.slice(0, count) };
}

// --- Build warmup block: activation for the specific body parts that are the focus of today's workout ---
// Warm-up: bodyweight or bands only. We select mobility/activation that targets the day's focus (upper push, lower, etc.) so warmup prepares the muscles and joints for the main work.
// Phase 9: prefers prep/activation/mobility roles and targets relevant to focus; when focus is set we restrict pool to focus-relevant exercises.
function buildWarmup(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  fatigueState?: FatigueState,
  historyContext?: TrainingHistoryContext,
  strengthProfile?: SubFocusProfile | null
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

  // When building strength workouts with an intent sub-focus, align warm-up selection
  // to the primary movement pattern and trunk stability requirements.
  const basePreferredWarmupTargets = getPreferredWarmupTargetsFromFocus(input.focus_body_parts);
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
    ...new Set([...basePreferredWarmupTargets, ...strengthPreferredWarmupTargets]),
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
  const hasFocus = (input.focus_body_parts?.length ?? 0) > 0 && !input.focus_body_parts?.some((f) => f.toLowerCase().replace(/\s/g, "_") === "full_body");
  const focusLabel = hasFocus && input.focus_body_parts?.length
    ? input.focus_body_parts.map((f) => f.replace(/_/g, " ")).join(" / ")
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
  }
): WorkoutBlock {
  const minMobility = options.constraints.min_cooldown_mobility_exercises ?? 0;
  const useOntologyCooldown = minMobility > 0 || options.mainWorkFamilies.length > 0;
  const recoveryEmphasis =
    (input.secondary_goals ?? []).some(
      (g) => g.toLowerCase().replace(/\s/g, "_").includes("recovery") || g.toLowerCase().includes("recovery")
    ) || input.primary_goal === "recovery";
  const preferredTargets = getPreferredCooldownTargetsFromFamilies(options.mainWorkFamilies);

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
  strengthProfile?: SubFocusProfile | null
): WorkoutBlock[] {
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
  if (overlayFilter && overlayFilter !== "full_body") {
    mainPool = filterPoolByOverlay(mainPool, overlayFilter);
    accessoryPool = filterPoolByOverlay(accessoryPool, overlayFilter);
  }

  const mainLiftCount = Math.min(compoundMin, 2, mainPool.length);

  const primaryIntent = intentSlugs[0];
  const getComplementaryStrengthIntents = (intent?: string): string[] => {
    if (!intent) return [];
    if (intent === "deadlift_hinge") return ["squat"];
    if (intent === "squat") return ["deadlift_hinge"];
    if (intent === "bench_press") return ["overhead_press", "pull"];
    if (intent === "overhead_press") return ["bench_press", "pull"];
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
  const makeMainSelectOpts = () => ({
    blockType: "main_strength",
    sessionFatigueRegions,
    sessionMovementPatternCounts: movementCounts,
    sessionHasBilateralLowerBody: (movementCounts.get("squat") ?? 0) + (movementCounts.get("hinge") ?? 0) > 0,
    historyContext,
  });

  let mainLifts: Exercise[] = [];
  if (primaryIntent && intentSlugs.length > 0) {
    const directIntentMainMatches = mainPool.filter((e) => intentSlugs.some((slug) => exerciseHasStrengthSubFocusSlug(e, slug)));
    const primaryMatches = directIntentMainMatches.filter((e) => exerciseHasStrengthSubFocusSlug(e, primaryIntent));

    if (primaryMatches.length > 0) {
      // 1) Anchor: force primary intent into the first main lift when possible.
      const { exercises: anchorChosen } = selectExercises(primaryMatches, input, recentIds, movementCounts, 1, rng, fatigueState, makeMainSelectOpts());
      const anchor = anchorChosen[0];
      if (anchor) mainLifts.push(anchor);

      // 2) Fill remaining main-lift slots with intent-complementary movements (but keep anchor first).
      const remainingCount = mainLiftCount - mainLifts.length;
      if (remainingCount > 0 && anchor) {
        const remainingPoolBase = mainPool.filter((e) => e.id !== anchor.id);
        const complementaryIntents = getComplementaryStrengthIntents(primaryIntent);
        const remainingPrimaryOrComplementMatches = remainingPoolBase.filter(
          (e) =>
            exerciseHasStrengthSubFocusSlug(e, primaryIntent) ||
            complementaryIntents.some((slug) => exerciseHasStrengthSubFocusSlug(e, slug))
        );
        const remainingAnyIntentMatches = remainingPoolBase.filter((e) =>
          intentSlugs.some((slug) => exerciseHasStrengthSubFocusSlug(e, slug))
        );

        const remainingPool =
          remainingAnyIntentMatches.length >= remainingCount
            ? remainingAnyIntentMatches
            : remainingPrimaryOrComplementMatches.length >= remainingCount
              ? remainingPrimaryOrComplementMatches
              : remainingPoolBase;

        const { exercises: restChosen } = selectExercises(remainingPool, input, recentIds, movementCounts, remainingCount, rng, fatigueState, makeMainSelectOpts());
        mainLifts.push(...restChosen);
      }
    } else if (directIntentMainMatches.length > 0) {
      // If the primary intent has no direct matches, still keep all main lifts within direct intent matches.
      const { exercises: chosen } = selectExercises(
        directIntentMainMatches,
        input,
        recentIds,
        movementCounts,
        mainLiftCount,
        rng,
        fatigueState,
        makeMainSelectOpts()
      );
      mainLifts = chosen;
    }
  }

  if (mainLifts.length === 0) {
    const { exercises: chosen } = selectExercises(mainPool, input, recentIds, movementCounts, mainLiftCount, rng, fatigueState, makeMainSelectOpts());
    mainLifts = chosen;
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
  const accessoryItemSetsCapByDuration = input.duration_minutes <= 30 ? 2 : 3;
  const accessoryItemSetsCap = Math.max(1, Math.min(accessoryItemSetsCapByDuration, mainItemSetsMax - 1));

  const accessoryPairCountTarget = input.duration_minutes <= 30 ? 1 : 2;
  let pairCount = accessoryPairCountTarget;
  if (input.energy_level === "low") pairCount = Math.min(pairCount, 1);
  if (pairCount && wantsSupersets) {
    const available = accessoryPool.filter((e) => !used.has(e.id));
    const pairNeededItems = pairCount * 2;

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

    const poolForPairs = poolForPairsCandidates.slice(0, Math.min(poolForPairsCandidates.length, pairNeededItems * 2));

    const pairs = pickBestSupersetPairs(poolForPairs, pairCount, used) as [Exercise, Exercise][];
    for (const [exA, exB] of pairs) {
      used.add(exA.id);
      used.add(exB.id);
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
          sets: Math.max(1, Math.min(pA.sets ?? 1, accessoryItemSetsCap)),
          reps: pA.reps,
          rest_seconds: pA.rest_seconds,
          coaching_cues: pA.coaching_cues,
          reasoning_tags: ["superset", "secondary_strength", "accessory", ...(exA.tags.goal_tags ?? [])],
          unilateral: exA.unilateral ?? false,
        },
        {
          exercise_id: exB.id,
          exercise_name: exB.name,
          sets: Math.max(1, Math.min(pB.sets ?? 1, accessoryItemSetsCap)),
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
            sets: Math.max(1, Math.min(pCore.sets ?? 1, accessoryItemSetsCap)),
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
  historyContext?: TrainingHistoryContext
): WorkoutBlock[] {
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
  } as const;

  let chosen: Exercise[] = [];
  if (dominantSlug && isHypertrophyPrimary && directSubFocusSlugs.length > 0 && wantCount > 0) {
    const desiredDirectRatio = hasBalanced ? 0.45 : 0.65;
    const desiredDirectCount = Math.max(1, Math.round(wantCount * desiredDirectRatio));
    const directDominantPool = pool.filter((e) => exerciseMatchesHypertrophySubFocusSlug(e, dominantSlug));

    if (directDominantPool.length > 0) {
      const firstCount = Math.min(desiredDirectCount, directDominantPool.length, wantCount);
      const firstPick = selectExercises(
        directDominantPool,
        input,
        recentIds,
        movementCounts,
        firstCount,
        rng,
        fatigueState,
        selectionOptions
      );

      firstPick.exercises.forEach((e) => used.add(e.id));
      chosen = [...firstPick.exercises];

      const remaining = wantCount - chosen.length;
      if (remaining > 0) {
        const remainingPool = pool.filter((e) => !used.has(e.id));
        if (remainingPool.length > 0) {
          const secondPick = selectExercises(
            remainingPool,
            input,
            recentIds,
            movementCounts,
            remaining,
            rng,
            fatigueState,
            selectionOptions
          );
          chosen = [...chosen, ...secondPick.exercises];
        }
      }
    }
  }

  // Fallback: no dominant match pool (or balanced-only) → standard selection.
  if (chosen.length === 0) {
    const picked = selectExercises(
      pool,
      input,
      recentIds,
      movementCounts,
      wantCount,
      rng,
      fatigueState,
      selectionOptions
    );
    chosen = picked.exercises;
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
  const eq = (e.equipment_required ?? []).map((x) => x.toLowerCase());
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
    eq.includes("treadmill") ||
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
  const targetMainExercises = duration <= 30 ? 3 : duration <= 45 ? 6 : 8;
  const supersetPairCount = duration <= 30 ? 1 : duration <= 45 ? 3 : 4;

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

  // HIIT structural override: if intent sub-focus is intervals_hiit, do not use standard superset+reps.
  if (
    conditioningProfile &&
    (conditioningProfile.templateHints?.includes("hiit_intervals") ||
      getPrimaryConditioningIntent(conditioningProfile) === "intervals_hiit")
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

  const intentSlugs = conditioningProfile
    ? getConditioningIntentSlugs(conditioningProfile)
    : [];
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

  // For 30 min keep one cardio block; for 45+ only add cardio if we're under target (e.g. few pairs found).
  let cardioPool = exercises.filter(
    (e) => e.modality === "conditioning" && !used.has(e.id)
  );
  const condMins =
    getConditioningDurationMinutes(input.primary_goal, input.energy_level) ??
    input.style_prefs?.conditioning_minutes ??
    (input.duration_minutes >= 60 ? 30 : 20);
  const mainExerciseCount = blocks.reduce((n, b) => n + b.items.length, 0);
  const addCardioBlock =
    cardioPool.length && condMins > 0 && mainExerciseCount < targetMainExercises;
  if (addCardioBlock) {
    const preferredIntentSlugs =
      intentSlugs.length > 0 ? intentSlugs : undefined;
    const c = pickConditioningExercise(
      cardioPool,
      input.style_prefs?.preferred_zone2_cardio,
      rng,
      preferredIntentSlugs
    );
    if (c) {
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
      const primaryIntent = conditioningProfile
        ? getPrimaryConditioningIntent(conditioningProfile)
        : undefined;
      const interval = isHighIntensityConditioning(c)
        ? REP_BASED_HIGH_INTENSITY_CONDITIONING_IDS.has(c.id)
          ? getRepBasedHighIntensityConditioningStructure(condMins)
          : getHighIntensityConditioningStructure(condMins)
        : isExplosiveConditioning(c)
          ? getExplosiveConditioningStructure()
          : primaryIntent != null
            ? getConditioningStructureByIntent(
                condMins,
                primaryIntent,
                c.equipment_required ?? [],
                input.primary_goal
              )
            : getConditioningIntervalStructure(
                condMins,
                input.primary_goal,
                c.equipment_required ?? []
              );
      const condFormat =
        (interval.format as BlockFormat) ??
        (getGoalRules(input.primary_goal).conditioningFormats?.[0]) ??
        "straight_sets";
      const workSec = interval.time_seconds ?? (interval.reps != null ? 30 : 0);
      const estimatedMin =
        isHighIntensityConditioning(c) || isExplosiveConditioning(c)
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
            ...(interval.reps != null
              ? { reps: interval.reps }
              : { time_seconds: interval.time_seconds }),
            rest_seconds: interval.rest_seconds,
            coaching_cues: p.coaching_cues,
            reasoning_tags: ["endurance", ...(c.tags.goal_tags ?? [])],
            unilateral: c.unilateral ?? false,
          },
        ],
        estimated_minutes: Math.round(estimatedMin),
      });
    }
  }
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
    const reduce = Math.min(toRemove, current - 1);
    if (reduce > 0) {
      item.sets = Math.max(1, current - reduce);
      toRemove -= reduce;
    }
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

// --- Main entry: 8-step generation flow ---
/** @param exercisePool Full catalog for this request (e.g. from `listExercisesForGenerator`). No default — avoids accidentally using the tiny test stub in production. */
export function generateWorkoutSession(
  input: GenerateWorkoutInput,
  exercisePool: Exercise[]
): WorkoutSession {
  const seed = input.seed ?? 0;
  const rng = createSeededRng(seed);

  // 1. Determine goal rules (from prescriptionRules)
  const primary = input.primary_goal;
  const goalRules = getGoalRules(primary);

  // 2. Filter exercises: equipment + energy + avoid (filterByHardConstraints), then constraint-based injury/body-part (single source of truth with validator).
  let filtered = filterByHardConstraints(exercisePool, input);
  const constraints = resolveWorkoutConstraints(inputToSelectionInput(input));
  filtered = filterByConstraintsForPool(filtered, constraints);
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
  const warmup = buildWarmup(filtered, input, used, rng, fatigueState, historyContext, strengthProfileForWarmup);
  const blocks: WorkoutBlock[] = [warmup];

  const wantsSupersets = input.style_prefs?.wants_supersets !== false;
  const sessionFatigueRegions = new Map<string, number>();

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
        strengthProfileForWarmup
      )
    );
  } else if (primary === "hypertrophy" || primary === "body_recomp" || primary === "calisthenics") {
    blocks.push(...buildMainHypertrophy(filtered, input, used, recentIds, movementCounts, rng, wantsSupersets, fatigueVolumeScale, fatigueState, sessionFatigueRegions, historyContext));
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
    blocks.push(...buildMainStrength(filtered, input, used, recentIds, movementCounts, rng, wantsSupersets, fatigueVolumeScale, fatigueState, sessionFatigueRegions, historyContext));
  }

  // 5. Build accessory (handled inside buildMainStrength / buildMainHypertrophy per goal rules)

  // 5a. Strength block when strength is secondary goal (prefer_strength_block; primary is not already strength/power)
  if (constraints.prefer_strength_block && primary !== "strength" && primary !== "power") {
    const hasStrengthBlock = blocks.some((b) => b.block_type === "main_strength");
    if (!hasStrengthBlock) {
      const mainStrengthPatterns = new Set(["squat", "hinge", "push", "pull"]);
      const strengthPool = filtered.filter(
        (e) =>
          (e.modality === "strength" || e.modality === "power") &&
          !used.has(e.id) &&
          mainStrengthPatterns.has(effectiveMainWorkPattern(e)) &&
          !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
      );
      const count = input.duration_minutes >= 45 ? 2 : 1;
      if (strengthPool.length >= 1) {
        const { exercises: chosen } = selectExercises(
          strengthPool,
          input,
          recentIds,
          movementCounts,
          count,
          rng,
          fatigueState,
          { blockType: "main_strength", sessionFatigueRegions, sessionMovementPatternCounts: movementCounts, historyContext }
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
          { blockType: "main_hypertrophy", sessionFatigueRegions, sessionMovementPatternCounts: movementCounts, historyContext }
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

  // 6. Build conditioning (goal rules: optional vs mandatory vs primary; or required when secondary)
  const hasConditioningBlock = blocks.some((b) => b.block_type === "conditioning");
  const conditioningStrategy = goalRules.conditioningStrategy;
  const requiredConditioning = constraints.required_conditioning_block === true;
  const skipConditioning =
    hasConditioningBlock ||
    (!requiredConditioning &&
      (conditioningStrategy === "none" ||
        (goalRules.conditioningOnlyIfHighEnergy && input.energy_level !== "high")));

  if (!skipConditioning) {
    const userMins = input.style_prefs?.conditioning_minutes ?? 0;
    const ruleMins = getConditioningDurationMinutes(primary, input.energy_level);
    const conditioningMins = requiredConditioning
      ? Math.min(15, ruleMins ?? 15)
      : conditioningStrategy === "mandatory"
        ? (ruleMins ?? 30)
        : (userMins > 0 ? userMins : (ruleMins ?? 0));
    const addConditioning =
      requiredConditioning ||
      (conditioningStrategy === "mandatory" || conditioningStrategy === "optional_short" || conditioningStrategy === "optional_moderate");
    if (addConditioning && conditioningMins > 0) {
      const cardioPool = filtered.filter((e) => e.modality === "conditioning" && !used.has(e.id));
      if (cardioPool.length) {
        const c = pickConditioningExercise(
          cardioPool,
          input.style_prefs?.preferred_zone2_cardio,
          rng
        );
        if (c) {
          used.add(c.id);
          const p = getPrescription(c, "conditioning", input.energy_level, input.primary_goal, undefined, undefined, input.style_prefs?.user_level);
          const interval = isHighIntensityConditioning(c)
            ? getHighIntensityConditioningStructure(conditioningMins)
            : isExplosiveConditioning(c)
              ? getExplosiveConditioningStructure()
              : getConditioningIntervalStructure(conditioningMins, input.primary_goal, c.equipment_required ?? []);
          const condFormat = (interval.format as BlockFormat) ?? (goalRules.conditioningFormats?.[0]) ?? "straight_sets";
          const workSec = interval.time_seconds ?? (interval.reps != null ? 30 : 0);
          const estimatedMin = isHighIntensityConditioning(c) || isExplosiveConditioning(c)
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
                ...(interval.reps != null ? { reps: interval.reps } : { time_seconds: interval.time_seconds }),
                rest_seconds: interval.rest_seconds,
                coaching_cues: p.coaching_cues,
                reasoning_tags: ["conditioning", ...(c.tags.goal_tags ?? [])],
                unilateral: c.unilateral ?? false,
              },
            ],
            estimated_minutes: Math.round(estimatedMin),
          });
        }
      }
    }
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
  });
  blocks.push(cooldown);

  // Merge consecutive blocks with the same title so we never show two blocks with the same name
  const mergedBlocks = mergeConsecutiveBlocksWithSameTitle(blocks);

  // Phase 11: attach progress/maintain/regress/rotate and prescription influence
  attachRecommendationsToSession(mergedBlocks, filtered, historyContext, recentIds);

  // Enforce main vs accessory set ratio: never more accessory than main; when doing accessory, 75% main / 25% accessory
  enforceMainAccessoryRatioOnBlocks(mergedBlocks);

  // 8. Post-assembly validation and repair (Phase 8)
  const sumBlockMinutes = mergedBlocks.reduce((sum, b) => sum + (b.estimated_minutes ?? 5), 0);
  const estimated_duration_minutes =
    input.duration_minutes != null && input.duration_minutes > 0
      ? input.duration_minutes
      : sumBlockMinutes;

  const session: WorkoutSession = {
    title: sessionTitle(input),
    estimated_duration_minutes,
    blocks: mergedBlocks,
  };

  const validation = validateWorkoutAgainstConstraints(session, constraints, filtered);
  if (validation.valid) return session;
  if (validation.repairedWorkout) {
    return validation.repairedWorkout as WorkoutSession;
  }
  if (validation.violations.length > 0) {
    console.warn(
      "[Phase 8] Workout validation issues (no repair possible):",
      validation.violations.map((v) => ({ type: v.type, description: v.description }))
    );
  }
  return session;
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
  const filtered = filterByHardConstraints(exercisePool, input);
  const poolById = new Map(exercisePool.map((e) => [e.id, e]));
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
