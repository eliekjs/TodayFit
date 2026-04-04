/**
 * Readable sample outputs for rock_climbing sport-prep sessions.
 * Run: npx tsx scripts/print-rock-climbing-workouts.ts
 */

import { EXERCISES } from "../data/exercisesMerged";
import { exerciseDefinitionToGeneratorExercise } from "../lib/dailyGeneratorAdapter";
import { BLOCKED_EXERCISE_IDS } from "../lib/workoutRules";
import { generateWorkoutSession } from "../logic/workoutGeneration/dailyGenerator";
import type { Exercise, GenerateWorkoutInput } from "../logic/workoutGeneration/types";
import { sessionIntentContractForSportSlug } from "../logic/workoutGeneration/sessionIntentContract";

function pool(): Exercise[] {
  return EXERCISES.filter((d) => !BLOCKED_EXERCISE_IDS.has(d.id)).map(exerciseDefinitionToGeneratorExercise);
}

function printSession(label: string, input: GenerateWorkoutInput) {
  const session = generateWorkoutSession(input, pool());
  console.log("\n" + "=".repeat(72));
  console.log(label);
  console.log("=".repeat(72));
  console.log("Title:", session.title);
  const gate = session.debug?.sport_pattern_transfer?.enforcement_snapshot?.main_strength;
  console.log("Main-strength gate tier:", gate?.selectionTier ?? gate?.poolMode ?? "n/a (hypertrophy-only session)");
  console.log("Full-pool fallback:", gate?.usedFullPoolFallback ?? false);
  for (const b of session.blocks) {
    if (b.block_type === "warmup" || b.block_type === "cooldown") continue;
    const names = b.items.map((i) => i.exercise_name).join(", ");
    console.log(`  [${b.block_type}] ${names}`);
  }
  const sel = session.debug?.main_selector?.entries ?? [];
  if (sel.length) {
    console.log("Selector trace:", sel.map((e) => `${e.phase}=${e.selector}`).join(" | "));
  }
}

const contract = sessionIntentContractForSportSlug("rock_climbing")!;

printSession("Strength 45 · upper_pull · intent report", {
  duration_minutes: 45,
  primary_goal: "strength",
  focus_body_parts: ["upper_pull"],
  energy_level: "medium",
  available_equipment: ["barbell", "dumbbells", "cable_machine", "pull_up_bar", "bench", "bodyweight"],
  injuries_or_constraints: [],
  seed: 42,
  sport_slugs: ["rock_climbing"],
  sport_weight: 0.62,
  session_intent_contract: contract,
  include_intent_survival_report: true,
});

printSession("Hypertrophy 60 · sport-owned volume", {
  duration_minutes: 60,
  primary_goal: "hypertrophy",
  focus_body_parts: ["upper_pull"],
  energy_level: "medium",
  available_equipment: ["dumbbells", "cable_machine", "pull_up_bar", "bench", "bodyweight"],
  injuries_or_constraints: [],
  seed: 43,
  sport_slugs: ["rock_climbing"],
  sport_weight: 0.55,
  session_intent_contract: contract,
  goal_sub_focus: { muscle: ["back"] },
});

console.log("\nDone.\n");
