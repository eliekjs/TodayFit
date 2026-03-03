/**
 * Seed test harness for the daily workout generator.
 * Run with: npx tsx logic/workoutGeneration/seedTest.ts
 * Or: node --loader ts-node/esm logic/workoutGeneration/seedTest.ts
 */

import { generateWorkoutSession, regenerateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput, WorkoutSession } from "./types";

function printSession(session: WorkoutSession, label: string) {
  console.log("\n" + "=".repeat(60));
  console.log(label);
  console.log("=".repeat(60));
  console.log(`Title: ${session.title}`);
  console.log(`Estimated duration: ${session.estimated_duration_minutes} min`);
  if (session.debug?.seed_used != null) {
    console.log(`Seed: ${session.debug.seed_used}`);
  }
  for (const block of session.blocks) {
    console.log("\n--- " + block.block_type.toUpperCase() + " (" + block.format + ") ---");
    if (block.estimated_minutes) {
      console.log(`  (~${block.estimated_minutes} min)`);
    }
    for (const item of block.items) {
      const presc = item.reps != null ? `${item.sets} x ${item.reps} reps` : `${item.sets} x ${item.time_seconds}s`;
      console.log(`  • ${item.exercise_name}: ${presc}, rest ${item.rest_seconds}s`);
      console.log(`    Cues: ${item.coaching_cues}`);
      if (item.reasoning_tags.length) {
        console.log(`    Tags: ${item.reasoning_tags.join(", ")}`);
      }
    }
  }
  console.log("");
}

const EXAMPLES: { name: string; input: GenerateWorkoutInput }[] = [
  {
    name: "60 min hypertrophy + medium energy + full gym",
    input: {
      duration_minutes: 60,
      primary_goal: "hypertrophy",
      secondary_goals: ["strength"],
      focus_body_parts: ["full_body"],
      energy_level: "medium",
      available_equipment: [
        "squat_rack",
        "barbell",
        "plates",
        "bench",
        "dumbbells",
        "kettlebells",
        "cable_machine",
        "lat_pulldown",
        "leg_press",
        "treadmill",
        "pullup_bar",
        "bodyweight",
      ],
      injuries_or_constraints: [],
      seed: 42,
    },
  },
  {
    name: "45 min strength + high energy + limited equipment (DB + cable)",
    input: {
      duration_minutes: 45,
      primary_goal: "strength",
      energy_level: "high",
      available_equipment: ["dumbbells", "bench", "cable_machine", "bodyweight"],
      injuries_or_constraints: [],
      seed: 1,
    },
  },
  {
    name: "30 min body recomp + low energy + avoid overhead/hanging",
    input: {
      duration_minutes: 30,
      primary_goal: "body_recomp",
      energy_level: "low",
      available_equipment: ["dumbbells", "bench", "cable_machine", "bands", "bodyweight"],
      injuries_or_constraints: [],
      style_prefs: { avoid_tags: ["overhead", "hanging", "shoulder_extension"] },
      seed: 100,
    },
  },
  {
    name: "75 min endurance + medium energy + knee sensitive",
    input: {
      duration_minutes: 75,
      primary_goal: "endurance",
      energy_level: "medium",
      available_equipment: [
        "treadmill",
        "assault_bike",
        "rower",
        "dumbbells",
        "cable_machine",
        "bodyweight",
      ],
      injuries_or_constraints: ["knee_pain"],
      style_prefs: { conditioning_minutes: 15 },
      seed: 7,
    },
  },
  {
    name: "45 min athletic performance + plyo allowed",
    input: {
      duration_minutes: 45,
      primary_goal: "athletic_performance",
      energy_level: "high",
      available_equipment: [
        "barbell",
        "dumbbells",
        "kettlebells",
        "plyo_box",
        "bodyweight",
        "bench",
      ],
      injuries_or_constraints: [],
      seed: 12,
    },
  },
  {
    name: "20 min recovery/mobility only",
    input: {
      duration_minutes: 20,
      primary_goal: "recovery",
      energy_level: "low",
      available_equipment: ["bodyweight", "bands"],
      injuries_or_constraints: [],
      seed: 99,
    },
  },
  {
    name: "60 min upper push/pull focus",
    input: {
      duration_minutes: 60,
      primary_goal: "hypertrophy",
      focus_body_parts: ["upper_push", "upper_pull"],
      energy_level: "medium",
      available_equipment: [
        "dumbbells",
        "bench",
        "cable_machine",
        "lat_pulldown",
        "pullup_bar",
        "bodyweight",
      ],
      injuries_or_constraints: [],
      seed: 33,
    },
  },
  {
    name: "45 min strength with recent history (variety)",
    input: {
      duration_minutes: 45,
      primary_goal: "strength",
      energy_level: "medium",
      available_equipment: ["barbell", "dumbbells", "bench", "squat_rack", "bodyweight"],
      injuries_or_constraints: [],
      recent_history: [
        {
          exercise_ids: ["barbell_back_squat", "bench_press_barbell", "rdl_dumbbell"],
          muscle_groups: ["legs", "push"],
          modality: "strength",
        },
      ],
      seed: 5,
    },
  },
];

function main() {
  console.log("Daily Workout Generator — Seed Test Harness");
  console.log("Running", EXAMPLES.length, "example inputs...");

  for (const ex of EXAMPLES) {
    const session = generateWorkoutSession(
      { ...ex.input, style_prefs: { ...ex.input.style_prefs } },
      undefined,
      false
    );
    printSession(session, ex.name);
  }

  // Regenerate example: same input, two modes
  const input = EXAMPLES[0].input;
  const first = generateWorkoutSession({ ...input, seed: 100 }, undefined, false);
  printSession(first, "Regenerate base (seed 100)");

  const swapped = regenerateWorkoutSession(
    { ...input, seed: 100 },
    first,
    "keep_structure_swap_exercises",
    undefined,
    false
  );
  printSession(swapped, "Regenerate: keep_structure_swap_exercises (seed 101)");

  const newStruct = regenerateWorkoutSession(
    { ...input, seed: 100 },
    first,
    "new_structure",
    undefined,
    false
  );
  printSession(newStruct, "Regenerate: new_structure (seed 101)");

  console.log("Done.");
}

main();
