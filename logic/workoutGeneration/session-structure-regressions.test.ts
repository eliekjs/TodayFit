import { generateWorkoutSession } from "./dailyGenerator";
import type { GenerateWorkoutInput } from "./types";
import { STUB_EXERCISES } from "./exerciseStub";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testThirtyMinuteStrengthStructureRegressions() {
  const seeds = [587507, 587508, 587509, 587510, 587511];
  for (const seed of seeds) {
    const input: GenerateWorkoutInput = {
      duration_minutes: 30,
      primary_goal: "strength",
      secondary_goals: ["mobility"],
      energy_level: "high",
      available_equipment: ["bodyweight", "dumbbells", "bands", "bench"],
      injuries_or_constraints: ["shoulder"],
      goal_sub_focus: { calisthenics: ["handstand_control"] },
      sport_slugs: ["road_running"],
      sport_sub_focus: { road_running: ["aerobic_base", "leg_resilience"] },
      seed,
    };

    const session = generateWorkoutSession(input, STUB_EXERCISES);
    const last = session.blocks[session.blocks.length - 1];
    assert(last?.block_type === "cooldown", `seed ${seed}: cooldown must be the last block`);

    const invalidSuperset = session.blocks.find(
      (block) =>
        block.format === "superset" &&
        ((block.supersetPairs?.length ?? 0) === 0 || block.items.length < 2)
    );
    assert(!invalidSuperset, `seed ${seed}: supersets must always contain paired items`);

    assert(
      session.estimated_duration_minutes <= 35,
      `seed ${seed}: 30-minute estimate should not be materially inflated`
    );
  }

  console.log("OK: 30-minute structure regressions covered (cooldown order, true supersets, realistic estimate)");
}

testThirtyMinuteStrengthStructureRegressions();
