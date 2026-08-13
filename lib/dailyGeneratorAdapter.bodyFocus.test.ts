import { describe, expect, it } from "vitest";
import { manualPreferencesToGenerateWorkoutInput } from "./dailyGeneratorAdapter";
import type { ManualPreferences } from "./types";

const BASE: ManualPreferences = {
  primaryFocus: ["Build Strength"],
  targetBody: null,
  targetModifier: [],
  durationMinutes: 45,
  energyLevel: "medium",
  injuries: ["No restrictions"],
  upcoming: [],
  subFocusByGoal: {},
  workoutStyle: [],
};

describe("manualPreferencesToGenerateWorkoutInput body region from targetBody", () => {
  it("maps Upper to upper_push + upper_pull (not full_body)", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE, targetBody: "Upper" },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["upper_push", "upper_pull"]);
    expect(input.focus_body_parts?.includes("full_body")).toBe(false);
  });

  it("filters merged power sub-focus to upper_body_power on Upper target days", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...BASE,
        primaryFocus: ["Power & Explosiveness", "Calisthenics"],
        targetBody: "Upper",
        subFocusByGoal: {
          "Power & Explosiveness": ["Upper body power", "Lower body power / Plyos"],
        },
        weekSubFocusPrimaryLabels: ["Power & Explosiveness", "Calisthenics"],
      },
      undefined,
      2
    );
    expect(input.goal_sub_focus?.power).toEqual(["upper_body_power"]);
  });

  it("spread mode keeps mismatched power sub-focuses and expands to full_body", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...BASE,
        primaryFocus: ["Power & Explosiveness", "Calisthenics"],
        targetBody: "Upper",
        sessionFocusDistribution: "spread",
        subFocusByGoal: {
          "Power & Explosiveness": ["Upper body power", "Lower body power / Plyos"],
        },
        weekSubFocusPrimaryLabels: ["Power & Explosiveness", "Calisthenics"],
      },
      undefined,
      3
    );
    expect(input.focus_body_parts).toEqual(["full_body"]);
    expect(input.goal_sub_focus?.power).toEqual(
      expect.arrayContaining(["upper_body_power", "lower_body_power_plyos"])
    );
  });

  it("maps Lower to lower focus", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE, targetBody: "Lower" },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["lower"]);
  });

  it("maps Lower + Quad modifier to lower + quad (not just lower)", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE, targetBody: "Lower", targetModifier: ["Quad"] },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["lower", "quad"]);
  });

  it("maps Lower + Posterior modifier to lower + posterior (not just lower)", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE, targetBody: "Lower", targetModifier: ["Posterior"] },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["lower", "posterior"]);
  });

  it("ignores Quad/Posterior modifier when both are selected (ambiguous)", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE, targetBody: "Lower", targetModifier: ["Quad", "Posterior"] },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["lower"]);
  });

  it("maps Full to full_body", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE, targetBody: "Full" },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["full_body"]);
  });

  it("maps Full + specificBodyFocus core to core (not full_body)", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE, targetBody: "Full", specificBodyFocus: ["core"] },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["core"]);
  });

  it("specificBodyFocus core overrides Upper/Lower target body too", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE, targetBody: "Upper", specificBodyFocus: ["core"] },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["core"]);
  });

  it("maps Pattern/Muscle specificBodyFocus to region + muscle emphasis tags", () => {
    expect(
      manualPreferencesToGenerateWorkoutInput(
        { ...BASE, targetBody: "Upper", targetModifier: ["Push"], specificBodyFocus: ["chest"] },
        undefined,
        1
      ).focus_body_parts
    ).toEqual(["upper_push", "chest"]);

    expect(
      manualPreferencesToGenerateWorkoutInput(
        { ...BASE, targetBody: "Upper", targetModifier: ["Pull"], specificBodyFocus: ["back"] },
        undefined,
        1
      ).focus_body_parts
    ).toEqual(["upper_pull", "back"]);

    expect(
      manualPreferencesToGenerateWorkoutInput(
        { ...BASE, targetBody: "Upper", specificBodyFocus: ["arms"] },
        undefined,
        1
      ).focus_body_parts
    ).toEqual(["upper_push", "upper_pull", "arms"]);

    expect(
      manualPreferencesToGenerateWorkoutInput(
        { ...BASE, targetBody: "Lower", specificBodyFocus: ["legs"] },
        undefined,
        1
      ).focus_body_parts
    ).toEqual(["lower", "legs"]);

    expect(
      manualPreferencesToGenerateWorkoutInput(
        {
          ...BASE,
          targetBody: "Lower",
          targetModifier: ["Posterior"],
          specificBodyFocus: ["glutes"],
        },
        undefined,
        1
      ).focus_body_parts
    ).toEqual(["lower", "posterior", "glutes"]);

    expect(
      manualPreferencesToGenerateWorkoutInput(
        { ...BASE, targetBody: "Upper", targetModifier: ["Push"], specificBodyFocus: ["push"] },
        undefined,
        1
      ).focus_body_parts
    ).toEqual(["upper_push"]);

    expect(
      manualPreferencesToGenerateWorkoutInput(
        { ...BASE, targetBody: "Upper", targetModifier: ["Pull"], specificBodyFocus: ["pull"] },
        undefined,
        1
      ).focus_body_parts
    ).toEqual(["upper_pull"]);
  });
});

describe("manualPreferencesToGenerateWorkoutInput regeneration avoid ids", () => {
  it("maps regeneration_avoid_exercise_ids to regeneration_penalty recent_history", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      BASE,
      undefined,
      1,
      undefined,
      { regeneration_avoid_exercise_ids: ["squat", "bench_press"] }
    );
    expect(input.recent_history).toEqual([
      {
        exercise_ids: ["squat", "bench_press"],
        muscle_groups: [],
        modality: "regeneration_penalty",
      },
    ]);
  });

  it("omits recent_history when avoid list is empty", () => {
    const input = manualPreferencesToGenerateWorkoutInput(BASE, undefined, 1, undefined, {
      regeneration_avoid_exercise_ids: [],
    });
    expect(input.recent_history).toBeUndefined();
  });
});
