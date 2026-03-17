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
import { STUB_EXERCISES } from "./exerciseStub";
import {
  isWarmupEligibleEquipment,
  isCooldownEligibleEquipment,
  WARMUP_CARDIO_POSITION,
  WARMUP_ITEM_MAX_SECONDS,
  getInjuryAvoidTags,
  getInjuryAvoidExerciseIds,
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
import { validateWorkoutAgainstConstraints } from "../workoutIntelligence/validation/workoutValidator";
import {
  computeOntologyScoreComponents,
  getEffectiveFatigueRegions,
  getPreferredWarmupTargetsFromFocus,
} from "./ontologyScoring";
import { buildHistoryContextFromLegacy, type TrainingHistoryContext } from "./historyTypes";
import {
  computeHistoryScoreComponents,
  getEffectiveRecentIds,
} from "./historyScoring";
import { getRecommendation } from "./recommendationLayer";
import { applyRecommendationToPrescription } from "./prescriptionHistory";
import { getLegacyMovementPattern } from "../../lib/ontology/legacyMapping";
import { getExerciseTagsForGoalSubFocuses } from "../../data/goalSubFocus";
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

/** Map focus_body_parts (generator input) to canonical movement families for strict filtering. */
function focusToMovementFamilies(focus: string[]): Set<string> | null {
  if (!focus?.length || focus.some((f) => f.toLowerCase() === "full_body")) return null;
  const families = new Set<string>();
  for (const f of focus) {
    const key = f.toLowerCase().replace(/\s/g, "_");
    if (key === "upper_push") families.add("upper_push");
    else if (key === "upper_pull") families.add("upper_pull");
    else if (key === "upper_body") {
      families.add("upper_push");
      families.add("upper_pull");
    } else if (key === "lower" || key === "lower_body") families.add("lower_body");
    else if (key === "core") families.add("core");
    else if (key === "mobility") families.add("mobility");
    else if (key === "conditioning") families.add("conditioning");
  }
  return families.size > 0 ? families : null;
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

// --- Hard constraints: filter out exercises that violate equipment, injuries, avoid, energy, time, body-part ---
// Ontology-first: uses joint_stress_tags, contraindication_tags, primary_movement_family when present; fallback to tags/derivation.
export function filterByHardConstraints(
  exercises: Exercise[],
  input: GenerateWorkoutInput
): Exercise[] {
  const equipmentSet = new Set(
    input.available_equipment.map((eq) => eq.toLowerCase().replace(/\s/g, "_"))
  );
  const injuryKeys = new Set(input.injuries_or_constraints.map((i) => normalizeInjuryKey(i)));
  const avoidTags = input.style_prefs?.avoid_tags ?? [];
  const injuryAvoidTags = getInjuryAvoidTags(input.injuries_or_constraints);
  const injuryAvoidIds = getInjuryAvoidExerciseIds(input.injuries_or_constraints);
  const allowedFamilies = focusToMovementFamilies(input.focus_body_parts ?? []);

  return exercises.filter((e) => {
    if (BLOCKED_EXERCISE_IDS.has(e.id)) return false;
    // Equipment: every required piece must be available
    const required = e.equipment_required.map((eq) => eq.toLowerCase().replace(/\s/g, "_"));
    if (required.some((eq) => !equipmentSet.has(eq))) return false;

    // Ontology-first: contraindications (canonical body regions) vs normalized injury keys
    const contra = (e.contraindication_tags?.length ? e.contraindication_tags : e.tags.contraindications) ?? [];
    if (contra.some((c) => injuryKeys.has(c.toLowerCase().replace(/\s/g, "_")))) return false;

    // Ontology-first: joint stress (canonical slugs)
    const jointStress = (e.joint_stress_tags?.length ? e.joint_stress_tags : e.tags.joint_stress) ?? [];
    for (const avoid of injuryAvoidTags) {
      if (jointStress.some((t) => t.toLowerCase().replace(/\s/g, "_") === avoid)) return false;
    }
    if (injuryAvoidIds.has(e.id)) return false;

    // Joint stress: if user style prefs avoid certain patterns, exclude
    for (const avoid of avoidTags) {
      const a = avoid.toLowerCase().replace(/\s/g, "_");
      if (jointStress.some((t) => t.toLowerCase().replace(/\s/g, "_") === a)) return false;
    }

    // Avoid overhead / hanging when user specified
    if (exerciseHasOverheadOrHanging(e, avoidTags)) return false;

    // Strict body-part focus: only allow exercises whose primary or secondary movement family is in the allowed set
    if (allowedFamilies != null && allowedFamilies.size > 0) {
      const families = getEffectiveFamiliesForExercise(e);
      if (!families.some((f) => allowedFamilies!.has(f))) return false;
    }

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

/** Build preferred tag weights from goal_sub_focus and sport_sub_focus input. Used for sub-focus tag-based scoring. */
function buildPreferredTagWeightsFromSubFocus(input: GenerateWorkoutInput): Map<string, number> {
  const out = new Map<string, number>();
  const goalSubFocus = input.goal_sub_focus;
  if (goalSubFocus && Object.keys(goalSubFocus).length > 0) {
    for (const [goalSlug, subFocusSlugs] of Object.entries(goalSubFocus)) {
      if (!subFocusSlugs?.length) continue;
      const entries = getExerciseTagsForGoalSubFocuses(goalSlug, subFocusSlugs);
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
  includeDebug: boolean,
  fatigueState?: FatigueState,
  options?: ScoreExerciseOptions
): { score: number; debug?: Partial<ScoringDebug> } {
  let total = 0;
  const debug: Partial<ScoringDebug> | undefined = includeDebug ? { exercise_id: exercise.id } : undefined;
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
  if (debug) debug.goal_alignment = goalScore;

  // Sport match: boost exercises whose sport_tags match user's ranked sport(s)
  const sportSlugs = input.sport_slugs;
  if (sportSlugs?.length) {
    const exerciseSportTags = new Set((exercise.tags.sport_tags ?? []).map((s) => tagToSlug(s)));
    for (let i = 0; i < sportSlugs.length; i++) {
      const slug = tagToSlug(sportSlugs[i]);
      if (exerciseSportTags.has(slug)) {
        total += i === 0 ? 2 : 1;
        if (debug) debug.sport_tag_match = i === 0 ? 2 : 1;
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
      if (debug) debug.preferred_exercise_bonus = bonus;
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
      if (debug) debug.body_part = WEIGHT_BODY_PART;
    }
    // Primary muscle match bonus: exercise primarily targets the user's focus (ExRx primary movers)
    if (matchInPrimary) {
      total += 0.5;
      if (debug) debug.primary_muscle_match_bonus = 0.5;
    }
    // Quad/Posterior emphasis: when Lower is selected with modifier, prefer matching pattern/category
    const focusSet = new Set(focusParts.map((f) => f.toLowerCase().replace(/\s/g, "_")));
    const pattern = (exercise.movement_pattern ?? "").toLowerCase();
    const pairing = (exercise.pairing_category ?? "").toLowerCase().replace(/\s/g, "_");
    if (focusSet.has("quad") && (pattern === "squat" || pairing === "quads")) {
      total += 0.8;
      if (debug) debug.body_part_emphasis_bonus = 0.8;
    }
    if (focusSet.has("posterior") && (pattern === "hinge" || pairing === "posterior_chain")) {
      total += 0.8;
      if (debug) debug.body_part_emphasis_bonus = (debug.body_part_emphasis_bonus ?? 0) + 0.8;
    }
  }

  // Sub-focus (Option A: tag-based): boost exercises whose tags match goal/sport sub-focus tag map
  const goalSubFocus = input.goal_sub_focus;
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
      const subFocusCoeff = 0.5;
      const subFocusContribution = subFocusScore * subFocusCoeff;
      total += subFocusContribution;
      if (debug && subFocusContribution > 0) debug.sub_focus_tag_match = subFocusContribution;
    }
  }

  // Injury-aware: down-rank high-impact exercises when user has knee/lower_back/ankle limitations
  const injuries = input.injuries_or_constraints ?? [];
  const impactSensitiveKeys = new Set(injuries.map(normalizeInjuryKey).filter((k) => ["knee", "knee_pain", "lower_back", "low_back_sensitive", "ankle"].includes(k)));
  if (impactSensitiveKeys.size > 0 && exercise.impact_level === "high") {
    total -= 2;
    if (debug) debug.impact_penalty = -2;
  }

  // Contraindication priority: prefer exercises with fewer contraindications when otherwise equal
  // (tags are ordered most→least relevant; fewer tags = broader applicability / better match pool)
  const contraCount = (exercise.contraindication_tags?.length ?? exercise.tags.contraindications?.length ?? 0);
  if (contraCount === 0) {
    total += 0.3;
    if (debug) debug.contraindication_priority_bonus = 0.3;
  } else if (contraCount === 1) {
    total += 0.2;
    if (debug) debug.contraindication_priority_bonus = 0.2;
  } else if (contraCount === 2) {
    total += 0.1;
    if (debug) debug.contraindication_priority_bonus = 0.1;
  }

  // Energy fit
  const energyFit = exercise.tags.energy_fit ?? ["low", "medium", "high"];
  if (energyFit.includes(input.energy_level)) {
    total += WEIGHT_ENERGY_FIT;
    if (debug) debug.energy_fit = WEIGHT_ENERGY_FIT;
  }

  // Variety penalty: used recently
  let varietyPenalty = 0;
  if (recentExerciseIds.has(exercise.id)) varietyPenalty += 3;
  const pattern = exercise.movement_pattern;
  const samePatternCount = movementPatternCounts.get(pattern) ?? 0;
  if (samePatternCount >= 2) varietyPenalty += 1.5;
  if (samePatternCount >= 3) varietyPenalty += 2;
  total -= varietyPenalty;
  if (debug && varietyPenalty) debug.variety_penalty = -varietyPenalty;

  // Balance bonus: movement-pattern balancing engine (prefer missing categories, then underrepresented)
  const balanceBonus = balanceBonusForExercise(
    pattern,
    movementPatternCounts,
    MIN_MOVEMENT_CATEGORIES,
    [...BALANCE_CATEGORY_PATTERNS]
  );
  total += balanceBonus;
  if (debug && balanceBonus) debug.balance_bonus = balanceBonus;

  // Fatigue management: slight penalty for re-hitting same muscle groups as last session
  if (fatigueState) {
    const fatiguePenalty = fatiguePenaltyForExercise(exercise.muscle_groups, fatigueState);
    total += fatiguePenalty;
    if (debug && fatiguePenalty !== 0) debug.fatigue_penalty = fatiguePenalty;
  }

  // Duration practicality: short sessions prefer low time_cost
  if (input.duration_minutes <= 30 && exercise.time_cost === "high") {
    total -= 1;
    if (debug) debug.duration_practicality = -1;
  } else if (input.duration_minutes <= 30 && exercise.time_cost === "low") {
    total += 0.5;
    if (debug) debug.duration_practicality = 0.5;
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
    if (debug && historyBreakdown) {
      if (historyBreakdown.recent_exposure_penalty != null) debug.history_recent_exposure_penalty = historyBreakdown.recent_exposure_penalty;
      if (historyBreakdown.anchor_repeat_bonus != null) debug.history_anchor_repeat_bonus = historyBreakdown.anchor_repeat_bonus;
      if (historyBreakdown.accessory_rotation_penalty != null) debug.history_accessory_rotation_penalty = historyBreakdown.accessory_rotation_penalty;
      if (historyBreakdown.movement_family_rotation_bonus != null) debug.history_movement_family_rotation_bonus = historyBreakdown.movement_family_rotation_bonus;
      if (historyBreakdown.joint_stress_sensitivity_penalty != null) debug.history_joint_stress_sensitivity_penalty = historyBreakdown.joint_stress_sensitivity_penalty;
    }
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
  if (debug && ontologyBreakdown) {
    if (ontologyBreakdown.role_fit != null) debug.ontology_role_fit = ontologyBreakdown.role_fit;
    if (ontologyBreakdown.movement_family_fit != null) debug.ontology_movement_family_fit = ontologyBreakdown.movement_family_fit;
    if (ontologyBreakdown.main_lift_anchor != null) debug.ontology_main_lift_anchor = ontologyBreakdown.main_lift_anchor;
    if (ontologyBreakdown.fatigue_balance != null) debug.ontology_fatigue_balance = ontologyBreakdown.fatigue_balance;
    if (ontologyBreakdown.joint_stress_soft != null) debug.ontology_joint_stress_soft = ontologyBreakdown.joint_stress_soft;
    if (ontologyBreakdown.warmup_cooldown_relevance != null) debug.ontology_warmup_cooldown_relevance = ontologyBreakdown.warmup_cooldown_relevance;
    if (ontologyBreakdown.unilateral_variety_bonus != null) debug.ontology_unilateral_variety_bonus = ontologyBreakdown.unilateral_variety_bonus;
    if (ontologyBreakdown.movement_pattern_redundancy_penalty != null) debug.ontology_movement_pattern_redundancy_penalty = ontologyBreakdown.movement_pattern_redundancy_penalty;
  }

  if (debug) debug.total = total;
  return { score: total, debug };
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
  includeDebug: boolean,
  fatigueState?: FatigueState,
  selectionOptions?: {
    blockType?: string;
    sessionFatigueRegions?: Map<string, number>;
    preferredWarmupCooldownTargets?: string[];
    sessionMovementPatternCounts?: Map<string, number>;
    sessionHasBilateralLowerBody?: boolean;
    historyContext?: TrainingHistoryContext;
  }
): { exercises: Exercise[]; scoringDebug: ScoringDebug[] } {
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
    ...scoreExercise(e, input, recentIds, movementCounts, includeDebug, fatigueState, scoreOpts),
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
  const debugList: ScoringDebug[] = [];

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
    if (best.debug && includeDebug) debugList.push(best.debug as ScoringDebug);
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
    if (item.debug && includeDebug) debugList.push(item.debug as ScoringDebug);
  }

  // If we didn't fill, add from top in order (respecting pattern cap and consecutive-cluster cap)
  for (const { exercise, debug } of topOverall) {
    if (chosen.length >= count) break;
    if (chosen.some((c) => c.id === exercise.id)) continue;
    const nextCount = (movementCounts.get(exercise.movement_pattern) ?? 0) + 1;
    if (nextCount > MAX_SAME_PATTERN_PER_SESSION) continue;
    if (wouldBeThreeSameClusterInARow(chosen, exercise)) continue;
    chosen.push(exercise);
    movementCounts.set(exercise.movement_pattern, nextCount);
    if (opts.sessionFatigueRegions) addExerciseFatigueRegionsToSession(opts.sessionFatigueRegions, exercise);
    if (debug && includeDebug) debugList.push(debug as ScoringDebug);
  }

  return { exercises: chosen.slice(0, count), scoringDebug: debugList };
}

// --- Build warmup block: activation and joint mobility for the muscles/joints used in the workout ---
// Warm-up: bodyweight or bands only. Focus on activation of focus muscles and movement of joints around them (no cables/weights, no conditioning).
// Phase 9: prefers prep/activation/mobility roles and targets relevant to focus.
function buildWarmup(
  exercises: Exercise[],
  input: GenerateWorkoutInput,
  used: Set<string>,
  rng: () => number,
  includeDebug: boolean,
  fatigueState?: FatigueState,
  historyContext?: TrainingHistoryContext
): WorkoutBlock {
  // Activation and joint prep only (no conditioning in warmup).
  const basePool = exercises.filter(
    (e) =>
      (e.modality === "mobility" || e.modality === "recovery") &&
      !used.has(e.id) &&
      e.id !== "breathing_cooldown"
  );
  const pool = basePool.filter((e) => isWarmupEligibleEquipment(e.equipment_required));
  const finalPool = pool.length ? pool : basePool;
  const count = input.duration_minutes <= 25 ? 1 : input.duration_minutes <= 40 ? 2 : 3;
  const movementCounts = new Map<string, number>();
  const recentIds = new Set(input.recent_history?.flatMap((h) => h.exercise_ids) ?? []);
  const preferredWarmupTargets = getPreferredWarmupTargetsFromFocus(input.focus_body_parts);
  const { exercises: chosen } = selectExercises(
    finalPool,
    input,
    recentIds,
    movementCounts,
    Math.min(count, finalPool.length || 2),
    rng,
    false,
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
  return {
    block_type: "warmup",
    format: "circuit",
    title: "Warm-up",
    reasoning: "Activation and joint mobility for the muscles and joints used in today's work.",
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
  historyContext?: TrainingHistoryContext
): WorkoutBlock[] {
  const blocks: WorkoutBlock[] = [];
  const goalRules = getGoalRules(input.primary_goal);
  let compoundMin = goalRules.compoundLiftMin ?? 1;
  if (input.duration_minutes <= 30) compoundMin = Math.min(compoundMin, 1);
  if (input.energy_level === "low") compoundMin = Math.min(compoundMin, 1);
  const mainStrengthPatterns = new Set(["squat", "hinge", "push", "pull"]);
  const mainPool = exercises.filter(
    (e) =>
      (e.modality === "strength" || e.modality === "power") &&
      !used.has(e.id) &&
      mainStrengthPatterns.has(effectiveMainWorkPattern(e)) &&
      !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
  );
  const accessoryPool = exercises.filter(
    (e) =>
      (e.modality === "strength" || e.modality === "hypertrophy") &&
      !used.has(e.id) &&
      !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
  );

  const mainLiftCount = Math.min(compoundMin, 2, mainPool.length);
  const { exercises: mainLifts } = selectExercises(
    mainPool,
    input,
    recentIds,
    movementCounts,
    mainLiftCount,
    rng,
    false,
    fatigueState,
    {
      blockType: "main_strength",
      sessionFatigueRegions,
      sessionMovementPatternCounts: movementCounts,
      sessionHasBilateralLowerBody: (movementCounts.get("squat") ?? 0) + (movementCounts.get("hinge") ?? 0) > 0,
      historyContext,
    }
  );

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
      reasoning: "Compound lifts for strength; superset for efficiency.",
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
        reasoning: "Compound lift for strength.",
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

  let pairCount =
    input.duration_minutes <= 30 ? 1
    : input.duration_minutes <= 45 ? 1
    : 2;
  if (input.energy_level === "low") pairCount = Math.min(pairCount, 1);
  if (pairCount && wantsSupersets) {
    const available = accessoryPool.filter((e) => !used.has(e.id));
    const pairs = pickBestSupersetPairs(available, pairCount, used) as [Exercise, Exercise][];
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
          sets: pA.sets,
          reps: pA.reps,
          rest_seconds: pA.rest_seconds,
          coaching_cues: pA.coaching_cues,
          reasoning_tags: ["superset", "accessory", ...(exA.tags.goal_tags ?? [])],
          unilateral: exA.unilateral ?? false,
        },
        {
          exercise_id: exB.id,
          exercise_name: exB.name,
          sets: pB.sets,
          reps: pB.reps,
          rest_seconds: pB.rest_seconds,
          coaching_cues: pB.coaching_cues,
          reasoning_tags: ["superset", "accessory", ...(exB.tags.goal_tags ?? [])],
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
      if (input.energy_level === "high") {
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
            sets: pCore.sets,
            reps: pCore.reps,
            rest_seconds: pCore.rest_seconds,
            coaching_cues: pCore.coaching_cues,
            reasoning_tags: ["accessory", "core", ...(coreCandidate.tags.goal_tags ?? [])],
            unilateral: coreCandidate.unilateral ?? false,
          });
        }
      }
      blocks.push({
        block_type: "main_strength",
        format: "superset",
        title: "Accessory",
        reasoning: "Superset for time efficiency." + (input.energy_level === "high" ? " Core added for high energy." : ""),
        items: accessoryItems,
        supersetPairs,
        estimated_minutes: Math.ceil(accessoryItems.length / 2) * 4,
      });
    }
  }

  return blocks;
}

/** Effective legacy movement pattern for main-work pool (ontology movement_patterns or legacy movement_pattern). */
function effectiveMainWorkPattern(e: Exercise): string {
  return getLegacyMovementPattern({
    movement_patterns: e.movement_patterns,
    movement_pattern: e.movement_pattern,
  });
}

/** Pick conditioning exercise: prefer those matching preferred_zone2_cardio (e.g. bike, treadmill, rower), else random. */
function pickConditioningExercise(
  pool: Exercise[],
  preferredModalities: string[] | undefined,
  rng: () => number
): Exercise | undefined {
  if (!pool.length) return undefined;
  if (preferredModalities?.length) {
    const normalized = preferredModalities.map((m) => m.toLowerCase().replace(/\s/g, "_"));
    const preferred = pool.filter((e) => {
      const id = e.id.toLowerCase();
      const name = e.name.toLowerCase();
      return normalized.some((n) => id.includes(n) || name.includes(n));
    });
    if (preferred.length) {
      return preferred[Math.floor(rng() * preferred.length)];
    }
  }
  return pool[Math.floor(rng() * pool.length)];
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
  const { exercises: chosen } = selectExercises(
    pool,
    input,
    recentIds,
    movementCounts,
    wantCount,
    rng,
    false,
    fatigueState,
    {
      blockType: "main_hypertrophy",
      sessionFatigueRegions,
      sessionMovementPatternCounts: movementCounts,
      sessionHasBilateralLowerBody: (movementCounts.get("squat") ?? 0) + (movementCounts.get("hinge") ?? 0) > 0,
      historyContext,
    }
  );

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
      title: "Main hypertrophy",
      reasoning: "Volume-focused work for muscle building.",
      items,
      ...(supersetPairs && supersetPairs.length > 0 ? { supersetPairs } : {}),
      estimated_minutes: durationAwareMinutes,
    },
  ];
}

// --- Endurance / conditioning: short strength superset + conditioning block ---
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
  historyContext?: TrainingHistoryContext
): WorkoutBlock[] {
  const strengthPool = exercises.filter(
    (e) =>
      (e.modality === "strength" || e.modality === "conditioning") &&
      !used.has(e.id) &&
      e.time_cost !== "high" &&
      !(e.exercise_role && MAIN_WORK_EXCLUDED_ROLES.has(e.exercise_role.toLowerCase().replace(/\s/g, "_")))
  );
  const { exercises: two } = selectExercises(
    strengthPool,
    input,
    recentIds,
    movementCounts,
    2,
    rng,
    false,
    fatigueState,
    {
      sessionFatigueRegions,
      sessionMovementPatternCounts: movementCounts,
      sessionHasBilateralLowerBody: (movementCounts.get("squat") ?? 0) + (movementCounts.get("hinge") ?? 0) > 0,
      historyContext,
    }
  );
  const blocks: WorkoutBlock[] = [];
  if (two.length >= 2) {
    two.forEach((e) => used.add(e.id));
    const supportSets = Math.max(1, Math.round(2 * (fatigueVolumeScale ?? 1)));
    const items: WorkoutItem[] = two.map((e) => {
      const p = getPrescription(e, "main_hypertrophy", input.energy_level, input.primary_goal, false, fatigueVolumeScale, input.style_prefs?.user_level);
      return {
        exercise_id: e.id,
        exercise_name: e.name,
        sets: supportSets,
        reps: p.reps ?? 10,
        rest_seconds: 30,
        coaching_cues: p.coaching_cues,
        reasoning_tags: ["conditioning", "strength", ...(e.tags.goal_tags ?? [])],
        unilateral: e.unilateral ?? false,
      };
    });
    blocks.push({
      block_type: "conditioning",
      format: "superset",
      items,
      supersetPairs: items.length >= 2 ? [[items[0], items[1]]] : undefined,
      estimated_minutes: 8,
    });
  }

  const cardioPool = exercises.filter(
    (e) =>
      e.modality === "conditioning" &&
      !used.has(e.id)
  );
  const condMins = getConditioningDurationMinutes(input.primary_goal, input.energy_level)
    ?? input.style_prefs?.conditioning_minutes
    ?? (input.duration_minutes >= 60 ? 30 : 20);
  if (cardioPool.length && condMins > 0) {
    const c = pickConditioningExercise(
      cardioPool,
      input.style_prefs?.preferred_zone2_cardio,
      rng
    );
    if (c) {
      used.add(c.id);
      const p = getPrescription(c, "conditioning", input.energy_level, input.primary_goal, undefined, undefined, input.style_prefs?.user_level);
      const interval = isHighIntensityConditioning(c)
        ? REP_BASED_HIGH_INTENSITY_CONDITIONING_IDS.has(c.id)
          ? getRepBasedHighIntensityConditioningStructure(condMins)
          : getHighIntensityConditioningStructure(condMins)
        : isExplosiveConditioning(c)
          ? getExplosiveConditioningStructure()
          : getConditioningIntervalStructure(condMins, input.primary_goal, c.equipment_required ?? []);
      const condFormat = (interval.format as BlockFormat) ?? (getGoalRules(input.primary_goal).conditioningFormats?.[0]) ?? "straight_sets";
      const workSec = interval.time_seconds ?? (interval.reps != null ? 30 : 0);
      const estimatedMin = isHighIntensityConditioning(c) || isExplosiveConditioning(c)
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

  // #region agent log
  fetch('http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '58db52',
    },
    body: JSON.stringify({
      sessionId: '58db52',
      runId: 'initial',
      hypothesisId: 'H3',
      location: 'logic/workoutGeneration/dailyGenerator.ts:buildMobilityRecoveryMain',
      message: 'mobility/recovery main block pools',
      data: {
        primary_goal: input.primary_goal,
        duration_minutes: input.duration_minutes,
        mobility_pool_count: mobilityPool.length,
        chosen_count: chosen.length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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
    warmup: "Warm-up",
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
export function generateWorkoutSession(
  input: GenerateWorkoutInput,
  exercisePool: Exercise[] = STUB_EXERCISES,
  includeDebug = false
): WorkoutSession {
  const seed = input.seed ?? 0;
  const rng = createSeededRng(seed);

  // 1. Determine goal rules (from prescriptionRules)
  const primary = input.primary_goal;
  const goalRules = getGoalRules(primary);

  // 2. Filter exercises (equipment, injuries, avoid tags, energy)
  const filtered = filterByHardConstraints(exercisePool, input);
  const constraints = resolveWorkoutConstraints(inputToSelectionInput(input));
  const used = new Set<string>();
  const historyContext = input.training_history ?? buildHistoryContextFromLegacy(input);
  const legacyRecentIds = new Set(input.recent_history?.flatMap((h) => h.exercise_ids) ?? []);
  const recentIds = getEffectiveRecentIds(legacyRecentIds, historyContext);
  const movementCounts = new Map<string, number>();

  // #region agent log
  fetch('http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '58db52',
    },
    body: JSON.stringify({
      sessionId: '58db52',
      runId: 'initial',
      hypothesisId: 'H1_H3',
      location: 'logic/workoutGeneration/dailyGenerator.ts:generateWorkoutSession',
      message: 'generateWorkoutSession input + filtered',
      data: {
        primary_goal: input.primary_goal,
        secondary_goals: input.secondary_goals,
        focus_body_parts: input.focus_body_parts,
        duration_minutes: input.duration_minutes,
        energy_level: input.energy_level,
        injuries_or_constraints: input.injuries_or_constraints,
        available_equipment_count: input.available_equipment?.length ?? 0,
        filtered_count: filtered.length,
        constraints_summary: {
          prefer_strength_block: constraints.prefer_strength_block,
          prefer_hypertrophy_block: constraints.prefer_hypertrophy_block,
          prefer_power_block: constraints.prefer_power_block,
          required_conditioning_block: constraints.required_conditioning_block,
          min_cooldown_mobility_exercises: constraints.min_cooldown_mobility_exercises ?? 0,
        },
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  // Fatigue management: volume scale and fatigued muscle groups from recent history
  const fatigueState = getFatigueState(input.recent_history, {
    energy_level: input.energy_level,
  });
  const fatigueVolumeScale = fatigueState.volumeScaleFactor;

  // 3. Build warmup
  const warmup = buildWarmup(filtered, input, used, rng, false, fatigueState, historyContext);
  const blocks: WorkoutBlock[] = [warmup];

  const wantsSupersets = input.style_prefs?.wants_supersets !== false;
  const sessionFatigueRegions = new Map<string, number>();

  // 4. Build main block (goal-specific); session fatigue regions improve later picks
  if (primary === "strength" || primary === "power") {
    blocks.push(...buildMainStrength(filtered, input, used, recentIds, movementCounts, rng, wantsSupersets, fatigueVolumeScale, fatigueState, sessionFatigueRegions, historyContext));
  } else if (primary === "hypertrophy" || primary === "body_recomp" || primary === "calisthenics") {
    blocks.push(...buildMainHypertrophy(filtered, input, used, recentIds, movementCounts, rng, wantsSupersets, fatigueVolumeScale, fatigueState, sessionFatigueRegions, historyContext));
  } else if (primary === "endurance" || primary === "conditioning") {
    blocks.push(...buildEnduranceMain(filtered, input, used, recentIds, movementCounts, rng, fatigueVolumeScale, fatigueState, sessionFatigueRegions, historyContext));
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
          false,
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
          false,
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
          blocks.push({
            block_type: "conditioning",
            format: condFormat,
            title: requiredConditioning
              ? blockTitleForGoal("conditioning", primary, true)
              : blockTitleForGoal("conditioning", primary, false),
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

  // 7. Build cooldown (required-block: mobility secondary goal → min mobility exercises + visible block)
  const mainWorkFamilies = getMainWorkFamiliesFromBlocks(blocks, filtered);
  const cooldown = buildCooldown(filtered, input, used, rng, {
    constraints,
    mainWorkFamilies,
  });
  blocks.push(cooldown);

  // Phase 11: attach progress/maintain/regress/rotate and prescription influence
  attachRecommendationsToSession(blocks, filtered, historyContext, recentIds);

  // 8. Post-assembly validation and repair (Phase 8)
  const sumBlockMinutes = blocks.reduce((sum, b) => sum + (b.estimated_minutes ?? 5), 0);
  const estimated_duration_minutes =
    input.duration_minutes != null && input.duration_minutes > 0
      ? input.duration_minutes
      : sumBlockMinutes;
  const debug = includeDebug
    ? {
        scoring_breakdown: [] as ScoringDebug[],
        seed_used: seed,
      }
    : undefined;

  const session: WorkoutSession = {
    title: sessionTitle(input),
    estimated_duration_minutes,
    blocks,
    debug,
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
  exercisePool: Exercise[] = STUB_EXERCISES,
  includeDebug = false
): WorkoutSession {
  const seed = (input.seed ?? 0) + 1;
  const newInput: GenerateWorkoutInput = { ...input, seed };

  // #region agent log
  fetch('http://127.0.0.1:7432/ingest/35ca614a-496d-4b67-8b19-4e79a0489437', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '58db52',
    },
    body: JSON.stringify({
      sessionId: '58db52',
      runId: 'initial',
      hypothesisId: 'H2',
      location: 'logic/workoutGeneration/dailyGenerator.ts:regenerateWorkoutSession',
      message: 'regenerateWorkoutSession entry',
      data: {
        primary_goal: input.primary_goal,
        mode,
        previous_block_count: previousSession?.blocks?.length ?? 0,
        includeDebug,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (mode === "keep_structure_swap_exercises") {
    return regenerateWithSubstitution(
      input,
      previousSession,
      exercisePool,
      includeDebug
    );
  }

  return generateWorkoutSession(newInput, exercisePool, includeDebug);
}

/**
 * Keep block structure and prescriptions; swap each exercise to a ranked substitute
 * (same pattern/muscles, progressions/regressions) from the filtered pool.
 */
function regenerateWithSubstitution(
  input: GenerateWorkoutInput,
  previousSession: WorkoutSession,
  exercisePool: Exercise[],
  includeDebug: boolean
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
    debug: includeDebug ? { seed_used: input.seed } : undefined,
  };
}
