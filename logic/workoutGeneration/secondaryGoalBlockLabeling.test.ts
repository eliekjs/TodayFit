import { describe, expect, it } from "vitest";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import type { GenerateWorkoutInput } from "./types";

/**
 * Regression coverage for a mislabeling bug: secondary-goal blocks (strength, hypertrophy,
 * power) built for a session whose *primary* goal is recovery/mobility were falling through
 * to `ensureBlockGoalIntentFallbacks`, which stamped them with the session's primary goal
 * ("recovery_mobility") instead of the goal that actually drove the block. In the UI this
 * showed a "RECOVERY MOBILITY" badge on a block full of squats/hinges, and — because the
 * block also lacked `goal_intent` at chunking time — its title collapsed to a generic
 * "Block A" instead of a semantic title like "Main hypertrophy".
 */
function baseInput(overrides: Partial<GenerateWorkoutInput>): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "recovery_mobility",
    energy_level: "medium",
    available_equipment: ["bodyweight", "dumbbells", "bench", "treadmill"],
    injuries_or_constraints: [],
    seed: 4200,
    ...overrides,
  };
}

describe("secondary-goal block labeling on a recovery/mobility-primary session", () => {
  it("tags a secondary hypertrophy block with its own goal, not the primary recovery goal", () => {
    const session = generateWorkoutSession(
      baseInput({ secondary_goals: ["hypertrophy"] }),
      STUB_EXERCISES
    );

    const hypertrophyBlock = session.blocks.find((b) => b.block_type === "main_hypertrophy");
    expect(hypertrophyBlock).toBeDefined();
    expect(hypertrophyBlock?.goal_intent?.goal_slug).not.toBe("recovery_mobility");
    expect(hypertrophyBlock?.goal_intent?.goal_slug).toBe("hypertrophy");
    // A real goal_intent at push time means the superset-chunking pass keeps the semantic
    // title instead of overwriting it with a generic "Block A" / "Block B" letter title.
    expect(hypertrophyBlock?.title).not.toMatch(/^Block [A-Z]+$/);
  });

  it("tags a secondary strength block with its own goal, not the primary recovery goal", () => {
    const session = generateWorkoutSession(
      baseInput({ secondary_goals: ["strength"], seed: 4201 }),
      STUB_EXERCISES
    );

    const strengthBlock = session.blocks.find((b) => b.block_type === "main_strength");
    expect(strengthBlock).toBeDefined();
    expect(strengthBlock?.goal_intent?.goal_slug).not.toBe("recovery_mobility");
    expect(strengthBlock?.goal_intent?.goal_slug).toBe("strength");
    expect(strengthBlock?.title).not.toMatch(/^Block [A-Z]+$/);
  });

  it("every non-prep block reflects a goal the session actually declared", () => {
    const session = generateWorkoutSession(
      baseInput({ secondary_goals: ["hypertrophy", "strength"], seed: 4202 }),
      STUB_EXERCISES
    );

    const declaredGoals = new Set([
      session.blocks[0] ? "recovery_mobility" : "recovery_mobility",
      "hypertrophy",
      "strength",
    ]);
    const workingBlocks = session.blocks.filter(
      (b) => b.block_type !== "warmup" && b.block_type !== "cooldown" && (b.items?.length ?? 0) > 0
    );
    for (const block of workingBlocks) {
      if (!block.goal_intent) continue;
      expect(declaredGoals.has(block.goal_intent.goal_slug)).toBe(true);
    }
  });
});
