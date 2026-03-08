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
} from "./fatigueTracking";
import { DEFAULT_SELECTION_CONFIG } from "./scoringConfig";

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

export interface ScoreExerciseInput {
  exercise: ExerciseWithQualities;
  blockQualities: DesiredQualityProfile;
  blockType: string;
  targetMovementPatterns?: string[];
  stimulusProfile: StimulusProfileSlug;
  state: SessionSelectionState;
  config?: SelectionConfig;
  recentExerciseIds: Set<string>;
  fatigueState?: import("../../../lib/generation/fatigueRules").FatigueState;
  avoidTags?: Set<string>;
  avoidExerciseIds?: Set<string>;
  energyLevel?: "low" | "medium" | "high";
  includeBreakdown?: boolean;
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

  let fatiguePenalty = 0;
  if (fatigueState) {
    fatiguePenalty = fatiguePenaltyForExercise(exercise.muscle_groups ?? [], fatigueState);
  }

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
    fatiguePenalty;
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
