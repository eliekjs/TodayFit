/**
 * Alpine sport-main reduced scoring surface: generic terms demoted vs full scorer.
 * Run: npx tsx logic/workoutGeneration/alpineMainReducedScoring.test.ts
 */

import assert from "assert";
import { scoreExercise } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";
import { getAlpineSkiingSlotRuleForBlockType } from "./sportPatternTransfer/alpineSkiingSession";
import type { AlpineSkiingQualityScoreContext } from "./sportPatternTransfer/alpineSkiingQualityScoring";

function mkEx(
  partial: Omit<Exercise, "id" | "name" | "movement_pattern" | "muscle_groups" | "modality" | "equipment_required" | "difficulty" | "time_cost" | "tags"> &
    Pick<Exercise, "id" | "name"> &
    Partial<Exercise>
): Exercise {
  return {
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    modality: "strength",
    equipment_required: ["barbell"],
    difficulty: 3,
    time_cost: "medium",
    tags: { goal_tags: ["strength"], energy_fit: ["medium"] },
    ...partial,
  };
}

const tempoSquat = mkEx({
  id: "tempo_squat_reduced_scoring_test",
  name: "Tempo Back Squat",
  exercise_role: "main_compound",
  tags: { goal_tags: ["strength"], energy_fit: ["medium"], stimulus: ["eccentric"] },
});

/** Generic athletic compound: extra goal tag + power-ish naming without alpine transfer signals. */
const thrusterLike = mkEx({
  id: "ff_barbell_thruster_reduced_test",
  name: "Barbell Thruster",
  exercise_role: "main_compound",
  modality: "strength",
  tags: { goal_tags: ["strength", "conditioning"], energy_fit: ["high"] },
});

function baseInput(): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "high",
    available_equipment: ["barbell", "dumbbells"],
    injuries_or_constraints: [],
    seed: 1,
    sport_slugs: ["alpine_skiing"],
    sport_weight: 0.55,
  };
}

function main() {
  const input = baseInput();
  const rule = getAlpineSkiingSlotRuleForBlockType("main_strength");
  assert(rule, "alpine main rule");
  const qc: AlpineSkiingQualityScoreContext = {
    sessionAlpineCategoryCounts: new Map(),
    emphasisBucket: 0,
    blockType: "main_strength",
  };
  const recent = new Set<string>();
  const movementCounts = new Map<string, number>();

  const baseOpts = {
    blockType: "main_strength" as const,
    alpineSkiingPatternSlotRule: rule,
    alpineSkiingPatternScoreMode: "gated" as const,
    alpineSkiingQualityContext: qc,
  };

  const fullTempo = scoreExercise(tempoSquat, input, recent, movementCounts, undefined, baseOpts).score;
  const fullThruster = scoreExercise(thrusterLike, input, recent, movementCounts, undefined, baseOpts).score;

  const redTempo = scoreExercise(tempoSquat, input, recent, movementCounts, undefined, {
    ...baseOpts,
    sportMainScoringMode: "alpine_reduced_surface",
  }).score;
  const redThruster = scoreExercise(thrusterLike, input, recent, movementCounts, undefined, {
    ...baseOpts,
    sportMainScoringMode: "alpine_reduced_surface",
  }).score;

  const marginFull = fullTempo - fullThruster;
  const marginRed = redTempo - redThruster;
  assert(
    marginRed > marginFull,
    `reduced surface should widen tempo vs generic-athletic margin (full=${marginFull.toFixed(3)}, reduced=${marginRed.toFixed(3)})`
  );
  assert(redTempo > redThruster, "under reduced surface, tempo squat should outscore thruster-like pick");

  const br = scoreExercise(tempoSquat, input, recent, movementCounts, undefined, {
    ...baseOpts,
    sportMainScoringMode: "alpine_reduced_surface",
    include_scoring_breakdown: true,
  }).breakdown;
  assert(br?.sport_main_scoring_mode === "alpine_reduced_surface", "breakdown tags reduced mode");
  assert(br?.sport_main_generic_term_scale === 0.12, "breakdown exposes scale");

  console.log("alpineMainReducedScoring: ok");
}

main();
