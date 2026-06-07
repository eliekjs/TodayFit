/**
 * User-simulation harness: app-parity generation + catalog validation.
 *
 * Usage:
 *   npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runUserSimulation.ts [seed]
 *
 * Edit SCENARIO below for each simulation run (one scenario at a time).
 */

import { loadDotEnvFromRepoRoot } from "../../../../scripts/dotenvLocal";
import { getDefaultEquipmentForTemplate } from "../../../../data/gymProfiles";
import type { GymProfile } from "../../../../data/gymProfiles";
import type { ManualPreferences } from "../../../../lib/types";
import {
  generateWorkoutAsync,
  getExercisePoolForManualGeneration,
  injurySlugsFromManualPreferences,
} from "../../../../lib/generator";
import {
  manualPreferencesToGenerateWorkoutInput,
  type SportGoalContext,
} from "../../../../lib/dailyGeneratorAdapter";
import type { Exercise } from "../../../../logic/workoutGeneration/types";

/** One scenario per run — edit before each simulation. */
const SCENARIO = {
  label: "Sport mode: basketball vertical jump, lower body, 45 min",
  manualPreferences: {
    primaryFocus: [] as string[],
    subFocusByGoal: {},
    targetBody: "Lower",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    workoutStyle: [],
    workoutTier: "intermediate",
  } satisfies ManualPreferences,
  sportGoalContext: {
    sport_slugs: ["basketball"],
    sport_sub_focus: { basketball: ["vertical_jump"] },
    sport_weight: 0.55,
    include_intent_survival_report: true,
  } satisfies SportGoalContext,
  gym: {
    id: "user_sim_basketball_vj",
    name: "Full gym (template)",
    equipment: getDefaultEquipmentForTemplate("your_gym"),
  } satisfies GymProfile,
};

const SCENARIO_SOCCER = {
  label: "Sport mode: soccer repeat sprint + deceleration, lower body, 45 min",
  manualPreferences: {
    primaryFocus: [] as string[],
    subFocusByGoal: {},
    targetBody: "Lower",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    workoutStyle: [],
    workoutTier: "intermediate",
  } satisfies ManualPreferences,
  sportGoalContext: {
    sport_slugs: ["soccer"],
    sport_sub_focus: { soccer: ["repeat_sprint", "deceleration"] },
    sport_weight: 0.55,
    include_intent_survival_report: true,
  } satisfies SportGoalContext,
  gym: {
    id: "user_sim_soccer_sprint",
    name: "Full gym (template)",
    equipment: getDefaultEquipmentForTemplate("your_gym"),
  } satisfies GymProfile,
};

const SCENARIO_LACROSSE_COD = {
  label: "Sport mode: lacrosse change of direction, full body, 45 min",
  manualPreferences: {
    primaryFocus: [] as string[],
    subFocusByGoal: {},
    targetBody: "Full",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    workoutStyle: [],
    workoutTier: "intermediate",
  } satisfies ManualPreferences,
  sportGoalContext: {
    sport_slugs: ["lacrosse"],
    sport_sub_focus: { lacrosse: ["change_of_direction"] },
    sport_weight: 0.55,
    include_intent_survival_report: true,
  } satisfies SportGoalContext,
  gym: {
    id: "user_sim_lacrosse_cod",
    name: "Full gym (template)",
    equipment: getDefaultEquipmentForTemplate("your_gym"),
  } satisfies GymProfile,
};

const SCENARIO_VOLLEYBALL_VJ = {
  label: "Sport mode: volleyball vertical jump, lower body, 45 min",
  manualPreferences: {
    primaryFocus: [] as string[],
    subFocusByGoal: {},
    targetBody: "Lower",
    targetModifier: [],
    durationMinutes: 45,
    energyLevel: "medium",
    injuries: ["No restrictions"],
    upcoming: [],
    workoutStyle: [],
    workoutTier: "intermediate",
  } satisfies ManualPreferences,
  sportGoalContext: {
    sport_slugs: ["volleyball"],
    sport_sub_focus: { volleyball: ["vertical_jump"] },
    sport_weight: 0.55,
    include_intent_survival_report: true,
  } satisfies SportGoalContext,
  gym: {
    id: "user_sim_volleyball_vj",
    name: "Full gym (template)",
    equipment: getDefaultEquipmentForTemplate("your_gym"),
  } satisfies GymProfile,
};

const SCENARIOS: Record<string, typeof SCENARIO> = {
  basketball: SCENARIO,
  soccer: SCENARIO_SOCCER,
  lacrosse: SCENARIO_LACROSSE_COD,
  volleyball: SCENARIO_VOLLEYBALL_VJ,
};

const INTENT_LABEL_PATTERNS =
  /\b(strength|power|unilateral|bilateral|posterior|anterior|plyometric|mobility|stability|conditioning|endurance|hypertrophy)\b/i;

function validateExercise(
  id: string,
  name: string,
  poolById: Map<string, Exercise>,
  poolByName: Map<string, Exercise>
): { inCatalog: boolean; looksLikeIntentLabel: boolean; note: string } {
  const byId = poolById.get(id);
  if (byId) {
    return { inCatalog: true, looksLikeIntentLabel: false, note: "id match" };
  }
  const byName = poolByName.get(name.toLowerCase());
  if (byName) {
    return { inCatalog: true, looksLikeIntentLabel: false, note: "name match only (id mismatch)" };
  }
  const looksLikeIntentLabel =
    !name.includes(" ") ||
    /^(unilateral|bilateral|posterior chain|single.?leg|core stability)/i.test(name) ||
    (name.split(" ").length <= 3 && INTENT_LABEL_PATTERNS.test(name) && !/\d/.test(name));
  return {
    inCatalog: false,
    looksLikeIntentLabel,
    note: looksLikeIntentLabel ? "likely intent label leaked as exercise" : "missing from catalog",
  };
}

async function main() {
  loadDotEnvFromRepoRoot();
  const scenarioKey = process.argv[3] ?? "basketball";
  const seedArg = process.argv[2];
  const defaultSeeds: Record<string, number> = {
    basketball: 88042,
    soccer: 99123,
    lacrosse: 77201,
    volleyball: 66440,
  };
  const seed =
    seedArg != null && seedArg !== ""
      ? Number(seedArg)
      : (defaultSeeds[scenarioKey] ?? 88042);
  if (Number.isNaN(seed)) {
    console.error(
      "Usage: npx tsx .cursor/skills/workout-user-simulation-agent/scripts/runUserSimulation.ts [seed] [basketball|soccer|lacrosse|volleyball]"
    );
    process.exit(1);
  }

  const scenarioPick = SCENARIOS[scenarioKey] ?? SCENARIO;
  const { manualPreferences, sportGoalContext, gym, label } = scenarioPick;
  const injurySlugs = injurySlugsFromManualPreferences(manualPreferences);
  const pool = await getExercisePoolForManualGeneration(injurySlugs);
  const poolById = new Map(pool.map((e) => [e.id, e]));
  const poolByName = new Map(pool.map((e) => [e.name.toLowerCase(), e]));

  const workout = await generateWorkoutAsync(
    manualPreferences,
    gym,
    seed,
    undefined,
    sportGoalContext,
    { exercisePool: pool }
  );

  const resolved = manualPreferencesToGenerateWorkoutInput(
    manualPreferences,
    gym,
    seed,
    undefined,
    sportGoalContext
  );

  const report = {
    scenario: label,
    seed,
    pool_size: pool.length,
    inputs: {
      manual_preferences: manualPreferences,
      sport_goal_context: sportGoalContext,
      gym_equipment: gym.equipment,
      resolved_generation_input: {
        primary_goal: resolved.primary_goal,
        secondary_goals: resolved.secondary_goals ?? [],
        focus_body_parts: resolved.focus_body_parts ?? [],
        sport_slugs: resolved.sport_slugs,
        sport_sub_focus: resolved.sport_sub_focus,
        sport_weight: resolved.sport_weight,
        goal_sub_focus: resolved.goal_sub_focus,
        duration_minutes: resolved.duration_minutes,
        energy_level: resolved.energy_level,
      },
    },
    workout: {
      id: workout.id,
      focus: workout.focus,
      durationMinutes: workout.durationMinutes,
      notes: workout.notes,
      blocks: workout.blocks.map((b) => ({
        block_type: b.block_type,
        title: b.title,
        format: b.format,
        estimated_minutes: b.estimated_minutes,
        reasoning: b.reasoning,
        items: (b.items ?? []).map((item) => {
          const v = validateExercise(
            item.exercise_id,
            item.exercise_name,
            poolById,
            poolByName
          );
          const ex = poolById.get(item.exercise_id) ?? poolByName.get(item.exercise_name.toLowerCase());
          return {
            exercise_id: item.exercise_id,
            exercise_name: item.exercise_name,
            prescription: {
              sets: item.sets,
              reps: item.reps ?? null,
              time_seconds: item.time_seconds ?? null,
              rest_seconds: item.rest_seconds,
            },
            reasoning_tags: item.reasoning_tags ?? [],
            catalog_validation: v,
            catalog_tags: ex
              ? {
                  modality: ex.modality,
                  movement_pattern: ex.movement_pattern,
                  muscle_groups: ex.muscle_groups,
                  stimulus: ex.tags?.stimulus ?? [],
                  attribute_tags: (ex.tags?.attribute_tags ?? []).slice(0, 8),
                }
              : null,
          };
        }),
      })),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
