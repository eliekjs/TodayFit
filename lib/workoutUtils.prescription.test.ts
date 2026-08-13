import { describe, expect, it } from "vitest";
import { updateExercisePrescriptionInWorkout } from "./workoutUtils";
import type { GeneratedWorkout } from "./types";

function sampleWorkout(): GeneratedWorkout {
  return {
    id: "w1",
    focus: ["strength"],
    durationMinutes: 45,
    energyLevel: "medium",
    blocks: [
      {
        block_type: "main_strength",
        format: "straight_sets",
        items: [
          {
            exercise_id: "goblet_squat",
            exercise_name: "Goblet Squat",
            sets: 3,
            reps: 8,
            rest_seconds: 90,
            coaching_cues: "Brace.",
          },
        ],
      },
    ],
  };
}

describe("updateExercisePrescriptionInWorkout", () => {
  it("updates sets and reps for a matching exercise", () => {
    const updated = updateExercisePrescriptionInWorkout(sampleWorkout(), "goblet_squat", {
      sets: 4,
      reps: 10,
    });
    const item = updated.blocks[0]!.items[0]!;
    expect(item.sets).toBe(4);
    expect(item.reps).toBe(10);
  });

  it("leaves other exercises unchanged", () => {
    const updated = updateExercisePrescriptionInWorkout(sampleWorkout(), "bench_press", {
      sets: 5,
      reps: 5,
    });
    expect(updated.blocks[0]!.items[0]!.sets).toBe(3);
    expect(updated.blocks[0]!.items[0]!.reps).toBe(8);
  });
});
