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

  it("spread mode keeps mismatched power sub-focuses but does not rewrite body focus to full_body", () => {
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
    expect(input.focus_body_parts).toEqual(["upper_push", "upper_pull"]);
    expect(input.focus_body_parts?.includes("full_body")).toBe(false);
    expect(input.goal_sub_focus?.power).toEqual(["upper_body_power"]);
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

  it("maps Lower + specificBodyFocus quad without a Quad modifier", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE, targetBody: "Lower", specificBodyFocus: ["quad"] },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["lower", "quad"]);
  });

  it("maps Lower + specificBodyFocus posterior without a Posterior modifier", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE, targetBody: "Lower", specificBodyFocus: ["posterior"] },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["lower", "posterior"]);
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
        { ...BASE, targetBody: "Upper", targetModifier: ["Push"], specificBodyFocus: ["shoulders"] },
        undefined,
        1
      ).focus_body_parts
    ).toEqual(["upper_push", "upper_pull", "shoulders"]);

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

describe("session body contract by week mode", () => {
  it("keeps Chest as a hard muscle gate even when spread is on", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...BASE,
        weeklyBodyFocusMode: "muscle",
        targetBody: "Upper",
        targetModifier: ["Push"],
        specificBodyFocus: ["chest"],
        sessionFocusDistribution: "spread",
      },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["upper_push", "chest"]);
    expect(input.focus_body_parts?.includes("full_body")).toBe(false);
  });

  it("does not treat Pattern Push as a Chest day", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...BASE,
        weeklyBodyFocusMode: "pattern",
        targetBody: "Upper",
        targetModifier: ["Push"],
        specificBodyFocus: ["push"],
      },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["upper_push"]);
    expect(input.focus_body_parts?.includes("chest")).toBe(false);
  });

  it("clamps leftover Chest tags to Upper when mode is Region", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...BASE,
        weeklyBodyFocusMode: "region",
        targetBody: "Upper",
        targetModifier: ["Push"],
        specificBodyFocus: ["chest"],
      },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["upper_push"]);
    expect(input.focus_body_parts?.includes("chest")).toBe(false);
  });

  it("does not invent Chest from Muscle-mode Upper without a specific pick", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...BASE,
        weeklyBodyFocusMode: "muscle",
        targetBody: "Upper",
      },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["upper_push", "upper_pull"]);
    expect(input.focus_body_parts?.includes("chest")).toBe(false);
  });

  it("keeps every muscle/pattern identity under spread (never rewrites to full_body)", () => {
    const cases: Array<{ specific: ManualPreferences["specificBodyFocus"]; mode: ManualPreferences["weeklyBodyFocusMode"]; expected: string[] }> =
      [
        { mode: "muscle", specific: ["chest"], expected: ["upper_push", "chest"] },
        { mode: "muscle", specific: ["back"], expected: ["upper_pull", "back"] },
        { mode: "muscle", specific: ["shoulders"], expected: ["upper_push", "upper_pull", "shoulders"] },
        { mode: "muscle", specific: ["arms"], expected: ["upper_push", "upper_pull", "arms"] },
        { mode: "muscle", specific: ["glutes"], expected: ["lower", "posterior", "glutes"] },
        { mode: "muscle", specific: ["legs"], expected: ["lower", "legs"] },
        { mode: "pattern", specific: ["push"], expected: ["upper_push"] },
        { mode: "pattern", specific: ["pull"], expected: ["upper_pull"] },
        { mode: "pattern", specific: ["legs"], expected: ["lower", "legs"] },
        { mode: "pattern", specific: ["quad"], expected: ["lower", "quad"] },
        { mode: "pattern", specific: ["posterior"], expected: ["lower", "posterior"] },
        { mode: "region", specific: ["core"], expected: ["core"] },
      ];
    for (const row of cases) {
      const biasTarget =
        row.expected.includes("lower") ? "Lower" : row.expected.includes("core") ? "Full" : "Upper";
      const input = manualPreferencesToGenerateWorkoutInput(
        {
          ...BASE,
          weeklyBodyFocusMode: row.mode,
          targetBody: biasTarget,
          specificBodyFocus: row.specific,
          sessionFocusDistribution: "spread",
        },
        undefined,
        1
      );
      expect(input.focus_body_parts, `${row.mode} ${row.specific}`).toEqual(row.expected);
      expect(input.focus_body_parts?.includes("full_body")).toBe(false);
    }
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

  it("maps training_history regeneration_penalty sessions onto recent_history", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      BASE,
      undefined,
      1,
      undefined,
      undefined,
      {
        recent_sessions: [
          {
            exercise_ids: ["goblet_squat", "bench_press"],
            modality: "regeneration_penalty",
            completed: true,
          },
        ],
      }
    );
    expect(input.recent_history).toEqual([
      {
        exercise_ids: ["goblet_squat", "bench_press"],
        muscle_groups: [],
        modality: "regeneration_penalty",
      },
    ]);
  });
});

describe("strength + body region without a lift sub-goal", () => {
  it("uses the lower overlay instead of a squat-only sub-focus", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      { ...BASE, targetBody: "Lower", subFocusByGoal: {} },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["lower"]);
    expect(input.goal_sub_focus?.strength).toEqual(["lower"]);
    expect(input.goal_sub_focus?.strength).not.toContain("squat");
  });

  it("drops overhead press on a lower day and uses the lower overlay", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...BASE,
        targetBody: "Lower",
        subFocusByGoal: { "Build Strength": ["Overhead Press"] },
      },
      undefined,
      1
    );
    expect(input.focus_body_parts).toEqual(["lower"]);
    expect(input.goal_sub_focus?.strength).toEqual(["lower"]);
    expect(input.goal_sub_focus?.strength).not.toContain("overhead_press");
    expect(input.goal_sub_focus?.strength).not.toContain("squat");
  });

  it("keeps squat when the user actually selected it", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...BASE,
        targetBody: "Lower",
        subFocusByGoal: { "Build Strength": ["Squat"] },
      },
      undefined,
      1
    );
    expect(input.goal_sub_focus?.strength).toEqual(["squat"]);
  });

  it("keeps overhead press on Upper and Push days", () => {
    expect(
      manualPreferencesToGenerateWorkoutInput(
        {
          ...BASE,
          targetBody: "Upper",
          subFocusByGoal: { "Build Strength": ["Overhead Press"] },
        },
        undefined,
        1
      ).goal_sub_focus?.strength
    ).toContain("overhead_press");

    expect(
      manualPreferencesToGenerateWorkoutInput(
        {
          ...BASE,
          targetBody: "Upper",
          targetModifier: ["Push"],
          specificBodyFocus: ["push"],
          weeklyBodyFocusMode: "pattern",
          subFocusByGoal: { "Build Strength": ["Overhead Press"] },
        },
        undefined,
        1
      ).goal_sub_focus?.strength
    ).toContain("overhead_press");

    expect(
      manualPreferencesToGenerateWorkoutInput(
        {
          ...BASE,
          targetBody: "Upper",
          specificBodyFocus: ["shoulders"],
          weeklyBodyFocusMode: "muscle",
          subFocusByGoal: { "Build Strength": ["Overhead Press"] },
        },
        undefined,
        1
      ).goal_sub_focus?.strength
    ).toContain("overhead_press");
  });
});

describe("manualPreferencesToGenerateWorkoutInput exclusive day sub-focus", () => {
  it("strength-only day does not inherit endurance Zone 2 from other goals", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...BASE,
        primaryFocus: ["Build Strength"],
        subFocusByGoal: {
          "Build Strength": ["Squat"],
          "Improve Endurance": ["Zone 2 / Long steady"],
        },
        preferredZone2Cardio: ["treadmill"],
      },
      { goal_weights: [1, 0, 0] },
      1
    );
    expect(input.primary_goal).toBe("strength");
    expect(input.secondary_goals ?? []).not.toContain("endurance");
    expect(input.goal_sub_focus?.endurance).toBeUndefined();
    expect(input.goal_sub_focus?.conditioning).toBeUndefined();
    expect(input.goal_sub_focus?.strength).toContain("squat");
  });

  it("endurance-only day keeps Zone 2 sub-focus", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...BASE,
        primaryFocus: ["Improve Endurance"],
        subFocusByGoal: {
          "Build Strength": ["Squat"],
          "Improve Endurance": ["Zone 2 / Long steady"],
        },
        preferredZone2Cardio: ["treadmill"],
      },
      { goal_weights: [1, 0, 0] },
      1
    );
    expect(input.primary_goal).toBe("endurance");
    expect(input.goal_sub_focus?.endurance).toContain("zone2_long_steady");
    expect(input.goal_sub_focus?.strength).toBeUndefined();
  });

  it("blend day with weekSubFocusPrimaryLabels keeps both goals' sub-focuses", () => {
    const input = manualPreferencesToGenerateWorkoutInput(
      {
        ...BASE,
        primaryFocus: ["Build Strength", "Improve Endurance"],
        weekSubFocusPrimaryLabels: ["Build Strength", "Improve Endurance"],
        subFocusByGoal: {
          "Build Strength": ["Squat"],
          "Improve Endurance": ["Zone 2 / Long steady"],
        },
      },
      undefined,
      1
    );
    expect(input.goal_sub_focus?.strength).toContain("squat");
    expect(input.goal_sub_focus?.endurance).toContain("zone2_long_steady");
  });
});
