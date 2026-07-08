import { describe, expect, it } from "vitest";
import type { Exercise } from "./types";
import {
  adjustGoalRulesForSessionFeel,
  shouldPrescribePowerIntent,
} from "./sessionFeelPrescription";
import { getGoalRules } from "../../lib/generation/prescriptionRules";

function stubExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "test_ex",
    name: "Test",
    modality: "strength",
    movement_pattern: "squat",
    muscle_groups: ["legs"],
    tags: {},
    ...overrides,
  } as Exercise;
}

describe("adjustGoalRulesForSessionFeel", () => {
  it("leaves strength rules unchanged for strength feel", () => {
    const base = getGoalRules("strength");
    const adjusted = adjustGoalRulesForSessionFeel(base, "strength");
    expect(adjusted.accessoryRepRange).toEqual(base.accessoryRepRange);
  });

  it("tightens accessory reps for sports_training feel", () => {
    const adjusted = adjustGoalRulesForSessionFeel(getGoalRules("strength"), "sports_training");
    expect(adjusted.accessoryRepRange?.max).toBeLessThanOrEqual(10);
    expect(adjusted.powerRepRange).toBeDefined();
    expect(adjusted.powerRestRange).toBeDefined();
  });
});

describe("shouldPrescribePowerIntent", () => {
  it("power block with sports_training feel uses power prescription even when primary is strength", () => {
    expect(
      shouldPrescribePowerIntent("power", "strength", stubExercise(), "sports_training")
    ).toBe(true);
  });

  it("power blocks always use power prescription regardless of primary goal", () => {
    expect(shouldPrescribePowerIntent("power", "power", stubExercise(), "strength")).toBe(true);
    expect(shouldPrescribePowerIntent("power", "strength", stubExercise(), "strength")).toBe(true);
  });

  it("main_strength back squat stays strength prescription under sports feel", () => {
    expect(
      shouldPrescribePowerIntent(
        "main_strength",
        "strength",
        stubExercise({ modality: "strength" }),
        "sports_training"
      )
    ).toBe(false);
  });

  it("main_strength plyometric exercise uses power prescription under sports feel", () => {
    expect(
      shouldPrescribePowerIntent(
        "main_strength",
        "athletic_performance",
        stubExercise({
          modality: "power",
          tags: { stimulus: ["plyometric"], attribute_tags: ["explosive_power"] },
        }),
        "sports_training"
      )
    ).toBe(true);
  });
});
