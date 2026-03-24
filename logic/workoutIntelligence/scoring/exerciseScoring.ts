/**
 * Phase 4: MVP exercise scoring for selection engine.
 * Combines target quality alignment, stimulus fit, movement fit, fatigue fit,
 * energy fit, injury fit, novelty, equipment fit, balance.
 */

import type { ExerciseWithQualities } from "../types";
import type { StimulusProfileSlug } from "../types";
import type { SessionSelectionState, ScoreBreakdown, SelectionConfig } from "./scoreTypes";
import type { DesiredQualityProfile } from "./scoreTypes";
import { alignmentScore } from "../targetVector";
import { getStimulusProfile } from "../stimulusProfiles";
import { balanceBonusForExercise } from "../../../lib/generation/movementBalance";
import { BALANCE_CATEGORY_PATTERNS } from "../../../lib/workoutRules";
import { fatiguePenaltyForExercise } from "../../../lib/generation/fatigueRules";
import { noveltyScore } from "./redundancy";
import {
  wouldExceedSessionFatigue,
  exerciseFatigueContribution,
  getEffectiveFatigueRegionsForQualities,
} from "./fatigueTracking";
import { DEFAULT_SELECTION_CONFIG } from "./scoringConfig";
import { getCanonicalSportSlug } from "../../../data/sportSubFocus";
import { SUB_FOCUS_TAG_MAP } from "../../../data/sportSubFocus/subFocusTagMap";
import { getSportQualityWeights } from "../sportQualityWeights";

/** Convert DesiredQualityProfile to Map for alignmentScore. */
function profileToMap(p: DesiredQualityProfile): Map<string, number> {
  const m = new Map<string, number>();
  for (const [k, v] of Object.entries(p.weights ?? {})) {
    if (typeof v === "number") m.set(k, v);
  }
  return m as Map<import("../trainingQualities").TrainingQualitySlug, number>;
}

/** Stimulus fit: how well exercise fits the session stimulus. */
function stimulusFitScore(
  exercise: ExerciseWithQualities,
  stimulusProfile: StimulusProfileSlug,
  blockType: string
): number {
  const profile = getStimulusProfile(stimulusProfile);
  const mod = (exercise.modality ?? "").toLowerCase();
  const cost = exercise.fatigue_cost ?? "medium";
  const quality = exercise.training_quality_weights ?? {};

  if (stimulusProfile === "power_speed") {
    if (cost === "high") return -1;
    const hasPower = Object.keys(quality).some((k) => k.includes("power") || k.includes("rate_of_force"));
    if (hasPower) return 1;
    if (mod === "power") return 1;
    return 0;
  }
  if (stimulusProfile === "max_strength") {
    if (blockType === "main_strength" && (mod === "strength" || mod === "power")) return 1;
    if (cost === "high" && blockType === "main_strength") return 0.5;
    return 0;
  }
  if (stimulusProfile === "hypertrophy_accumulation") {
    if (mod === "hypertrophy" || mod === "strength") return 0.5;
    return 0;
  }
  if (stimulusProfile === "mobility_recovery" || stimulusProfile === "resilience_stability") {
    if (mod === "mobility" || mod === "recovery") return 1;
    if (cost === "low") return 0.5;
    return 0;
  }
  return 0;
}

/** Movement pattern fit: block target patterns vs exercise pattern. */
function movementPatternFit(
  exercise: ExerciseWithQualities,
  targetPatterns: string[] | undefined
): number {
  if (!targetPatterns?.length) return 0;
  const p = exercise.movement_pattern ?? "";
  return targetPatterns.includes(p) ? 1 : 0;
}

/** Fatigue fit: prefer exercises that don't blow the budget. */
function fatigueFitScore(
  exercise: ExerciseWithQualities,
  state: SessionSelectionState
): number {
  if (wouldExceedSessionFatigue(state, exercise)) return -2;
  const remaining = state.session_fatigue_budget - state.accumulated_fatigue;
  const cost = exerciseFatigueContribution(exercise);
  if (remaining < 4 && cost >= 3) return -0.5;
  return 0;
}

/** Injury fit: penalty if exercise conflicts with limitations (filter should have removed; this is extra penalty). */
function injuryFitScore(
  exercise: ExerciseWithQualities,
  avoidTags: Set<string>,
  avoidIds: Set<string>
): number {
  if (avoidIds.has(exercise.id)) return -5;
  const tags = exercise.joint_stress ?? [];
  for (const t of tags) {
    if (avoidTags.has(t)) return -3;
  }
  return 0;
}

// --- Phase 9/10: ontology-aware scoring (canonical normalization) ---
import {
  getCanonicalExerciseRole,
  getCanonicalMovementFamilies,
  getCanonicalJointStressTags,
} from "../../workoutGeneration/ontologyNormalization";

function norm(s: string | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\s/g, "_");
}
const ROLE_MAIN_PREFERRED = new Set(["main_compound", "secondary_compound"]);
const ROLE_MAIN_ACCEPTABLE = new Set(["accessory", "isolation", "finisher"]);
const ROLE_MAIN_PENALIZED = new Set(["cooldown", "stretch", "mobility", "breathing", "warmup"]);
const ROLE_WARMUP_PREFERRED = new Set(["prep", "warmup", "mobility", "activation", "mobility_prep"]);
const ROLE_COOLDOWN_PREFERRED = new Set(["cooldown", "stretch", "breathing", "mobility"]);

function toNormalizationAdapter(ex: ExerciseWithQualities) {
  return {
    id: ex.id,
    movement_pattern: ex.movement_pattern,
    muscle_groups: ex.muscle_groups,
    primary_movement_family: ex.primary_movement_family,
    secondary_movement_families: ex.secondary_movement_families,
    movement_patterns: ex.movement_patterns,
    exercise_role: ex.exercise_role,
    pairing_category: ex.pairing_category,
    fatigue_regions: ex.fatigue_regions,
    mobility_targets: ex.mobility_targets,
    stretch_targets: ex.stretch_targets,
    joint_stress_tags: ex.joint_stress_tags,
    tags: { joint_stress: ex.joint_stress ?? [], stimulus: [] },
    unilateral: ex.unilateral,
  };
}

function ontologyRoleFitScore(ex: ExerciseWithQualities, blockType: string): number {
  const role = getCanonicalExerciseRole(toNormalizationAdapter(ex));
  const bt = norm(blockType);
  if (bt === "main_strength" || bt === "main_hypertrophy") {
    if (role && ROLE_MAIN_PENALIZED.has(role)) return -3;
    if (role && ROLE_MAIN_PREFERRED.has(role)) return 2;
    if (role && ROLE_MAIN_ACCEPTABLE.has(role)) return 0.5;
    return 0;
  }
  if (bt === "warmup" && role && ROLE_WARMUP_PREFERRED.has(role)) return 1.5;
  if (bt === "cooldown" && role && ROLE_COOLDOWN_PREFERRED.has(role)) return 1.5;
  return 0;
}

function ontologyFatigueBalanceScore(ex: ExerciseWithQualities, fatigueRegionCounts: Map<string, number>): number {
  if (!fatigueRegionCounts?.size) return 0;
  const regions = getEffectiveFatigueRegionsForQualities(ex);
  if (!regions.length) return 0;
  let overlap = 0;
  for (const r of regions) overlap += fatigueRegionCounts.get(r) ?? 0;
  if (overlap === 0) return 0.5;
  if (overlap >= 3) return -1;
  if (overlap >= 1) return -0.3;
  return 0;
}

function ontologyAnchorFitScore(ex: ExerciseWithQualities, blockType: string, bodyRegionFocus: string[] | undefined): number {
  if (blockType !== "main_strength" && blockType !== "main_hypertrophy") return 0;
  const adapter = toNormalizationAdapter(ex);
  const role = getCanonicalExerciseRole(adapter);
  const { primary } = getCanonicalMovementFamilies(adapter);
  const focusSet = bodyRegionFocus?.length ? new Set(bodyRegionFocus.map(norm)) : null;
  if (role && ROLE_MAIN_PREFERRED.has(role)) {
    if (!focusSet || (primary && focusSet.has(primary))) return 2;
    return 1.2;
  }
  if (primary && focusSet?.has(primary)) return 0.8;
  return 0;
}

function ontologyJointStressSoftScore(ex: ExerciseWithQualities): number {
  const tags = getCanonicalJointStressTags(toNormalizationAdapter(ex));
  return tags.length ? -0.2 : 0;
}

function normalizedMuscles(ex: ExerciseWithQualities): Set<string> {
  return new Set((ex.muscle_groups ?? []).map((m) => m.toLowerCase()));
}

function isUpperPullFocused(ex: ExerciseWithQualities): boolean {
  const pattern = norm(ex.movement_pattern);
  if (pattern === "pull" || pattern === "vertical_pull" || pattern === "horizontal_pull") return true;
  const patterns = (ex.movement_patterns ?? []).map(norm);
  if (patterns.includes("vertical_pull") || patterns.includes("horizontal_pull")) return true;
  const muscles = normalizedMuscles(ex);
  return (
    muscles.has("back") ||
    muscles.has("lats") ||
    muscles.has("biceps") ||
    muscles.has("forearms")
  );
}

function isCoreOrScapSupport(ex: ExerciseWithQualities): boolean {
  const q = ex.training_quality_weights ?? {};
  return Boolean(
    q.core_tension ||
    q.trunk_endurance ||
    q.scapular_stability ||
    q.lockoff_strength ||
    q.grip_strength ||
    q.forearm_endurance
  );
}

function isLowerBodyPattern(ex: ExerciseWithQualities): boolean {
  const pattern = norm(ex.movement_pattern);
  if (pattern === "squat" || pattern === "hinge" || pattern === "lunge" || pattern === "locomotion") return true;
  const muscles = normalizedMuscles(ex);
  return (
    muscles.has("quads") ||
    muscles.has("quad") ||
    muscles.has("hamstrings") ||
    muscles.has("hamstring") ||
    muscles.has("glutes") ||
    muscles.has("legs")
  );
}

function isPosteriorLowerSupport(ex: ExerciseWithQualities): boolean {
  const pattern = norm(ex.movement_pattern);
  const q = ex.training_quality_weights ?? {};
  const muscles = normalizedMuscles(ex);
  return (
    pattern === "hinge" ||
    Boolean(q.posterior_chain_endurance || q.unilateral_strength || q.hip_stability) ||
    muscles.has("hamstrings") ||
    muscles.has("hamstring") ||
    muscles.has("glutes")
  );
}

function addTag(tagSet: Set<string>, raw: string | undefined): void {
  const t = norm(raw);
  if (t) tagSet.add(t);
}

function addWithAliases(tagSet: Set<string>, raw: string | undefined): void {
  const t = norm(raw);
  if (!t) return;
  tagSet.add(t);
  if (t === "squat" || t === "hinge" || t === "lunge" || t === "pull" || t === "push") {
    tagSet.add(`${t}_pattern`);
  }
  if (t === "vertical_pull" || t === "horizontal_pull") {
    tagSet.add("pulling_strength");
    tagSet.add("pull_strength");
  }
  if (t === "vertical_push" || t === "horizontal_push") {
    tagSet.add("pushing_strength");
  }
}

function getExerciseAssociationTags(ex: ExerciseWithQualities): Set<string> {
  const tags = new Set<string>();
  addWithAliases(tags, ex.movement_pattern);
  for (const p of ex.movement_patterns ?? []) addWithAliases(tags, p);
  for (const m of ex.muscle_groups ?? []) addWithAliases(tags, m);
  for (const q of Object.keys(ex.training_quality_weights ?? {})) addWithAliases(tags, q);
  for (const a of ex.attribute_tags ?? []) addWithAliases(tags, a);
  addWithAliases(tags, ex.modality);

  if (isUpperPullFocused(ex)) {
    addTag(tags, "upper_pull");
    addTag(tags, "pull_strength");
  }
  if (isCoreOrScapSupport(ex)) {
    addTag(tags, "core_stability");
    addTag(tags, "scapular_control");
  }
  if (isLowerBodyPattern(ex)) {
    addTag(tags, "lower_body");
  }
  if (isPosteriorLowerSupport(ex)) {
    addTag(tags, "posterior_chain");
  }
  return tags;
}

function getSportDemandTags(
  sports?: string[],
  sportSubFocus?: Record<string, string[]>
): Map<string, number> {
  const demand = new Map<string, number>();
  const addDemand = (tag: string, weight: number) => {
    const t = norm(tag);
    if (!t || weight <= 0) return;
    demand.set(t, (demand.get(t) ?? 0) + weight);
  };

  const subFocusByCanonical = new Map<string, Set<string>>();
  for (const [sportSlug, subFocuses] of Object.entries(sportSubFocus ?? {})) {
    const canonical = getCanonicalSportSlug(sportSlug);
    const set = subFocusByCanonical.get(canonical) ?? new Set<string>();
    for (const sf of subFocuses ?? []) set.add(sf);
    subFocusByCanonical.set(canonical, set);
  }
  for (const sportSlug of sports ?? []) {
    const canonical = getCanonicalSportSlug(sportSlug);
    if (!subFocusByCanonical.has(canonical)) subFocusByCanonical.set(canonical, new Set<string>());
  }

  for (const [sportSlug, subFocuses] of subFocusByCanonical.entries()) {
    if (subFocuses.size > 0) {
      for (const subFocus of subFocuses) {
        const key = `${sportSlug}:${subFocus}`;
        for (const entry of SUB_FOCUS_TAG_MAP[key] ?? []) {
          addDemand(entry.tag_slug, entry.weight ?? 1);
        }
      }
      continue;
    }

    // Fallback when the sport is selected without explicit sub-focuses:
    // lean on the sport's quality weights as demand tags.
    for (const [quality, weight] of Object.entries(getSportQualityWeights(sportSlug))) {
      if (typeof weight === "number" && weight > 0) addDemand(quality, weight);
    }
  }

  return demand;
}

function sportTransferScore(
  ex: ExerciseWithQualities,
  sports?: string[],
  sportSubFocus?: Record<string, string[]>,
  blockType?: string
): number {
  const demandTags = getSportDemandTags(sports, sportSubFocus);
  if (!demandTags.size) return 0;

  const exerciseTags = getExerciseAssociationTags(ex);
  let matchedWeight = 0;
  let totalWeight = 0;
  for (const [tag, weight] of demandTags.entries()) {
    totalWeight += weight;
    if (exerciseTags.has(tag)) matchedWeight += weight;
  }
  if (totalWeight <= 0) return 0;

  const matchRatio = matchedWeight / totalWeight;
  const block = norm(blockType);
  const inMainWork = block === "main_strength" || block === "main_hypertrophy" || block === "accessory";
  const scale = inMainWork ? 3.4 : 2.2;
  const noMatchPenalty = inMainWork ? -1.2 : -0.4;
  if (matchRatio < 0.08) return noMatchPenalty;
  return scale * (matchRatio - 0.2);
}

export interface ScoreExerciseInput {
  exercise: ExerciseWithQualities;
  blockQualities: DesiredQualityProfile;
  blockType: string;
  targetMovementPatterns?: string[];
  /** Optional selected sports for sport-specific transfer scoring. */
  sports?: string[];
  /** Optional selected sport sub-focuses; used when explicit sports are absent. */
  sportSubFocus?: Record<string, string[]>;
  stimulusProfile: StimulusProfileSlug;
  state: SessionSelectionState;
  config?: SelectionConfig;
  recentExerciseIds: Set<string>;
  fatigueState?: import("../../../lib/generation/fatigueRules").FatigueState;
  avoidTags?: Set<string>;
  avoidExerciseIds?: Set<string>;
  energyLevel?: "low" | "medium" | "high";
  includeBreakdown?: boolean;
  /** Phase 9: body region focus for movement family / anchor fit. */
  bodyRegionFocus?: string[];
}

/**
 * Score a single exercise for selection. Returns total score and optional breakdown.
 */
export function scoreExerciseForSelection(input: ScoreExerciseInput): {
  score: number;
  breakdown?: ScoreBreakdown;
} {
  const {
    exercise,
    blockQualities,
    blockType,
    targetMovementPatterns,
    stimulusProfile,
    state,
    recentExerciseIds,
    fatigueState,
    avoidTags = new Set(),
    avoidExerciseIds = new Set(),
    includeBreakdown,
    sports,
    sportSubFocus,
  } = input;

  const cfg = input.config ?? DEFAULT_SELECTION_CONFIG;
  const w = cfg.weights;
  const breakdown: ScoreBreakdown = {
    exercise_id: exercise.id,
    total: 0,
    target_quality_alignment: 0,
  };

  const targetMap = profileToMap(blockQualities);
  const alignment = targetMap.size > 0
    ? alignmentScore(
        exercise.training_quality_weights ?? {},
        targetMap as import("../types").SessionTargetVector
      )
    : 0;
  const alignmentScoreVal = w.target_quality_alignment * alignment;
  breakdown.target_quality_alignment = alignmentScoreVal;

  const stimulus = stimulusFitScore(exercise, stimulusProfile, blockType);
  breakdown.stimulus_fit = w.stimulus_fit * stimulus;

  const movementFit = movementPatternFit(exercise, targetMovementPatterns);
  breakdown.movement_pattern_fit = w.movement_pattern_fit * movementFit;

  const fatigueFit = fatigueFitScore(exercise, state);
  breakdown.fatigue_fit = w.fatigue_fit * fatigueFit;

  const energyLevel = input.energyLevel ?? "medium";
  let energyFit = 0;
  if (exercise.energy_fit?.includes(energyLevel)) energyFit += 1;
  if (energyLevel === "low" && (exercise.skill_level ?? 0) >= 4) {
    energyFit += cfg.low_energy_high_skill_penalty;
  }
  breakdown.energy_fit = w.energy_fit * energyFit;

  const injury = injuryFitScore(exercise, avoidTags, avoidExerciseIds);
  breakdown.injury_fit = injury < 0 ? w.injury_fit : 0;

  const novelty = noveltyScore(exercise, state, recentExerciseIds, {
    novelty_penalty: w.novelty_penalty,
    max_same_pattern_per_session: cfg.max_same_pattern_per_session,
  });
  breakdown.novelty_fit = novelty;

  let equipmentFit = 0;
  const req = exercise.equipment_required ?? [];
  if (req.length === 0) equipmentFit = 0.5;
  breakdown.equipment_fit = w.equipment_fit * equipmentFit;

  const balance = balanceBonusForExercise(
    exercise.movement_pattern ?? "",
    state.movement_pattern_counts,
    3,
    [...BALANCE_CATEGORY_PATTERNS]
  );
  const balanceVal = w.balance_bonus * balance;
  const transferVal = sportTransferScore(exercise, sports, sportSubFocus, blockType);

  let fatiguePenalty = 0;
  if (fatigueState) {
    fatiguePenalty = fatiguePenaltyForExercise(exercise.muscle_groups ?? [], fatigueState);
  }

  // Phase 9: ontology-aware components (additive; fallback when ontology absent)
  const fatigueRegionCounts = state.fatigue_region_counts ?? new Map<string, number>();
  const ontologyRole = ontologyRoleFitScore(exercise, blockType);
  const ontologyFatigue = ontologyFatigueBalanceScore(exercise, fatigueRegionCounts);
  const ontologyAnchor = ontologyAnchorFitScore(exercise, blockType, input.bodyRegionFocus);
  const ontologyJoint = ontologyJointStressSoftScore(exercise);
  const wRole = w.ontology_role_fit ?? 1.5;
  const wFatigue = w.ontology_fatigue_balance ?? 1.0;
  const wAnchor = w.ontology_anchor_fit ?? 1.2;
  const wJoint = w.ontology_joint_stress_soft ?? 1.0;
  breakdown.ontology_role_fit = wRole * ontologyRole;
  breakdown.ontology_fatigue_balance = wFatigue * ontologyFatigue;
  breakdown.ontology_main_lift_anchor = wAnchor * ontologyAnchor;
  breakdown.ontology_joint_stress_soft = wJoint * ontologyJoint;

  const total =
    alignmentScoreVal +
    (breakdown.stimulus_fit ?? 0) +
    (breakdown.movement_pattern_fit ?? 0) +
    (breakdown.fatigue_fit ?? 0) +
    (breakdown.energy_fit ?? 0) +
    (breakdown.injury_fit ?? 0) +
    (breakdown.novelty_fit ?? 0) +
    (breakdown.equipment_fit ?? 0) +
    balanceVal +
    transferVal +
    fatiguePenalty +
    (breakdown.ontology_role_fit ?? 0) +
    (breakdown.ontology_fatigue_balance ?? 0) +
    (breakdown.ontology_main_lift_anchor ?? 0) +
    (breakdown.ontology_joint_stress_soft ?? 0);
  breakdown.total = total;

  return {
    score: total,
    breakdown: includeBreakdown ? breakdown : undefined,
  };
}

/**
 * Score and rank candidates. Uses DEFAULT_SELECTION_CONFIG if config not provided.
 */
export function scoreAndRankCandidatesForSelection(
  candidates: ExerciseWithQualities[],
  input: Omit<ScoreExerciseInput, "exercise">,
  config: SelectionConfig = DEFAULT_SELECTION_CONFIG
): { exercise: ExerciseWithQualities; score: number; breakdown?: ScoreBreakdown }[] {
  const scored = candidates.map((ex) => {
    const { score, breakdown } = scoreExerciseForSelection({
      ...input,
      exercise: ex,
      config,
    });
    return { exercise: ex, score, breakdown };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}
