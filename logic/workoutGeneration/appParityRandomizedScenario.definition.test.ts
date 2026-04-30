/**
 * Guardrails for daily app-parity randomized scenarios:
 * - max 2 goals
 * - max 3 total sub-goals
 * - explicit one-day body focus present in resolved generator input
 * - equipment is always present in resolved generator input
 *
 * Run:
 *   npx tsx logic/workoutGeneration/appParityRandomizedScenario.definition.test.ts
 */

import assert from "node:assert/strict";
import { manualPreferencesToGenerateWorkoutInput } from "../../lib/dailyGeneratorAdapter";
import { buildRandomAppParityScenario } from "./appParityRandomizedScenario.definition";

function run() {
  for (let seed = 1; seed <= 300; seed += 1) {
    const scenario = buildRandomAppParityScenario(seed);
    if (scenario.mode === "adaptive_sport_mode") {
      const sportCount = scenario.sportGoalContext?.sport_slugs?.length ?? 0;
      const goalCount = scenario.manualPreferences.primaryFocus.length;
      const comboValid =
        (sportCount === 2 && goalCount === 0) ||
        (sportCount === 1 && goalCount === 1);
      assert.ok(
        comboValid,
        `seed ${seed}: adaptive daily combo must be (2 sports,0 goals) or (1 sport,1 goal). Got sports=${sportCount}, goals=${goalCount}`
      );
    } else {
      assert.ok(
        scenario.manualPreferences.primaryFocus.length <= 2,
        `seed ${seed}: expected <=2 goals, got ${scenario.manualPreferences.primaryFocus.length}`
      );
    }

    const totalSubGoals = Object.values(scenario.manualPreferences.subFocusByGoal ?? {}).reduce(
      (n, list) => n + (list?.length ?? 0),
      0
    );
    assert.ok(totalSubGoals <= 3, `seed ${seed}: expected <=3 total sub-goals, got ${totalSubGoals}`);

    const input = manualPreferencesToGenerateWorkoutInput(
      scenario.manualPreferences,
      {
        id: "test_gym",
        name: "Test gym",
        equipment: ["bodyweight", "dumbbells", "bands"],
      },
      seed,
      undefined,
      scenario.sportGoalContext
    );

    assert.ok(
      (input.secondary_goals?.length ?? 0) <= 1,
      `seed ${seed}: expected <=1 secondary goal, got ${input.secondary_goals?.length ?? 0}`
    );
    assert.ok(
      (input.focus_body_parts?.length ?? 0) >= 1,
      `seed ${seed}: expected at least one focus_body_part for one-day generation`
    );
    const totalResolvedSubGoals = Object.values(input.goal_sub_focus ?? {}).reduce(
      (n, list) => n + (list?.length ?? 0),
      0
    );
    assert.ok(
      totalResolvedSubGoals <= 3,
      `seed ${seed}: expected <=3 resolved sub-goals, got ${totalResolvedSubGoals}`
    );
    assert.ok(
      (input.available_equipment?.length ?? 0) > 0,
      `seed ${seed}: expected available equipment to be present`
    );
  }
  console.log("appParityRandomizedScenario.definition.test.ts: all passed");
}

run();
