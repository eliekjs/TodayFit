import { describe, it, expect } from "vitest";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import { buildBlockIntentProfile, shouldIncludeConditioningBlock } from "./blockIntentProfile";
import type { GenerateWorkoutInput } from "./types";

function baseCalisthenicsInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "calisthenics",
    focus_body_parts: ["full_body"],
    energy_level: "high",
    available_equipment: ["bodyweight", "pullup_bar", "dip_station"],
    injuries_or_constraints: [],
    seed: 700_001,
    ...overrides,
  };
}

describe("calisthenics conditioning policy", () => {
  it("shouldIncludeConditioningBlock is false for pure calisthenics (no engine dials)", () => {
    expect(shouldIncludeConditioningBlock(baseCalisthenicsInput())).toBe(false);
  });

  it("shouldIncludeConditioningBlock is true when conditioning secondary is set", () => {
    expect(
      shouldIncludeConditioningBlock(baseCalisthenicsInput({ secondary_goals: ["conditioning"] }))
    ).toBe(true);
  });

  it("buildBlockIntentProfile omits allowConditioningBlock for pure calisthenics", () => {
    const p = buildBlockIntentProfile(baseCalisthenicsInput());
    expect(p.allowConditioningBlock).toBe(false);
    expect(p.conditioningRequired).toBe(false);
  });

  it("buildBlockIntentProfile enables conditioning when weekly cardio emphasis is set", () => {
    const p = buildBlockIntentProfile(baseCalisthenicsInput({ weekly_cardio_emphasis: 0.4 }));
    expect(p.allowConditioningBlock).toBe(true);
  });

  it("generateWorkoutSession has no conditioning block for pure high-energy calisthenics", () => {
    const session = generateWorkoutSession(baseCalisthenicsInput({ seed: 801_002 }), STUB_EXERCISES);
    expect(session.blocks.some((b) => b.block_type === "conditioning")).toBe(false);
  });

  it("generateWorkoutSession includes conditioning when conditioning is a secondary goal", () => {
    const session = generateWorkoutSession(
      baseCalisthenicsInput({ secondary_goals: ["conditioning"], seed: 801_003 }),
      STUB_EXERCISES
    );
    expect(session.blocks.some((b) => b.block_type === "conditioning")).toBe(true);
  });
});
