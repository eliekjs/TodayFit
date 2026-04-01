/**
 * Intent survival report: stable debug payload when include_intent_survival_report is set.
 * Run: npx tsx logic/workoutGeneration/intentSurvivalInstrumentation.test.ts
 */

import assert from "assert";
import { generateWorkoutSession } from "./dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "./types";

function mkEx(
  partial: Pick<Exercise, "id" | "name"> &
    Partial<Omit<Exercise, "id" | "name" | "movement_pattern" | "muscle_groups" | "modality" | "equipment_required" | "difficulty" | "time_cost" | "tags">> & {
      tags?: Exercise["tags"];
    }
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
  } as Exercise;
}

const tempoSquat = mkEx({
  id: "tempo_squat_intent_survival",
  name: "Tempo Squat",
  exercise_role: "main_compound",
  tags: { goal_tags: ["strength"], energy_fit: ["medium"], stimulus: ["eccentric"] },
});

const lateralLunge = mkEx({
  id: "lateral_lunge_intent_survival",
  name: "Lateral Lunge",
  exercise_role: "accessory",
  movement_pattern: "squat",
});

const strictSquat = mkEx({
  id: "back_squat_intent_survival",
  name: "Back Squat",
  exercise_role: "main_compound",
});

const hiitBike = mkEx({
  id: "hiit_bike_intent_survival",
  name: "Assault Bike",
  movement_pattern: "locomotion",
  modality: "conditioning",
  equipment_required: ["assault_bike"],
  tags: { goal_tags: ["conditioning"], energy_fit: ["high"] },
});

function main() {
  const input: GenerateWorkoutInput = {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["lower"],
    energy_level: "high",
    available_equipment: ["barbell", "dumbbells", "assault_bike", "bench"],
    injuries_or_constraints: [],
    seed: 99,
    sport_slugs: ["alpine_skiing"],
    sport_weight: 0.55,
    include_intent_survival_report: true,
    intent_survival_upstream: {
      source: "intentSurvivalInstrumentation.test",
      session_intent_summary: "Alpine prep — lower strength",
      primitives: { note: "fixture" },
    },
  };

  const pool = [tempoSquat, lateralLunge, strictSquat, hiitBike];
  const session = generateWorkoutSession(input, pool);
  const report = session.debug?.intent_survival_report;
  assert(report, "intent_survival_report should be attached when flag is set");
  assert(report.sport_slug_primary === "alpine_skiing", "primary sport slug");
  assert(report.session_intent_summary?.sport_slugs, "session_intent_summary captures sport_slugs");
  assert(report.upstream?.session_intent_summary?.includes("Alpine"), "upstream summary merged");
  assert(report.selection_passes.length > 0, "at least one selection pass recorded");
  const first = report.selection_passes[0];
  assert(first.slot_type, "pass has slot_type");
  assert(typeof first.sport_gate_applied === "boolean", "sport_gate_applied boolean");
  assert(first.gate_tier_counts?.full_pool_count != null, "gate telemetry when gate snapshot present");
  const passWithTier = report.selection_passes.find((p) => p.sport_pattern_selection_tier != null);
  assert(passWithTier?.sport_pattern_selection_tier, "at least one pass records sport_pattern_selection_tier");
  assert(report.alpine, "alpine block when alpine sport");
  assert(typeof report.alpine.key_coverage_ok_post_repair === "boolean", "coverage flag");
  assert(typeof report.alpine.strict_gate_selection_share === "number", "strict share");
  assert(typeof report.alpine.anchors_post_repair.eccentric_or_decel_anchor_in_main === "boolean", "anchor flags");

  console.log("intentSurvivalInstrumentation: ok");
}

main();
