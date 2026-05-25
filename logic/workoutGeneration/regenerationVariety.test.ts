import { describe, it, expect } from "vitest";
import { generateWorkoutSession } from "./dailyGenerator";
import { STUB_EXERCISES } from "./exerciseStub";
import type { GenerateWorkoutInput } from "./types";

function baseInput(overrides: Partial<GenerateWorkoutInput> = {}): GenerateWorkoutInput {
  return {
    duration_minutes: 45,
    primary_goal: "strength",
    focus_body_parts: ["full_body"],
    energy_level: "medium",
    available_equipment: [
      "barbell",
      "dumbbells",
      "bench",
      "squat_rack",
      "bodyweight",
      "pullup_bar",
    ],
    injuries_or_constraints: [],
    seed: 424_242,
    ...overrides,
  };
}

function collectIds(session: ReturnType<typeof generateWorkoutSession>): Set<string> {
  return new Set(session.blocks.flatMap((b) => b.items.map((i) => i.exercise_id)));
}

describe("regeneration variety", () => {
  it("uses exercises outside regeneration_penalty ids when the stub pool allows alternatives", () => {
    const first = generateWorkoutSession(baseInput(), STUB_EXERCISES);
    const avoid = [...collectIds(first)];
    expect(avoid.length).toBeGreaterThan(4);

    const second = generateWorkoutSession(
      baseInput({
        seed: 989_001,
        recent_history: [
          {
            exercise_ids: avoid,
            muscle_groups: [],
            modality: "regeneration_penalty",
          },
        ],
      }),
      STUB_EXERCISES
    );

    const overlap = [...collectIds(second)].filter((id) => avoid.includes(id)).length;
    expect(overlap).toBeLessThan(avoid.length * 0.75);
  });
});
