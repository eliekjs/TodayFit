import { describe, expect, it } from "vitest";
import {
  ensureRegionalStrengthOverlay,
  exerciseIsLowerBodyDominantPowerMovement,
  filterSubFocusSlugsForBodyFocus,
  isCoreOnlyFocusBodyParts,
  isLowerOnlyFocusBodyParts,
  regionalStrengthOverlayForFocus,
} from "./bodyFocusSubFocusFilter";
import type { Exercise } from "./types";

describe("filterSubFocusSlugsForBodyFocus", () => {
  it("prefers upper_body_power and drops lower plyo subs on upper-only focus", () => {
    const slugs = ["lower_body_power_plyos", "upper_body_power", "olympic_triple_extension"];
    const filtered = filterSubFocusSlugsForBodyFocus(slugs, ["upper_push", "upper_pull"]);
    expect(filtered).toEqual(["upper_body_power"]);
  });

  it("drops upper_body_power on lower-only focus", () => {
    const slugs = ["lower_body_power_plyos", "upper_body_power"];
    const filtered = filterSubFocusSlugsForBodyFocus(slugs, ["lower"]);
    expect(filtered).toEqual(["lower_body_power_plyos"]);
  });

  it("leaves slugs unchanged for full body", () => {
    const slugs = ["lower_body_power_plyos", "upper_body_power"];
    expect(filterSubFocusSlugsForBodyFocus(slugs, ["full_body"])).toEqual(slugs);
  });

  it("drops opposing hypertrophy slugs on every muscle day", () => {
    expect(filterSubFocusSlugsForBodyFocus(["chest", "legs", "back"], ["upper_push", "chest"])).toEqual([
      "chest",
    ]);
    expect(filterSubFocusSlugsForBodyFocus(["back", "chest", "legs"], ["upper_pull", "back"])).toEqual([
      "back",
    ]);
    expect(
      filterSubFocusSlugsForBodyFocus(["shoulders", "chest", "legs"], ["upper_push", "upper_pull", "shoulders"])
    ).toEqual(["shoulders"]);
    expect(
      filterSubFocusSlugsForBodyFocus(["arms", "chest", "back"], ["upper_push", "upper_pull", "arms"])
    ).toEqual(["arms"]);
    expect(filterSubFocusSlugsForBodyFocus(["glutes", "legs", "chest"], ["lower", "posterior", "glutes"])).toEqual(
      ["glutes"]
    );
    expect(filterSubFocusSlugsForBodyFocus(["legs", "glutes", "chest"], ["lower", "legs"])).toEqual([
      "legs",
      "glutes",
    ]);
  });

  it("drops back on Pattern Push and chest on Pattern Pull", () => {
    expect(filterSubFocusSlugsForBodyFocus(["chest", "shoulders", "back", "legs"], ["upper_push"])).toEqual([
      "chest",
      "shoulders",
    ]);
    expect(filterSubFocusSlugsForBodyFocus(["back", "chest", "shoulders", "legs"], ["upper_pull"])).toEqual([
      "back",
    ]);
  });

  it("keeps both muscles on a combined glutes + shoulders day", () => {
    expect(
      filterSubFocusSlugsForBodyFocus(
        ["glutes", "shoulders", "chest", "back"],
        ["lower", "posterior", "glutes", "upper_push", "upper_pull", "shoulders"]
      )
    ).toEqual(["glutes", "shoulders"]);
  });

  it("drops lower hypertrophy slugs on Region Upper", () => {
    expect(filterSubFocusSlugsForBodyFocus(["chest", "back", "legs", "glutes"], ["upper_push", "upper_pull"])).toEqual(
      ["chest", "back"]
    );
  });

  it("drops overhead press on a lower strength day and keeps squat", () => {
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press", "squat"], ["lower"])).toEqual(["squat"]);
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press"], ["lower"])).toEqual([]);
  });

  it("keeps overhead press on Region Upper, Pattern Push, and Muscle Shoulders", () => {
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_push", "upper_pull"])).toEqual([
      "overhead_press",
    ]);
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_push"])).toEqual(["overhead_press"]);
    expect(
      filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_push", "upper_pull", "shoulders"])
    ).toEqual(["overhead_press"]);
  });

  it("drops overhead press on Pull, Chest, and Arms days", () => {
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_pull"])).toEqual([]);
    expect(filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_push", "chest"])).toEqual([]);
    expect(
      filterSubFocusSlugsForBodyFocus(["overhead_press"], ["upper_push", "upper_pull", "arms"])
    ).toEqual([]);
  });

  it("keeps bench on Chest/Push and pull on Pull/Back", () => {
    expect(filterSubFocusSlugsForBodyFocus(["bench_press"], ["upper_push", "chest"])).toEqual([
      "bench_press",
    ]);
    expect(filterSubFocusSlugsForBodyFocus(["bench_press"], ["upper_pull"])).toEqual([]);
    expect(filterSubFocusSlugsForBodyFocus(["pull"], ["upper_pull", "back"])).toEqual(["pull"]);
    expect(filterSubFocusSlugsForBodyFocus(["pull"], ["upper_push"])).toEqual([]);
  });
});

describe("ensureRegionalStrengthOverlay", () => {
  it("uses lower overlay for a lower-only region day", () => {
    expect(regionalStrengthOverlayForFocus(["lower"])).toBe("lower");
    expect(regionalStrengthOverlayForFocus(["upper_push", "upper_pull"])).toBe("upper");
    expect(regionalStrengthOverlayForFocus(["upper_push", "chest"])).toBeNull();
    expect(regionalStrengthOverlayForFocus(["full_body"])).toBeNull();
  });

  it("attaches lower overlay when strength has no lift sub-goal", () => {
    const next = ensureRegionalStrengthOverlay({}, {}, ["lower"], "strength");
    expect(next.goal_sub_focus.strength).toEqual(["lower"]);
    expect(next.goal_sub_focus_weights.strength).toEqual([1]);
  });

  it("does not replace a selected squat sub-goal", () => {
    const next = ensureRegionalStrengthOverlay(
      { strength: ["squat"] },
      { strength: [1] },
      ["lower"],
      "strength"
    );
    expect(next.goal_sub_focus.strength).toEqual(["squat"]);
  });
});

describe("isLowerOnlyFocusBodyParts", () => {
  it("detects lower-only sessions", () => {
    expect(isLowerOnlyFocusBodyParts(["lower"])).toBe(true);
    expect(isLowerOnlyFocusBodyParts(["upper_push"])).toBe(false);
  });
});

describe("isCoreOnlyFocusBodyParts", () => {
  it("detects core-only sessions", () => {
    expect(isCoreOnlyFocusBodyParts(["core"])).toBe(true);
  });

  it("is false for full_body, other single regions, and mixed focus", () => {
    expect(isCoreOnlyFocusBodyParts(["full_body"])).toBe(false);
    expect(isCoreOnlyFocusBodyParts(["lower"])).toBe(false);
    expect(isCoreOnlyFocusBodyParts(["core", "lower"])).toBe(false);
    expect(isCoreOnlyFocusBodyParts(undefined)).toBe(false);
    expect(isCoreOnlyFocusBodyParts([])).toBe(false);
  });
});

describe("exerciseIsLowerBodyDominantPowerMovement", () => {
  it("flags hinge-dominant power exercises", () => {
    const ex: Exercise = {
      id: "cable_pull_throughs",
      name: "Cable Pull Throughs",
      movement_pattern: "hinge",
      muscle_groups: ["glutes", "hamstrings"],
      modality: "power",
      equipment_required: ["cable"],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["power"] },
    };
    expect(exerciseIsLowerBodyDominantPowerMovement(ex)).toBe(true);
  });

  it("does not flag med-ball push pattern as lower-dominant", () => {
    const ex: Exercise = {
      id: "med_ball_slam",
      name: "Med Ball Slam",
      movement_pattern: "push",
      muscle_groups: ["shoulders", "core"],
      modality: "power",
      equipment_required: ["medicine_ball"],
      difficulty: 2,
      time_cost: "medium",
      tags: { goal_tags: ["power"], stimulus: ["plyometric"] },
    };
    expect(exerciseIsLowerBodyDominantPowerMovement(ex)).toBe(false);
  });
});
