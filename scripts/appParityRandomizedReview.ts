/**
 * Randomized app-parity single-run review.
 * Uses the same app path: generateWorkoutAsync -> adapter -> dailyGenerator.
 *
 * Usage:
 *   npx tsx scripts/appParityRandomizedReview.ts [seed]
 */

import { loadDotEnvFromRepoRoot } from "./dotenvLocal";
import { getDefaultEquipmentForTemplate } from "../data/gymProfiles";
import type { GymProfile } from "../data/gymProfiles";
import {
  generateWorkoutAsync,
  getExercisePoolForManualGeneration,
  injurySlugsFromManualPreferences,
} from "../lib/generator";
import { manualPreferencesToGenerateWorkoutInput } from "../lib/dailyGeneratorAdapter";
import { buildRandomAppParityScenario } from "../logic/workoutGeneration/appParityRandomizedScenario.definition";
import type { Exercise } from "../logic/workoutGeneration/types";

function buildGym(template: "minimal" | "full"): GymProfile {
  return {
    id: `randomized_${template}`,
    name: template === "minimal" ? "Minimal setup" : "Full gym",
    equipment:
      template === "minimal"
        ? ["bodyweight", "dumbbells", "bands", "bench"]
        : getDefaultEquipmentForTemplate("your_gym"),
  };
}

function getExerciseTags(ex: Exercise | undefined) {
  if (!ex) return {};
  return {
    modality: ex.modality,
    movement_pattern: ex.movement_pattern,
    goal_tags: ex.tags?.goal_tags ?? [],
    sport_tags: ex.tags?.sport_tags ?? [],
    attribute_tags: ex.tags?.attribute_tags ?? [],
    stimulus: ex.tags?.stimulus ?? [],
  };
}

async function main() {
  loadDotEnvFromRepoRoot();
  const seedArg = process.argv[2];
  const seed = seedArg != null && seedArg !== "" ? Number(seedArg) : Math.floor(Math.random() * 1_000_000);
  if (Number.isNaN(seed)) {
    console.error("Usage: npx tsx scripts/appParityRandomizedReview.ts [seedNumber]");
    process.exit(1);
  }

  const scenario = buildRandomAppParityScenario(seed);
  const gym = buildGym(scenario.gymTemplate);
  const injurySlugs = injurySlugsFromManualPreferences(scenario.manualPreferences);
  const pool = await getExercisePoolForManualGeneration(injurySlugs);
  const byId = new Map(pool.map((e) => [e.id, e]));

  const workout = await generateWorkoutAsync(
    scenario.manualPreferences,
    gym,
    scenario.seed,
    undefined,
    scenario.sportGoalContext,
    { exercisePool: pool }
  );
  const resolvedInput = manualPreferencesToGenerateWorkoutInput(
    scenario.manualPreferences,
    gym,
    scenario.seed,
    undefined,
    scenario.sportGoalContext
  );

  const output = {
    run_meta: {
      seed: scenario.seed,
      mode: scenario.mode,
      gym_template: scenario.gymTemplate,
      gym_name: gym.name,
    },
    exact_user_inputs: {
      manual_preferences: scenario.manualPreferences,
      sport_goal_context: scenario.sportGoalContext ?? null,
      user_available_equipment: gym.equipment,
      resolved_generation_input: {
        primary_goal: resolvedInput.primary_goal,
        secondary_goals: resolvedInput.secondary_goals ?? [],
        focus_body_parts: resolvedInput.focus_body_parts ?? [],
        available_equipment: resolvedInput.available_equipment,
        goal_sub_focus: resolvedInput.goal_sub_focus ?? {},
      },
    },
    exact_app_output: workout,
    exercise_selection_explanations: workout.blocks.map((block) => ({
      block_type: block.block_type,
      title: block.title ?? null,
      format: block.format,
      block_reasoning: block.reasoning ?? null,
      structure_reasoning:
        block.reasoning ??
        (block.block_type === "conditioning"
          ? "Conditioning structure chosen by goal/sub-focus protocol."
          : "Block assembled by generator scoring and constraint pipeline."),
      items: block.items.map((item) => ({
        exercise_id: item.exercise_id,
        exercise_name: item.exercise_name,
        prescription: {
          sets: item.sets,
          reps: item.reps ?? null,
          time_seconds: item.time_seconds ?? null,
          rest_seconds: item.rest_seconds,
        },
        exercise_tags: getExerciseTags(byId.get(item.exercise_id)),
        reasoning_tags: item.reasoning_tags ?? [],
        session_intent_links: item.session_intent_links ?? null,
      })),
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
