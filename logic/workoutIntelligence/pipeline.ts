/**
 * Generator pipeline scaffold: high-level flow for quality-based workout generation.
 * This module composes target vector, template, scoring, and block building.
 * Integrate with logic/workoutGeneration/dailyGenerator for full session output.
 */

import type { SessionTargetVector } from "./types";
import type { ExerciseWithQualities } from "./types";
import type { SessionTemplate } from "./types";
import { mergeTargetVector } from "./targetVector";
import { getTemplateForGoalAndDuration } from "./sessionTemplates";
import { scoreExercise } from "./scoring/scoreExercise";
import type { FatigueState } from "../../lib/generation/fatigueRules";
import { getFatigueState } from "../../lib/generation/fatigueRules";
import { MAX_SAME_PATTERN_PER_SESSION } from "../../lib/workoutRules";

export type PipelineInput = {
  primary_goal: string;
  secondary_goals?: string[];
  sport_slugs?: string[];
  duration_minutes: number;
  energy_level: "low" | "medium" | "high";
  recent_exercise_ids?: string[];
  recent_history?: { exercise_ids: string[]; muscle_groups: string[]; modality: string }[];
  goal_weights?: number[];
  sport_weight?: number;
};

export type PipelineContext = {
  targetVector: SessionTargetVector;
  template: SessionTemplate;
  fatigueState: FatigueState;
  recentIds: Set<string>;
  movementPatternCounts: Map<string, number>;
};

/**
 * Build pipeline context from user input. Call this once per session, then pass context to block builders.
 */
export function buildPipelineContext(
  input: PipelineInput,
  exercisePool: ExerciseWithQualities[]
): PipelineContext {
  const targetVector = mergeTargetVector({
    primary_goal: input.primary_goal,
    secondary_goals: input.secondary_goals,
    sport_slugs: input.sport_slugs,
    goal_weights: input.goal_weights,
    sport_weight: input.sport_weight,
  });

  const template = getTemplateForGoalAndDuration(
    input.primary_goal,
    input.duration_minutes
  );

  const fatigueState = getFatigueState(input.recent_history, {
    energy_level: input.energy_level,
  });

  const recentIds = new Set(input.recent_exercise_ids ?? input.recent_history?.flatMap((h) => h.exercise_ids) ?? []);

  const movementPatternCounts = new Map<string, number>();

  return {
    targetVector,
    template,
    fatigueState,
    recentIds,
    movementPatternCounts,
  };
}

/**
 * Score and sort candidates for a block. Returns exercises sorted by score (best first).
 * Caller is responsible for applying hard filters (equipment, injuries) before passing candidates.
 */
export function scoreAndRankCandidates(
  candidates: ExerciseWithQualities[],
  context: PipelineContext,
  options: {
    blockType?: string;
    durationMinutes?: number;
    energyLevel?: "low" | "medium" | "high";
    includeBreakdown?: boolean;
  }
): { exercise: ExerciseWithQualities; score: number; breakdown?: import("./types").ExerciseScoreBreakdown }[] {
  const scored = candidates.map((ex) => {
    const { score, breakdown } = scoreExercise({
      exercise: ex,
      targetVector: context.targetVector,
      movementPatternCounts: context.movementPatternCounts,
      recentExerciseIds: context.recentIds,
      blockType: options.blockType,
      durationMinutes: options.durationMinutes,
      energyLevel: options.energyLevel,
      fatigueState: context.fatigueState,
      includeBreakdown: options.includeBreakdown,
    });
    return { exercise: ex, score, breakdown };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * After selecting an exercise, update context (movement pattern count, optional used set).
 * Mutates context.
 */
export function consumeExerciseInContext(
  context: PipelineContext,
  exercise: ExerciseWithQualities,
  usedIds?: Set<string>
): void {
  const pattern = exercise.movement_pattern;
  context.movementPatternCounts.set(
    pattern,
    (context.movementPatternCounts.get(pattern) ?? 0) + 1
  );
  if (usedIds) usedIds.add(exercise.id);
}

/**
 * Check whether adding one more exercise of this pattern would exceed session cap.
 */
export function wouldExceedPatternCap(
  context: PipelineContext,
  pattern: string
): boolean {
  const count = context.movementPatternCounts.get(pattern) ?? 0;
  return count >= MAX_SAME_PATTERN_PER_SESSION;
}
