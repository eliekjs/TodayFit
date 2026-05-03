/**
 * Rock climbing sport-owned scoring and picking within an already gated pool.
 */

import { MAX_SAME_PATTERN_PER_SESSION } from "../../../lib/workoutRules";
import { getSimilarExerciseClusterId } from "../../../lib/workoutRules";
import {
  addExerciseToRockSessionCounts,
  computeRockClimbingWithinPoolQualityScore,
} from "../sportPatternTransfer/rockClimbingQualityScoring";
import { exerciseMatchesAnyRockClimbingCategory } from "../sportPatternTransfer/rockClimbingExerciseCategories";
import type { SessionIntentContract } from "../sessionIntentContract";
import type { Exercise } from "../types";
import type { GenerateWorkoutInput } from "../types";
import type { FatigueState } from "../../../lib/generation/fatigueRules";
import type { TrainingHistoryContext } from "../historyTypes";
import type { SessionTargetVector } from "../../workoutIntelligence/types";
import type { AlpinePickEnvironment, ScoreExerciseLike } from "./types";

const MAX_CONSECUTIVE_SAME_CLUSTER = 2;

function wouldBeThreeSameClusterInARow(chosen: Exercise[], candidate: Exercise): boolean {
  if (chosen.length < MAX_CONSECUTIVE_SAME_CLUSTER) return false;
  const cluster = getSimilarExerciseClusterId(candidate);
  const last = getSimilarExerciseClusterId(chosen[chosen.length - 1]);
  const prev = getSimilarExerciseClusterId(chosen[chosen.length - 2]);
  return last === cluster && prev === cluster;
}

const WITHIN_POOL_WEIGHT = 2.5;
const CONTRACT_PREFER_BONUS = 0.55;
const CONTRACT_AVOID_PENALTY = 0.95;

export function climbingOwnedCompositeScore(
  exercise: Exercise,
  input: GenerateWorkoutInput,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  fatigueState: FatigueState | undefined,
  scoreExercise: ScoreExerciseLike,
  ctx: {
    blockType: "main_strength" | "main_hypertrophy";
    sessionFatigueRegions?: Map<string, number>;
    historyContext?: TrainingHistoryContext;
    sessionTargetVector?: SessionTargetVector;
    rockQualityCtx: {
      sessionRockCategoryCounts: Map<string, number>;
      emphasisBucket: number;
    };
    contract: SessionIntentContract;
  }
): number {
  const q = computeRockClimbingWithinPoolQualityScore(exercise, {
    ...ctx.rockQualityCtx,
    blockType: ctx.blockType,
  });

  const reduced =
    input.use_reduced_surface_for_rock_climbing_main_scoring !== false ? ("rock_reduced_surface" as const) : undefined;

  const base = scoreExercise(exercise, input, recentIds, movementCounts, fatigueState, {
    blockType: ctx.blockType,
    sessionFatigueRegions: ctx.sessionFatigueRegions,
    sessionMovementPatternCounts: movementCounts,
    sessionHasBilateralLowerBody: (movementCounts.get("squat") ?? 0) + (movementCounts.get("hinge") ?? 0) > 0,
    historyContext: ctx.historyContext,
    sessionTargetVector: ctx.sessionTargetVector,
    sportMainScoringMode: reduced,
  }).score;

  let contractAdj = 0;
  const prefer = ctx.contract.preferCategories;
  if (prefer.length && exerciseMatchesAnyRockClimbingCategory(exercise, prefer)) {
    contractAdj += CONTRACT_PREFER_BONUS;
  }
  const avoid = ctx.contract.avoidCategories;
  if (avoid.length && exerciseMatchesAnyRockClimbingCategory(exercise, avoid)) {
    contractAdj -= CONTRACT_AVOID_PENALTY;
  }

  return q.total * WITHIN_POOL_WEIGHT + base + contractAdj;
}

export function climbingOwnedPickMany(
  pool: Exercise[],
  count: number,
  input: GenerateWorkoutInput,
  recentIds: Set<string>,
  movementCounts: Map<string, number>,
  fatigueState: FatigueState | undefined,
  rng: () => number,
  scoreExercise: ScoreExerciseLike,
  scoringCtx: {
    blockType: "main_strength" | "main_hypertrophy";
    sessionFatigueRegions?: Map<string, number>;
    historyContext?: TrainingHistoryContext;
    sessionTargetVector?: SessionTargetVector;
    emphasisBucket: number;
    contract: SessionIntentContract;
  },
  sportPatCounts: Map<string, number>,
  pickEnv: AlpinePickEnvironment,
  options?: { trackRockCounts?: boolean }
): Exercise[] {
  const chosen: Exercise[] = [];
  const track = options?.trackRockCounts !== false;
  const tierBand = 5.5;
  const maxRounds = Math.max(pool.length * 4, 24);

  for (let round = 0; chosen.length < count && round < maxRounds; round++) {
    const remaining = pool.filter((e) => !chosen.some((c) => c.id === e.id));
    if (remaining.length === 0) break;

    const rockQualityCtx = {
      sessionRockCategoryCounts: sportPatCounts,
      emphasisBucket: scoringCtx.emphasisBucket,
    };

    const scored = remaining.map((e) => ({
      exercise: e,
      score: climbingOwnedCompositeScore(e, input, recentIds, movementCounts, fatigueState, scoreExercise, {
        blockType: scoringCtx.blockType,
        sessionFatigueRegions: scoringCtx.sessionFatigueRegions,
        historyContext: scoringCtx.historyContext,
        sessionTargetVector: scoringCtx.sessionTargetVector,
        rockQualityCtx,
        contract: scoringCtx.contract,
      }),
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
      if (!pickEnv.validateCandidate(chosen, item.exercise)) continue;

      chosen.push(item.exercise);
      pickEnv.onMovementCountCommit(item.exercise);
      if (track) addExerciseToRockSessionCounts(item.exercise, sportPatCounts);
      if (scoringCtx.sessionFatigueRegions) pickEnv.onFatigueRegionCommit?.(item.exercise);
      picked = true;
    }

    if (!picked) {
      for (const { exercise } of topOverall) {
        if (chosen.some((c) => c.id === exercise.id)) continue;
        const nextCount = (movementCounts.get(exercise.movement_pattern) ?? 0) + 1;
        if (nextCount > MAX_SAME_PATTERN_PER_SESSION) continue;
        if (wouldBeThreeSameClusterInARow(chosen, exercise)) continue;
        if (!pickEnv.validateCandidate(chosen, exercise)) continue;
        chosen.push(exercise);
        pickEnv.onMovementCountCommit(exercise);
        if (track) addExerciseToRockSessionCounts(exercise, sportPatCounts);
        if (scoringCtx.sessionFatigueRegions) pickEnv.onFatigueRegionCommit?.(exercise);
        picked = true;
        break;
      }
    }
    if (!picked) break;
  }

  return chosen.slice(0, count);
}
