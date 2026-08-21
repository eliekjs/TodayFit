import { describe, expect, it } from "vitest";
import {
  applyVolumePreferenceToWorkout,
  updateExercisePrescriptionInWorkout,
} from "./workoutUtils";
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
      {
        block_type: "accessory",
        format: "straight_sets",
        items: [
          {
            exercise_id: "lateral_raise",
            exercise_name: "Lateral Raise",
            sets: 2,
            reps: 12,
            rest_seconds: 60,
            coaching_cues: "Control.",
          },
        ],
      },
      {
        block_type: "warmup",
        format: "straight_sets",
        items: [
          {
            exercise_id: "jumping_jacks",
            exercise_name: "Jumping Jacks",
            sets: 1,
            time_seconds: 60,
            rest_seconds: 0,
            coaching_cues: "Easy.",
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

describe("applyVolumePreferenceToWorkout", () => {
  it("retargets strength and accessory sets/reps without regenerating exercises", () => {
    const base = {
      ...sampleWorkout(),
      generationPreferences: {
        primaryFocus: ["Build Strength"],
        targetBody: null,
        targetModifier: [],
        durationMinutes: 45,
        energyLevel: "medium" as const,
        injuries: [],
        upcoming: [],
        subFocusByGoal: {},
        workoutStyle: [],
        volumePreference: "standard" as const,
      },
    };
    const updated = applyVolumePreferenceToWorkout(base, "high_volume");
    expect(updated.blocks[0]!.items[0]).toMatchObject({
      exercise_id: "goblet_squat",
      sets: 4,
      reps: 8,
    });
    expect(updated.blocks[1]!.items[0]).toMatchObject({
      exercise_id: "lateral_raise",
      sets: 4,
      reps: 14,
    });
    expect(updated.blocks[2]!.items[0]).toMatchObject({
      exercise_id: "jumping_jacks",
      sets: 1,
      time_seconds: 60,
    });
    expect(updated.generationPreferences?.volumePreference).toBe("high_volume");
  });

  it("leaves non-strength blocks alone when preference is Strength Focused", () => {
    const updated = applyVolumePreferenceToWorkout(sampleWorkout(), "conservative", "low");
    expect(updated.blocks[0]!.items[0]).toMatchObject({ sets: 3, reps: 3 });
    expect(updated.blocks[1]!.items[0]).toMatchObject({ sets: 2, reps: 8 });
    expect(updated.blocks[2]!.items[0]!.time_seconds).toBe(60);
  });
});
